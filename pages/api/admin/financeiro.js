// PAGES/API/ADMIN/FINANCEIRO.JS - CONTROLE DOS ROYALTIES (ADMIN)
// ===================================
// GET   ?periodo=7dias|30dias|90dias|todos -> pedidos + estatísticas de royalties
// PUT   { pedidoId, status, observacao? }   -> marca os royalties de um pedido
// PATCH { pedidoIds, status }               -> marca vários pedidos de uma vez
// "Pendente" é o que falta pagar, já com as baixas parciais feitas por Pix
// pelos distribuidores (controleFinanceiro.royalties.valorPago).

import dbConnect from '../../../lib/mongodb';
import Pedido from '../../../models/Pedido';
import { requireAdmin } from '../../../lib/auth';
import { arred, royaltiesEmAberto } from '../../../lib/financeiro';

const STATUS_VALIDOS = ['pendente', 'pago'];

// O único pagamento controlado são os royalties (o campo `tipo` é aceito por
// compatibilidade com chamadas antigas, mas só pode ser 'royalties')
const tipoInvalido = tipo => tipo !== undefined && tipo !== 'royalties';

async function handler(req, res) {
  // Autenticação admin garantida por requireAdmin

  await dbConnect();

  // ══════════════════════════════════════════════════════════════
  // GET - Buscar resumo financeiro
  // ══════════════════════════════════════════════════════════════
  if (req.method === 'GET') {
    try {
      const { periodo } = req.query;

      const filtro = {};

      // Filtrar por período
      const dias = { '7dias': 7, '30dias': 30, '90dias': 90 }[periodo];
      if (dias) {
        filtro.createdAt = { $gte: new Date(Date.now() - dias * 24 * 60 * 60 * 1000) };
      }

      const pedidos = await Pedido.find(filtro)
        .populate('fornecedorId', 'nome codigo')
        .sort({ createdAt: -1 });

      const pendente = arred(pedidos.reduce((acc, p) => acc + royaltiesEmAberto(p), 0));
      const pago = arred(
        pedidos.reduce(
          (acc, p) => acc + Math.max(0, (p.royalties || 0) - royaltiesEmAberto(p)),
          0,
        ),
      );

      const stats = {
        totalPedidos: pedidos.length,
        totalGeral: pedidos.reduce((acc, p) => acc + (p.total || 0), 0),
        royalties: {
          total: arred(pedidos.reduce((acc, p) => acc + (p.royalties || 0), 0)),
          pendente,
          pago,
          qtdPendente: pedidos.filter(p => royaltiesEmAberto(p) > 0).length,
          qtdPago: pedidos.filter(p => royaltiesEmAberto(p) <= 0).length,
        },
        totalAReceber: pendente,
        totalRecebido: pago,
      };

      return res.status(200).json({
        success: true,
        pedidos,
        stats,
      });
    } catch (error) {
      console.error('Erro ao buscar financeiro:', error);
      return res.status(500).json({ message: 'Erro interno' });
    }
  }

  // ══════════════════════════════════════════════════════════════
  // PUT - Marcar os royalties de um pedido como pagos / pendentes
  // ══════════════════════════════════════════════════════════════
  if (req.method === 'PUT') {
    try {
      const { pedidoId, tipo, status, observacao } = req.body || {};

      if (!pedidoId || !status) {
        return res.status(400).json({ message: 'Dados obrigatórios: pedidoId, status' });
      }
      if (tipoInvalido(tipo)) {
        return res.status(400).json({ message: 'Tipo inválido. Use: royalties' });
      }
      if (!STATUS_VALIDOS.includes(status)) {
        return res.status(400).json({ message: 'Status inválido. Use: pendente ou pago' });
      }

      // Só muda status/data/observação: o valorPago dos Pix nunca é apagado
      const pedido = await Pedido.findByIdAndUpdate(
        pedidoId,
        {
          $set: {
            'controleFinanceiro.royalties.status': status,
            'controleFinanceiro.royalties.dataPagamento': status === 'pago' ? new Date() : null,
            ...(observacao ? { 'controleFinanceiro.royalties.observacao': observacao } : {}),
          },
        },
        { new: true },
      );
      if (!pedido) {
        return res.status(404).json({ message: 'Pedido não encontrado' });
      }

      console.log(`✅ Royalties do pedido ${pedidoId} marcados como: ${status}`);

      return res.status(200).json({
        success: true,
        message: `Royalties marcados como ${status}`,
        pedido: {
          _id: pedido._id,
          controleFinanceiro: pedido.controleFinanceiro,
        },
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      return res.status(500).json({ message: 'Erro interno' });
    }
  }

  // ══════════════════════════════════════════════════════════════
  // PATCH - Marcar os royalties de vários pedidos de uma vez
  // ══════════════════════════════════════════════════════════════
  if (req.method === 'PATCH') {
    try {
      const { pedidoIds, tipo, status } = req.body || {};

      if (!Array.isArray(pedidoIds) || pedidoIds.length === 0 || !status) {
        return res.status(400).json({ message: 'Dados obrigatórios: pedidoIds (array), status' });
      }
      if (tipoInvalido(tipo)) {
        return res.status(400).json({ message: 'Tipo inválido. Use: royalties' });
      }
      if (!STATUS_VALIDOS.includes(status)) {
        return res.status(400).json({ message: 'Status inválido. Use: pendente ou pago' });
      }

      const resultado = await Pedido.updateMany(
        { _id: { $in: pedidoIds } },
        {
          $set: {
            'controleFinanceiro.royalties.status': status,
            'controleFinanceiro.royalties.dataPagamento': status === 'pago' ? new Date() : null,
          },
        },
      );

      console.log(`✅ ${resultado.modifiedCount} pedidos atualizados`);

      return res.status(200).json({
        success: true,
        message: `${resultado.modifiedCount} pedidos atualizados`,
        modifiedCount: resultado.modifiedCount,
      });
    } catch (error) {
      console.error('Erro ao atualizar múltiplos:', error);
      return res.status(500).json({ message: 'Erro interno' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default requireAdmin(handler);
