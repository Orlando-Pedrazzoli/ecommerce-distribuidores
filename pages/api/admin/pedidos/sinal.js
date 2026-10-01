// pages/api/admin/pedidos/sinal.js - CONFERIR O SINAL DE UM PEDIDO (ADMIN)
// ===================================
// PATCH { pedidoId, acao: 'confirmar' | 'rejeitar', motivo? }
//   confirmar -> sinal conferido (o fornecedor viu o crédito)
//   rejeitar  -> o distribuidor é avisado e pode enviar novo comprovante

import mongoose from 'mongoose';
import dbConnect from '../../../../lib/mongodb';
import Pedido from '../../../../models/Pedido';
import Fornecedor from '../../../../models/Fornecedor';
import User from '../../../../models/User';
import { requireAdmin } from '../../../../lib/auth';
import { enviarSinalConfirmado, enviarSinalRejeitado } from '../../../../lib/pagamentoEmails';

async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { pedidoId, acao } = req.body || {};
    const motivo = String(req.body?.motivo || '').trim().slice(0, 300);

    if (!mongoose.Types.ObjectId.isValid(String(pedidoId || ''))) {
      return res.status(400).json({ message: 'Pedido inválido' });
    }
    if (!['confirmar', 'rejeitar'].includes(acao)) {
      return res.status(400).json({ message: 'Ação inválida' });
    }
    if (acao === 'rejeitar' && !motivo) {
      return res.status(400).json({ message: 'Informe o motivo da rejeição' });
    }

    await dbConnect();

    const novoStatus = acao === 'confirmar' ? 'confirmado' : 'rejeitado';
    const pedido = await Pedido.findOneAndUpdate(
      {
        _id: pedidoId,
        'sinal.status': { $in: ['em_analise', 'confirmado', 'rejeitado'], $ne: novoStatus },
      },
      {
        $set: {
          'sinal.status': novoStatus,
          'sinal.conferidoEm': new Date(),
          'sinal.conferidoPor': req.user.usuario,
          'sinal.motivoRejeicao': acao === 'rejeitar' ? motivo : '',
        },
      },
      { new: true },
    );

    if (!pedido) {
      return res.status(409).json({
        message: 'Este pedido não tem sinal para conferir ou já está nesse estado.',
      });
    }

    console.log(`🧾 Sinal do pedido ${pedido._id} ${novoStatus} por ${req.user.usuario}`);

    const [fornecedor, distribuidor] = await Promise.all([
      Fornecedor.findById(pedido.fornecedorId).select('nome'),
      User.findOne({ usuario: pedido.userId }).select('nome email'),
    ]);
    if (distribuidor) {
      const enviar = acao === 'confirmar' ? enviarSinalConfirmado : enviarSinalRejeitado;
      await enviar({ pedido, fornecedor, distribuidor });
    }

    return res.status(200).json({
      success: true,
      message:
        acao === 'confirmar'
          ? 'Sinal confirmado'
          : 'Sinal rejeitado. O distribuidor foi avisado para enviar novo comprovante.',
      sinal: pedido.sinal,
    });
  } catch (error) {
    console.error('❌ Erro ao conferir sinal:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

export default requireAdmin(handler);
