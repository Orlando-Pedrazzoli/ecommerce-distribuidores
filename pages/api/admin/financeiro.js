// PAGES/API/ADMIN/FINANCEIRO.JS - CONTROLE DE PAGAMENTOS
// ===================================
// Permite ao admin marcar royalties, etiquetas e embalagens como pagos

import dbConnect from '../../../lib/mongodb';
import Pedido from '../../../models/Pedido';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  // Verificar autenticação admin
  const token = req.cookies['auth-token'];
  if (!token) {
    return res.status(401).json({ message: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
    if (decoded.tipo !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado - apenas admin' });
    }
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido' });
  }

  await dbConnect();

  // ══════════════════════════════════════════════════════════════
  // GET - Buscar resumo financeiro
  // ══════════════════════════════════════════════════════════════
  if (req.method === 'GET') {
    try {
      const { status, tipo, periodo } = req.query;

      // Filtro base
      let filtro = {};

      // Filtrar por status de pagamento
      if (status && tipo) {
        filtro[`controleFinanceiro.${tipo}.status`] = status;
      }

      // Filtrar por período
      if (periodo) {
        const hoje = new Date();
        let dataInicio;

        switch (periodo) {
          case '7dias':
            dataInicio = new Date(hoje.setDate(hoje.getDate() - 7));
            break;
          case '30dias':
            dataInicio = new Date(hoje.setDate(hoje.getDate() - 30));
            break;
          case '90dias':
            dataInicio = new Date(hoje.setDate(hoje.getDate() - 90));
            break;
        }

        if (dataInicio) {
          filtro.createdAt = { $gte: dataInicio };
        }
      }

      // Buscar pedidos
      const pedidos = await Pedido.find(filtro)
        .populate('fornecedorId', 'nome codigo')
        .sort({ createdAt: -1 });

      // Calcular estatísticas
      const stats = {
        // Totais gerais
        totalPedidos: pedidos.length,
        totalGeral: pedidos.reduce((acc, p) => acc + (p.total || 0), 0),

        // Royalties
        royalties: {
          total: pedidos.reduce((acc, p) => acc + (p.royalties || 0), 0),
          pendente: pedidos
            .filter(p => p.controleFinanceiro?.royalties?.status === 'pendente')
            .reduce((acc, p) => acc + (p.royalties || 0), 0),
          pago: pedidos
            .filter(p => p.controleFinanceiro?.royalties?.status === 'pago')
            .reduce((acc, p) => acc + (p.royalties || 0), 0),
          qtdPendente: pedidos.filter(
            p => p.controleFinanceiro?.royalties?.status === 'pendente'
          ).length,
          qtdPago: pedidos.filter(p => p.controleFinanceiro?.royalties?.status === 'pago')
            .length,
        },

        // Etiquetas
        etiquetas: {
          total: pedidos.reduce((acc, p) => acc + (p.totalEtiquetas || 0), 0),
          pendente: pedidos
            .filter(p => p.controleFinanceiro?.etiquetas?.status === 'pendente')
            .reduce((acc, p) => acc + (p.totalEtiquetas || 0), 0),
          pago: pedidos
            .filter(p => p.controleFinanceiro?.etiquetas?.status === 'pago')
            .reduce((acc, p) => acc + (p.totalEtiquetas || 0), 0),
          qtdPendente: pedidos.filter(
            p => p.controleFinanceiro?.etiquetas?.status === 'pendente'
          ).length,
          qtdPago: pedidos.filter(p => p.controleFinanceiro?.etiquetas?.status === 'pago')
            .length,
        },

        // Embalagens
        embalagens: {
          total: pedidos.reduce((acc, p) => acc + (p.totalEmbalagens || 0), 0),
          pendente: pedidos
            .filter(p => p.controleFinanceiro?.embalagens?.status === 'pendente')
            .reduce((acc, p) => acc + (p.totalEmbalagens || 0), 0),
          pago: pedidos
            .filter(p => p.controleFinanceiro?.embalagens?.status === 'pago')
            .reduce((acc, p) => acc + (p.totalEmbalagens || 0), 0),
          qtdPendente: pedidos.filter(
            p => p.controleFinanceiro?.embalagens?.status === 'pendente'
          ).length,
          qtdPago: pedidos.filter(p => p.controleFinanceiro?.embalagens?.status === 'pago')
            .length,
        },
      };

      // Total a receber (admin)
      stats.totalAReceber =
        stats.royalties.pendente + stats.etiquetas.pendente + stats.embalagens.pendente;
      stats.totalRecebido =
        stats.royalties.pago + stats.etiquetas.pago + stats.embalagens.pago;

      return res.status(200).json({
        success: true,
        pedidos,
        stats,
      });
    } catch (error) {
      console.error('Erro ao buscar financeiro:', error);
      return res.status(500).json({ message: 'Erro interno', error: error.message });
    }
  }

  // ══════════════════════════════════════════════════════════════
  // PUT - Atualizar status de pagamento
  // ══════════════════════════════════════════════════════════════
  if (req.method === 'PUT') {
    try {
      const { pedidoId, tipo, status, observacao } = req.body;

      // Validações
      if (!pedidoId || !tipo || !status) {
        return res.status(400).json({
          message: 'Dados obrigatórios: pedidoId, tipo, status',
        });
      }

      const tiposValidos = ['royalties', 'etiquetas', 'embalagens'];
      if (!tiposValidos.includes(tipo)) {
        return res.status(400).json({
          message: 'Tipo inválido. Use: royalties, etiquetas ou embalagens',
        });
      }

      const statusValidos = ['pendente', 'pago'];
      if (!statusValidos.includes(status)) {
        return res.status(400).json({
          message: 'Status inválido. Use: pendente ou pago',
        });
      }

      // Buscar pedido
      const pedido = await Pedido.findById(pedidoId);
      if (!pedido) {
        return res.status(404).json({ message: 'Pedido não encontrado' });
      }

      // Inicializar controleFinanceiro se não existir
      if (!pedido.controleFinanceiro) {
        pedido.controleFinanceiro = {
          royalties: { status: 'pendente' },
          etiquetas: { status: 'pendente' },
          embalagens: { status: 'pendente' },
        };
      }

      // Atualizar status
      pedido.controleFinanceiro[tipo].status = status;
      pedido.controleFinanceiro[tipo].dataPagamento =
        status === 'pago' ? new Date() : null;
      if (observacao) {
        pedido.controleFinanceiro[tipo].observacao = observacao;
      }

      await pedido.save();

      console.log(
        `✅ Status de ${tipo} do pedido ${pedidoId} atualizado para: ${status}`
      );

      return res.status(200).json({
        success: true,
        message: `Status de ${tipo} atualizado para ${status}`,
        pedido: {
          _id: pedido._id,
          controleFinanceiro: pedido.controleFinanceiro,
        },
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      return res.status(500).json({ message: 'Erro interno', error: error.message });
    }
  }

  // ══════════════════════════════════════════════════════════════
  // PATCH - Atualizar múltiplos pagamentos de uma vez
  // ══════════════════════════════════════════════════════════════
  if (req.method === 'PATCH') {
    try {
      const { pedidoIds, tipo, status } = req.body;

      if (!pedidoIds || !Array.isArray(pedidoIds) || !tipo || !status) {
        return res.status(400).json({
          message: 'Dados obrigatórios: pedidoIds (array), tipo, status',
        });
      }

      const resultado = await Pedido.updateMany(
        { _id: { $in: pedidoIds } },
        {
          $set: {
            [`controleFinanceiro.${tipo}.status`]: status,
            [`controleFinanceiro.${tipo}.dataPagamento`]:
              status === 'pago' ? new Date() : null,
          },
        }
      );

      console.log(`✅ ${resultado.modifiedCount} pedidos atualizados`);

      return res.status(200).json({
        success: true,
        message: `${resultado.modifiedCount} pedidos atualizados`,
        modifiedCount: resultado.modifiedCount,
      });
    } catch (error) {
      console.error('Erro ao atualizar múltiplos:', error);
      return res.status(500).json({ message: 'Erro interno', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}