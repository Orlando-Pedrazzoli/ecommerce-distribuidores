// PAGES/API/ADMIN/PAGAMENTOS.JS - API ADMIN PARA GERENCIAR PAGAMENTOS
// ===================================
// Os royalties pendentes já descontam as baixas parciais feitas por Pix
// (controleFinanceiro.royalties.valorPago). Ao marcar manualmente, só o
// status/data/observação mudam: o valorPago dos Pix nunca é apagado.

import dbConnect from '../../../lib/mongodb';
import Pedido from '../../../models/Pedido';
import Fornecedor from '../../../models/Fornecedor';
import { requireAdmin } from '../../../lib/auth';
import { royaltiesEmAberto } from '../../../lib/financeiro';

// Altera status/data/observação sem tocar no valorPago (baixas por Pix)
const marcar = (pedido, tipo, status, agora, observacao) => {
  const atual = pedido.controleFinanceiro[tipo] || {};
  atual.status = status;
  atual.dataPagamento = status === 'pago' ? agora : null;
  atual.observacao = observacao || '';
  pedido.controleFinanceiro[tipo] = atual;
};

async function handler(req, res) {
  // Autenticação admin garantida por requireAdmin (req.user disponível)

  await dbConnect();

  // ══════════════════════════════════════════════════════════════
  // GET - Listar todos os pedidos com status de pagamento
  // ══════════════════════════════════════════════════════════════
  if (req.method === 'GET') {
    try {
      const { filtro, fornecedor, distribuidor } = req.query;

      let query = {};

      // Filtro por fornecedor
      if (fornecedor) {
        query.fornecedorId = fornecedor;
      }

      // Filtro por distribuidor
      if (distribuidor) {
        query.userId = distribuidor;
      }

      // Filtro por status de pagamento
      if (filtro === 'pendente') {
        query.$or = [
          { 'controleFinanceiro.royalties.status': 'pendente' },
          { 'controleFinanceiro.etiquetas.status': 'pendente' },
          { 'controleFinanceiro.embalagens.status': 'pendente' },
        ];
      } else if (filtro === 'pago') {
        query['controleFinanceiro.royalties.status'] = 'pago';
        query['controleFinanceiro.etiquetas.status'] = 'pago';
        query['controleFinanceiro.embalagens.status'] = 'pago';
      }

      const pedidos = await Pedido.find(query)
        .populate('fornecedorId', 'nome codigo email')
        .sort({ createdAt: -1 });

      // Calcular resumo geral
      let resumo = {
        totalPedidos: 0,
        royaltiesPendentes: 0,
        royaltiesPagos: 0,
        etiquetasPendentes: 0,
        etiquetasPagas: 0,
        embalagensPendentes: 0,
        embalagensPagas: 0,
      };

      pedidos.forEach(pedido => {
        resumo.totalPedidos += pedido.total || 0;
        const cf = pedido.controleFinanceiro || {};

        const emAberto = royaltiesEmAberto(pedido);
        resumo.royaltiesPendentes += emAberto;
        resumo.royaltiesPagos += Math.max(0, (pedido.royalties || 0) - emAberto);

        if (cf.etiquetas?.status === 'pago') {
          resumo.etiquetasPagas += pedido.totalEtiquetas || 0;
        } else {
          resumo.etiquetasPendentes += pedido.totalEtiquetas || 0;
        }

        if (cf.embalagens?.status === 'pago') {
          resumo.embalagensPagas += pedido.totalEmbalagens || 0;
        } else {
          resumo.embalagensPendentes += pedido.totalEmbalagens || 0;
        }
      });

      resumo.totalPendente = 
        resumo.royaltiesPendentes + 
        resumo.etiquetasPendentes + 
        resumo.embalagensPendentes;

      resumo.totalPago = 
        resumo.royaltiesPagos + 
        resumo.etiquetasPagas + 
        resumo.embalagensPagas;

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
  // PUT - Atualizar status de pagamento
  // ══════════════════════════════════════════════════════════════
  if (req.method === 'PUT') {
    try {
      const { pedidoId, tipo, status, observacao } = req.body;

      if (!pedidoId || !tipo || !status) {
        return res.status(400).json({ 
          message: 'pedidoId, tipo e status são obrigatórios' 
        });
      }

      // Validar tipo
      if (!['royalties', 'etiquetas', 'embalagens', 'todos'].includes(tipo)) {
        return res.status(400).json({ 
          message: 'Tipo inválido. Use: royalties, etiquetas, embalagens ou todos' 
        });
      }

      // Validar status
      if (!['pendente', 'pago'].includes(status)) {
        return res.status(400).json({ 
          message: 'Status inválido. Use: pendente ou pago' 
        });
      }

      const pedido = await Pedido.findById(pedidoId);
      if (!pedido) {
        return res.status(404).json({ message: 'Pedido não encontrado' });
      }

      // Garantir que controleFinanceiro existe
      if (!pedido.controleFinanceiro) {
        pedido.controleFinanceiro = {
          royalties: { status: 'pendente' },
          etiquetas: { status: 'pendente' },
          embalagens: { status: 'pendente' },
        };
      }

      const agora = new Date();

      // Atualizar status
      if (tipo === 'todos') {
        // Atualizar todos de uma vez
        ['royalties', 'etiquetas', 'embalagens'].forEach(t =>
          marcar(pedido, t, status, agora, observacao),
        );
      } else {
        // Atualizar apenas o tipo especificado
        marcar(pedido, tipo, status, agora, observacao);
      }

      await pedido.save();

      // Buscar pedido atualizado com populate
      const pedidoAtualizado = await Pedido.findById(pedidoId)
        .populate('fornecedorId', 'nome codigo');

      return res.status(200).json({
        success: true,
        message: `Status de ${tipo} atualizado para ${status}`,
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
      const { pedidoIds, tipo, status } = req.body;

      if (!pedidoIds || !Array.isArray(pedidoIds) || pedidoIds.length === 0) {
        return res.status(400).json({ message: 'pedidoIds é obrigatório e deve ser um array' });
      }

      const agora = new Date();
      const updateData = {};

      if (tipo === 'todos') {
        updateData['controleFinanceiro.royalties.status'] = status;
        updateData['controleFinanceiro.royalties.dataPagamento'] = status === 'pago' ? agora : null;
        updateData['controleFinanceiro.etiquetas.status'] = status;
        updateData['controleFinanceiro.etiquetas.dataPagamento'] = status === 'pago' ? agora : null;
        updateData['controleFinanceiro.embalagens.status'] = status;
        updateData['controleFinanceiro.embalagens.dataPagamento'] = status === 'pago' ? agora : null;
      } else {
        updateData[`controleFinanceiro.${tipo}.status`] = status;
        updateData[`controleFinanceiro.${tipo}.dataPagamento`] = status === 'pago' ? agora : null;
      }

      const resultado = await Pedido.updateMany(
        { _id: { $in: pedidoIds } },
        { $set: updateData }
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
