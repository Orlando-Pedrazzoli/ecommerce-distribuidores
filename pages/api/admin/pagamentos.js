// PAGES/API/ADMIN/PAGAMENTOS.JS - ROYALTIES POR PEDIDO (ADMIN)
// ===================================
// Usada pela página de pedidos do admin.
// GET   ?filtro=pendente|pago&fornecedor=&distribuidor= -> pedidos + resumo
// PUT   { pedidoId, status, observacao? }  -> marca os royalties de um pedido
// PATCH { pedidoIds, status }              -> marca vários pedidos
// Os royalties pendentes já descontam as baixas parciais feitas por Pix
// (controleFinanceiro.royalties.valorPago). Ao marcar manualmente, só o
// status/data/observação mudam: o valorPago dos Pix nunca é apagado.

import dbConnect from '../../../lib/mongodb';
import Pedido from '../../../models/Pedido';
import Fornecedor from '../../../models/Fornecedor';
import { requireAdmin } from '../../../lib/auth';
import { arred, royaltiesEmAberto } from '../../../lib/financeiro';

const STATUS_VALIDOS = ['pendente', 'pago'];

// O único pagamento controlado são os royalties. 'todos' é aceito por
// compatibilidade com chamadas antigas e significa o mesmo.
const tipoInvalido = tipo => tipo !== undefined && !['royalties', 'todos'].includes(tipo);

async function handler(req, res) {
  // Autenticação admin garantida por requireAdmin (req.user disponível)

  await dbConnect();

  // ══════════════════════════════════════════════════════════════
  // GET - Listar pedidos com o status dos royalties
  // ══════════════════════════════════════════════════════════════
  if (req.method === 'GET') {
    try {
      const { filtro, fornecedor, distribuidor } = req.query;

      const query = {};
      if (fornecedor) query.fornecedorId = fornecedor;
      if (distribuidor) query.userId = distribuidor;
      if (filtro === 'pendente') query['controleFinanceiro.royalties.status'] = { $ne: 'pago' };
      else if (filtro === 'pago') query['controleFinanceiro.royalties.status'] = 'pago';

      const pedidos = await Pedido.find(query)
        .populate('fornecedorId', 'nome codigo email')
        .sort({ createdAt: -1 });

      const resumo = { totalPedidos: 0, royaltiesPendentes: 0, royaltiesPagos: 0 };

      pedidos.forEach(pedido => {
        resumo.totalPedidos += pedido.total || 0;
        const emAberto = royaltiesEmAberto(pedido);
        resumo.royaltiesPendentes += emAberto;
        resumo.royaltiesPagos += Math.max(0, (pedido.royalties || 0) - emAberto);
      });

      resumo.royaltiesPendentes = arred(resumo.royaltiesPendentes);
      resumo.royaltiesPagos = arred(resumo.royaltiesPagos);
      resumo.totalPendente = resumo.royaltiesPendentes;
      resumo.totalPago = resumo.royaltiesPagos;

      // Buscar fornecedores para filtro
      const fornecedores = await Fornecedor.find({ ativo: true }).select('nome codigo');

      // Buscar distribuidores únicos
      const distribuidoresUnicos = [...new Set(pedidos.map(p => p.userId))];

      return res.status(200).json({
        success: true,
        pedidos,
        resumo,
        fornecedores,
        distribuidores: distribuidoresUnicos,
        totalPedidos: pedidos.length,
      });
    } catch (error) {
      console.error('Erro ao buscar pagamentos:', error);
      return res.status(500).json({ message: 'Erro ao buscar pagamentos' });
    }
  }

  // ══════════════════════════════════════════════════════════════
  // PUT - Marcar os royalties de um pedido
  // ══════════════════════════════════════════════════════════════
  if (req.method === 'PUT') {
    try {
      const { pedidoId, tipo, status, observacao } = req.body || {};

      if (!pedidoId || !status) {
        return res.status(400).json({ message: 'pedidoId e status são obrigatórios' });
      }
      if (tipoInvalido(tipo)) {
        return res.status(400).json({ message: 'Tipo inválido. Use: royalties' });
      }
      if (!STATUS_VALIDOS.includes(status)) {
        return res.status(400).json({ message: 'Status inválido. Use: pendente ou pago' });
      }

      const pedidoAtualizado = await Pedido.findByIdAndUpdate(
        pedidoId,
        {
          $set: {
            'controleFinanceiro.royalties.status': status,
            'controleFinanceiro.royalties.dataPagamento': status === 'pago' ? new Date() : null,
            'controleFinanceiro.royalties.observacao': observacao || '',
          },
        },
        { new: true },
      ).populate('fornecedorId', 'nome codigo');

      if (!pedidoAtualizado) {
        return res.status(404).json({ message: 'Pedido não encontrado' });
      }

      return res.status(200).json({
        success: true,
        message: `Royalties marcados como ${status}`,
        pedido: pedidoAtualizado,
      });
    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
      return res.status(500).json({ message: 'Erro ao atualizar pagamento' });
    }
  }

  // ══════════════════════════════════════════════════════════════
  // PATCH - Atualização em lote
  // ══════════════════════════════════════════════════════════════
  if (req.method === 'PATCH') {
    try {
      const { pedidoIds, tipo, status } = req.body || {};

      if (!pedidoIds || !Array.isArray(pedidoIds) || pedidoIds.length === 0) {
        return res.status(400).json({ message: 'pedidoIds é obrigatório e deve ser um array' });
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

      return res.status(200).json({
        success: true,
        message: `${resultado.modifiedCount} pedidos atualizados`,
        modificados: resultado.modifiedCount,
      });
    } catch (error) {
      console.error('Erro ao atualizar em lote:', error);
      return res.status(500).json({ message: 'Erro ao atualizar em lote' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default requireAdmin(handler);
