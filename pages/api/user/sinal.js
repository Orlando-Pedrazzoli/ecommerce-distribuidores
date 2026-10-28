// pages/api/user/sinal.js - PAGAR O SINAL DEPOIS DO PEDIDO (INTEGRAL OU EM PARTES)
// ===================================
// Usado em "Meus Pedidos" enquanto o sinal tiver valor em aberto: o
// distribuidor escolhe quanto paga (tudo o que falta ou uma parte), paga por
// Pix e anexa o comprovante. Cada pagamento fica "em conferência" até o
// admin confirmar; se for rejeitado, o valor volta ao em aberto e ele paga de
// novo por aqui.
// GET  ?pedidoId=...&valor=...                 -> Pix Copia e Cola + QR Code
// POST { pedidoId, txid, valor, comprovanteId } -> regista o pagamento

import mongoose from 'mongoose';
import dbConnect from '../../../lib/mongodb';
import Pedido from '../../../models/Pedido';
import Fornecedor from '../../../models/Fornecedor';
import { requireDistribuidor } from '../../../lib/auth';
import { montarCobrancaPix, pixConfigurado, txidValido } from '../../../lib/pix';
import { arred, resumoSinal, sinalEmAberto } from '../../../lib/financeiro';
import { registrarPagamentoSinal, ErroSinal } from '../../../lib/sinal';
import {
  vincularComprovante,
  referenciarComprovante,
  libertarComprovante,
  anexoDoComprovante,
} from '../../../lib/comprovantes';
import { enviarSinalDeclarado } from '../../../lib/pagamentoEmails';

async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const corpo = req.method === 'GET' ? req.query : req.body || {};
  const pedidoId = String(corpo.pedidoId || '');
  if (!mongoose.Types.ObjectId.isValid(pedidoId)) {
    return res.status(400).json({ message: 'Pedido inválido' });
  }

  try {
    await dbConnect();

    const pedido = await Pedido.findOne({ _id: pedidoId, userId: req.user.usuario });
    if (!pedido) return res.status(404).json({ message: 'Pedido não encontrado' });

    const emAberto = sinalEmAberto(pedido);
    if (!(pedido.sinal?.valor > 0) || emAberto < 0.01) {
      return res.status(409).json({ message: 'Este pedido não tem sinal em aberto' });
    }

    const fornecedor = await Fornecedor.findById(pedido.fornecedorId);
    if (!fornecedor || !pixConfigurado(fornecedor.pix)) {
      return res.status(409).json({
        message: 'O fornecedor está sem chave Pix configurada. Fale com o administrador.',
      });
    }

    // Valor deste pagamento: tudo o que falta ou uma parte
    const valor = corpo.valor === undefined || corpo.valor === '' ? emAberto : arred(corpo.valor);
    if (!(valor >= 0.01)) {
      return res.status(400).json({ message: 'Informe o valor que deseja pagar' });
    }
    if (valor > emAberto + 0.004) {
      return res.status(400).json({
        message: `O valor é maior do que o sinal em aberto (R$ ${emAberto.toFixed(2)})`,
        emAberto,
      });
    }

    // ── GET: Pix para pagar ──
    if (req.method === 'GET') {
      const pix = await montarCobrancaPix({ pix: fornecedor.pix, valor, prefixo: 'SN' });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ success: true, pix, emAberto, fornecedor: fornecedor.nome });
    }

    // ── POST: registar o pagamento com o comprovante ──
    const txid = String(corpo.txid || '');
    if (!txidValido(txid)) {
      return res.status(400).json({ message: 'Gere o Pix antes de registrar o pagamento' });
    }

    // Mesmo Pix enviado duas vezes: devolve o que já existe
    const repetido = (pedido.sinal.pagamentos || []).find(p => p.txid === txid);
    if (repetido) {
      return res.status(200).json({
        success: true,
        duplicado: true,
        message: 'Pagamento já registrado',
        sinal: resumoSinal(pedido),
      });
    }
    if (await Pedido.exists({ _id: { $ne: pedido._id }, 'sinal.pagamentos.txid': txid })) {
      return res.status(409).json({ message: 'Este código Pix já foi usado. Gere o Pix de novo.' });
    }

    const comprovante = await vincularComprovante({
      comprovanteId: corpo.comprovanteId,
      usuario: req.user.usuario,
      finalidade: 'sinal',
    });
    if (!comprovante) {
      return res.status(409).json({
        message: 'Comprovante não encontrado ou já usado. Anexe o comprovante deste Pix.',
      });
    }

    let pagamento;
    try {
      ({ pagamento } = await registrarPagamentoSinal({
        pedido,
        valor,
        txid,
        chavePix: fornecedor.pix.chave,
        comprovanteId: comprovante._id,
      }));
    } catch (error) {
      await libertarComprovante(comprovante._id).catch(() => {});
      if (error instanceof ErroSinal) return res.status(error.status).json({ message: error.message });
      if (error.code === 11000) {
        return res.status(409).json({ message: 'Este código Pix já foi usado. Gere o Pix de novo.' });
      }
      throw error;
    }
    await referenciarComprovante(comprovante._id, 'Pedido', pedido._id);

    const resumo = resumoSinal(pedido);
    console.log(
      `🧾 Sinal do pedido ${pedido._id}: ${req.user.usuario} pagou ${pagamento.valor} ` +
        `(em aberto ${resumo.emAberto})`,
    );

    await enviarSinalDeclarado({
      pedido,
      pagamento,
      fornecedor,
      distribuidor: req.user,
      anexos: await anexoDoComprovante(
        comprovante._id,
        `comprovante-sinal-${String(pedido._id).slice(-8).toUpperCase()}-${txid}`,
      ),
    });

    return res.status(201).json({
      success: true,
      message:
        resumo.emAberto > 0
          ? `Pagamento de R$ ${pagamento.valor.toFixed(2)} registrado. Falta R$ ${resumo.emAberto.toFixed(2)} do sinal.`
          : 'Pagamento registrado. O sinal ficou completo, à espera da conferência.',
      sinal: resumo,
    });
  } catch (error) {
    console.error('❌ Erro no pagamento do sinal:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

export default requireDistribuidor(handler);
