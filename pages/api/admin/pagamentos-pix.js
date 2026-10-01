// pages/api/admin/pagamentos-pix.js - CONFERÊNCIA DOS PIX DE ROYALTIES (ADMIN)
// ===================================
// GET   ?status=em_analise|confirmado|rejeitado|todos -> lista + contagens
// PATCH { id, acao: 'confirmar' | 'rejeitar', motivo? }
//   confirmar -> o pagamento fica definitivo
//   rejeitar  -> desfaz a baixa (a dívida volta aos pedidos) e avisa o distribuidor

import mongoose from 'mongoose';
import dbConnect from '../../../lib/mongodb';
import Pagamento from '../../../models/Pagamento';
import User from '../../../models/User';
import { requireAdmin } from '../../../lib/auth';
import { reverterPagamento } from '../../../lib/pagamentos';
import { enviarPagamentoConfirmado, enviarPagamentoRejeitado } from '../../../lib/pagamentoEmails';

const STATUS = ['em_analise', 'confirmado', 'rejeitado'];

async function handler(req, res) {
  await dbConnect();

  // ── GET ──
  if (req.method === 'GET') {
    try {
      const status = String(req.query.status || 'todos');
      const filtro = STATUS.includes(status) ? { status } : {};

      const [pagamentos, porStatus] = await Promise.all([
        Pagamento.find(filtro).sort({ createdAt: -1 }).limit(200).lean(),
        Pagamento.aggregate([
          { $group: { _id: '$status', total: { $sum: 1 }, valor: { $sum: '$valor' } } },
        ]),
      ]);

      const resumo = { em_analise: { total: 0, valor: 0 }, confirmado: { total: 0, valor: 0 }, rejeitado: { total: 0, valor: 0 } };
      porStatus.forEach(s => {
        if (resumo[s._id]) resumo[s._id] = { total: s.total, valor: s.valor };
      });

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        success: true,
        resumo,
        pagamentos: pagamentos.map(p => ({
          ...p,
          alocacoes: (p.alocacoes || []).map(a => ({
            ...a,
            numero: String(a.pedidoId).slice(-8).toUpperCase(),
          })),
        })),
      });
    } catch (error) {
      console.error('❌ Erro ao listar pagamentos Pix:', error);
      return res.status(500).json({ message: 'Erro ao listar pagamentos' });
    }
  }

  // ── PATCH ──
  if (req.method === 'PATCH') {
    try {
      const { id, acao } = req.body || {};
      const motivo = String(req.body?.motivo || '').trim().slice(0, 300);

      if (!mongoose.Types.ObjectId.isValid(String(id || ''))) {
        return res.status(400).json({ message: 'Pagamento inválido' });
      }
      if (!['confirmar', 'rejeitar'].includes(acao)) {
        return res.status(400).json({ message: 'Ação inválida' });
      }
      if (acao === 'rejeitar' && !motivo) {
        return res.status(400).json({ message: 'Informe o motivo da rejeição' });
      }

      // Só muda quem ainda não está no estado final pedido (evita reverter duas vezes)
      const novoStatus = acao === 'confirmar' ? 'confirmado' : 'rejeitado';
      const pagamento = await Pagamento.findOneAndUpdate(
        {
          _id: id,
          status: acao === 'confirmar' ? 'em_analise' : { $in: ['em_analise', 'confirmado'] },
        },
        {
          $set: {
            status: novoStatus,
            conferidoEm: new Date(),
            conferidoPor: req.user.usuario,
            motivoRejeicao: acao === 'rejeitar' ? motivo : '',
          },
        },
        { new: true },
      );

      if (!pagamento) {
        return res.status(409).json({
          message: 'Este pagamento já foi conferido. Atualize a página.',
        });
      }

      if (acao === 'rejeitar') await reverterPagamento(pagamento);

      console.log(
        `🧾 Pix de royalties ${pagamento._id} (${pagamento.userId}, ${pagamento.valor}) ` +
          `${novoStatus} por ${req.user.usuario}`,
      );

      const distribuidor = await User.findOne({ usuario: pagamento.userId }).select('nome email');
      if (distribuidor) {
        const enviar = acao === 'confirmar' ? enviarPagamentoConfirmado : enviarPagamentoRejeitado;
        await enviar({ pagamento, distribuidor });
      }

      return res.status(200).json({
        success: true,
        message:
          acao === 'confirmar'
            ? 'Pagamento confirmado'
            : 'Pagamento rejeitado. A baixa foi desfeita e o distribuidor foi avisado.',
        pagamento,
      });
    } catch (error) {
      console.error('❌ Erro ao conferir pagamento Pix:', error);
      return res.status(500).json({ message: 'Erro ao conferir o pagamento' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default requireAdmin(handler);
