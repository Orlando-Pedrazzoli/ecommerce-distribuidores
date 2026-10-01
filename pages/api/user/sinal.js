// pages/api/user/sinal.js - SINAL REJEITADO: NOVO PIX / NOVO COMPROVANTE
// ===================================
// Quando o admin rejeita o sinal de um pedido, o distribuidor pode pagar de
// novo e enviar outro comprovante sem refazer o pedido.
// GET  ?pedidoId=...                 -> Pix Copia e Cola + QR do sinal desse pedido
// POST { pedidoId, comprovanteId }   -> troca o comprovante e volta a "em conferência"

import mongoose from 'mongoose';
import dbConnect from '../../../lib/mongodb';
import Pedido from '../../../models/Pedido';
import Fornecedor from '../../../models/Fornecedor';
import { requireDistribuidor } from '../../../lib/auth';
import { montarCobrancaPix, pixConfigurado } from '../../../lib/pix';
import {
  vincularComprovante,
  referenciarComprovante,
  anexoDoComprovante,
} from '../../../lib/comprovantes';
import { enviarSinalReenviado } from '../../../lib/pagamentoEmails';

async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const pedidoId = String((req.method === 'GET' ? req.query.pedidoId : req.body?.pedidoId) || '');
  if (!mongoose.Types.ObjectId.isValid(pedidoId)) {
    return res.status(400).json({ message: 'Pedido inválido' });
  }

  try {
    await dbConnect();

    const pedido = await Pedido.findOne({ _id: pedidoId, userId: req.user.usuario });
    if (!pedido) return res.status(404).json({ message: 'Pedido não encontrado' });

    if (pedido.sinal?.status !== 'rejeitado') {
      return res.status(409).json({
        message: 'Só é possível enviar novo comprovante quando o sinal foi rejeitado',
      });
    }

    const fornecedor = await Fornecedor.findById(pedido.fornecedorId);

    // ── GET: dados para pagar de novo ──
    if (req.method === 'GET') {
      if (!fornecedor || !pixConfigurado(fornecedor.pix)) {
        return res.status(409).json({
          message: 'O fornecedor está sem chave Pix configurada. Fale com o administrador.',
        });
      }
      const pix = await montarCobrancaPix({
        pix: fornecedor.pix,
        valor: pedido.sinal.valor,
        txid: pedido.sinal.txid,
        prefixo: 'SN',
      });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ success: true, pix, fornecedor: fornecedor.nome });
    }

    // ── POST: novo comprovante ──
    const comprovante = await vincularComprovante({
      comprovanteId: req.body?.comprovanteId,
      usuario: req.user.usuario,
      finalidade: 'sinal',
    });
    if (!comprovante) {
      return res.status(409).json({
        message: 'Comprovante não encontrado ou já usado. Anexe o comprovante deste Pix.',
      });
    }

    const anterior = pedido.sinal.comprovanteId;
    await Pedido.updateOne(
      { _id: pedido._id },
      {
        $set: {
          'sinal.status': 'em_analise',
          'sinal.comprovanteId': comprovante._id,
          'sinal.enviadoEm': new Date(),
          'sinal.motivoRejeicao': '',
        },
        $unset: { 'sinal.conferidoEm': 1, 'sinal.conferidoPor': 1 },
        ...(anterior ? { $push: { 'sinal.comprovantesAnteriores': anterior } } : {}),
      },
    );
    await referenciarComprovante(comprovante._id, 'Pedido', pedido._id);

    pedido.sinal.status = 'em_analise';
    await enviarSinalReenviado({
      pedido,
      fornecedor,
      distribuidor: req.user,
      anexos: await anexoDoComprovante(
        comprovante._id,
        `comprovante-sinal-${String(pedido._id).slice(-8).toUpperCase()}`,
      ),
    });

    return res.status(200).json({
      success: true,
      message: 'Novo comprovante enviado. O sinal voltou a ficar em conferência.',
    });
  } catch (error) {
    console.error('❌ Erro no reenvio do sinal:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

export default requireDistribuidor(handler);
