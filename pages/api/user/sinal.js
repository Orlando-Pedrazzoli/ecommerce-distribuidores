// pages/api/user/sinal.js - PAGAR O SINAL DEPOIS DO PEDIDO / NOVO COMPROVANTE
// ===================================
// Usado em "Meus Pedidos" quando o sinal está:
// - 'pendente'  -> o pedido foi enviado sem comprovante; o distribuidor paga
//                  agora e envia o comprovante pela primeira vez
// - 'rejeitado' -> o admin rejeitou o comprovante; o distribuidor paga de
//                  novo e envia outro comprovante sem refazer o pedido
// GET  ?pedidoId=...                        -> Pix Copia e Cola + QR do sinal
// POST { pedidoId, comprovanteId, txid? }   -> grava o comprovante e põe o
//                                              sinal "em conferência"
// O txid só é gravado no pedido quando o comprovante chega (POST): no sinal
// pendente o GET gera um identificador novo e o navegador devolve-o no POST.

import mongoose from 'mongoose';
import dbConnect from '../../../lib/mongodb';
import Pedido from '../../../models/Pedido';
import Fornecedor from '../../../models/Fornecedor';
import { requireDistribuidor } from '../../../lib/auth';
import { montarCobrancaPix, pixConfigurado, txidValido } from '../../../lib/pix';
import { STATUS_SINAL_PAGAVEL } from '../../../lib/financeiro';
import {
  vincularComprovante,
  referenciarComprovante,
  libertarComprovante,
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

    const statusAtual = pedido.sinal?.status;
    if (!STATUS_SINAL_PAGAVEL.includes(statusAtual) || !(pedido.sinal?.valor > 0)) {
      return res.status(409).json({
        message: 'Este pedido não tem sinal a pagar neste momento',
      });
    }
    const primeiroComprovante = statusAtual === 'pendente';

    const fornecedor = await Fornecedor.findById(pedido.fornecedorId);
    if (!fornecedor || !pixConfigurado(fornecedor.pix)) {
      return res.status(409).json({
        message: 'O fornecedor está sem chave Pix configurada. Fale com o administrador.',
      });
    }

    // ── GET: dados para pagar ──
    if (req.method === 'GET') {
      const pix = await montarCobrancaPix({
        pix: fornecedor.pix,
        valor: pedido.sinal.valor,
        // sinal rejeitado mantém o identificador do pedido; pendente ganha um novo
        txid: pedido.sinal.txid,
        prefixo: 'SN',
      });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ success: true, pix, fornecedor: fornecedor.nome });
    }

    // ── POST: comprovante ──
    // Identificador do Pix: o já gravado (rejeitado) ou o que o GET gerou (pendente)
    let txid = pedido.sinal.txid;
    if (!txidValido(txid)) {
      txid = String(req.body?.txid || '');
      if (!txidValido(txid)) {
        return res.status(400).json({
          message: 'Identificador do Pix inválido. Gere o Pix de novo e anexe o comprovante.',
        });
      }
      const usado = await Pedido.exists({ 'sinal.txid': txid, _id: { $ne: pedido._id } });
      if (usado) {
        return res.status(409).json({
          message: 'Este código Pix já foi usado noutro pedido. Gere o Pix de novo.',
        });
      }
    }

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
    try {
      await Pedido.updateOne(
        { _id: pedido._id, 'sinal.status': statusAtual },
        {
          $set: {
            'sinal.status': 'em_analise',
            'sinal.txid': txid,
            'sinal.chavePix': fornecedor.pix.chave,
            'sinal.comprovanteId': comprovante._id,
            'sinal.enviadoEm': new Date(),
            'sinal.motivoRejeicao': '',
          },
          $unset: { 'sinal.conferidoEm': 1, 'sinal.conferidoPor': 1 },
          ...(anterior ? { $push: { 'sinal.comprovantesAnteriores': anterior } } : {}),
        },
      );
    } catch (error) {
      await libertarComprovante(comprovante._id).catch(() => {});
      if (error.code === 11000) {
        return res.status(409).json({
          message: 'Este código Pix já foi usado noutro pedido. Gere o Pix de novo.',
        });
      }
      throw error;
    }
    await referenciarComprovante(comprovante._id, 'Pedido', pedido._id);

    pedido.sinal.status = 'em_analise';
    pedido.sinal.txid = txid;
    await enviarSinalReenviado({
      pedido,
      fornecedor,
      distribuidor: req.user,
      primeiro: primeiroComprovante,
      anexos: await anexoDoComprovante(
        comprovante._id,
        `comprovante-sinal-${String(pedido._id).slice(-8).toUpperCase()}`,
      ),
    });

    return res.status(200).json({
      success: true,
      message: primeiroComprovante
        ? 'Comprovante enviado. O sinal ficou em conferência.'
        : 'Novo comprovante enviado. O sinal voltou a ficar em conferência.',
    });
  } catch (error) {
    console.error('❌ Erro no pagamento do sinal:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

export default requireDistribuidor(handler);
