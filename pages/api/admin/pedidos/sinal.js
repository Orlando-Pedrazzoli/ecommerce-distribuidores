// pages/api/admin/pedidos/sinal.js - CONFERIR UM PAGAMENTO DO SINAL (ADMIN)
// ===================================
// PATCH { pedidoId, pagamentoId, acao: 'confirmar' | 'rejeitar', motivo? }
//   O sinal pode ter vários pagamentos (parciais); cada um é conferido à parte.
//   confirmar -> o fornecedor viu o crédito desse Pix no extrato
//   rejeitar  -> o valor volta ao em aberto; o distribuidor é avisado e paga
//                de novo em "Meus Pedidos"
//   pagamentoId 'legado' = o Pix único de pedidos anteriores aos parciais

import mongoose from 'mongoose';
import dbConnect from '../../../../lib/mongodb';
import Fornecedor from '../../../../models/Fornecedor';
import User from '../../../../models/User';
import { requireAdmin } from '../../../../lib/auth';
import { conferirPagamentoSinal, idPagamentoValido, ErroSinal } from '../../../../lib/sinal';
import { resumoSinal } from '../../../../lib/financeiro';
import { enviarSinalConfirmado, enviarSinalRejeitado } from '../../../../lib/pagamentoEmails';

async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { pedidoId, pagamentoId, acao } = req.body || {};
    const motivo = String(req.body?.motivo || '').trim().slice(0, 300);

    if (!mongoose.Types.ObjectId.isValid(String(pedidoId || ''))) {
      return res.status(400).json({ message: 'Pedido inválido' });
    }
    if (!idPagamentoValido(pagamentoId)) {
      return res.status(400).json({ message: 'Pagamento inválido' });
    }
    if (!['confirmar', 'rejeitar'].includes(acao)) {
      return res.status(400).json({ message: 'Ação inválida' });
    }
    if (acao === 'rejeitar' && !motivo) {
      return res.status(400).json({ message: 'Informe o motivo da rejeição' });
    }

    await dbConnect();

    let resultado;
    try {
      resultado = await conferirPagamentoSinal({
        pedidoId,
        pagamentoId,
        acao,
        motivo,
        admin: req.user.usuario,
      });
    } catch (error) {
      if (error instanceof ErroSinal) return res.status(error.status).json({ message: error.message });
      throw error;
    }
    const { pedido, pagamento } = resultado;
    const resumo = resumoSinal(pedido);

    console.log(
      `🧾 Sinal do pedido ${pedido._id}: pagamento ${pagamento.valor} ${pagamento.status} ` +
        `por ${req.user.usuario} (sinal ${resumo.status}, em aberto ${resumo.emAberto})`,
    );

    const [fornecedor, distribuidor] = await Promise.all([
      Fornecedor.findById(pedido.fornecedorId).select('nome'),
      User.findOne({ usuario: pedido.userId }).select('nome email'),
    ]);
    if (distribuidor) {
      const enviar = acao === 'confirmar' ? enviarSinalConfirmado : enviarSinalRejeitado;
      await enviar({ pedido, pagamento, fornecedor, distribuidor });
    }

    return res.status(200).json({
      success: true,
      message:
        acao === 'confirmar'
          ? resumo.emAberto > 0
            ? `Pagamento confirmado. Falta R$ ${resumo.emAberto.toFixed(2)} do sinal.`
            : 'Pagamento confirmado. Sinal completo.'
          : 'Pagamento rejeitado. O distribuidor foi avisado para pagar de novo.',
      sinal: pedido.sinal,
      resumo,
    });
  } catch (error) {
    console.error('❌ Erro ao conferir sinal:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

export default requireAdmin(handler);
