// PAGES/API/PEDIDOS/INDEX.JS
// ===================================

import dbConnect from '../../../lib/mongodb';
import Pedido from '../../../models/Pedido';
import Distribuidor from '../../../models/Distribuidor';
import Fornecedor from '../../../models/Fornecedor';
import { requireAuth } from '../../../utils/auth';

async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      const {
        page = 1,
        limit = 10,
        fornecedor,
        distribuidor,
        status,
        dataInicio,
        dataFim,
      } = req.query;

      // Construir filtros
      let filter = {};

      if (fornecedor) {
        const fornecedorDoc = await Fornecedor.findOne({ codigo: fornecedor });
        if (fornecedorDoc) {
          filter.fornecedorId = fornecedorDoc._id;
        }
      }

      if (distribuidor) {
        filter.distribuidorId = distribuidor;
      }

      if (status && status !== 'todos') {
        filter.status = status;
      }

      // Filtro de data
      if (dataInicio || dataFim) {
        filter.dataPedido = {};
        if (dataInicio) {
          filter.dataPedido.$gte = new Date(dataInicio);
        }
        if (dataFim) {
          filter.dataPedido.$lte = new Date(dataFim + 'T23:59:59.999Z');
        }
      }

      // Paginação
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Buscar pedidos
      const pedidos = await Pedido.find(filter)
        .populate('distribuidorId', 'nome email telefone')
        .populate('fornecedorId', 'nome codigo')
        .populate('itens.produtoId', 'nome')
        .sort({ dataPedido: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Contar total
      const total = await Pedido.countDocuments(filter);

      // Estatísticas
      const stats = await Pedido.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalPedidos: { $sum: 1 },
            totalVendas: { $sum: '$total' },
            totalRoyalties: { $sum: '$royalties' },
            ticketMedio: { $avg: '$total' },
          },
        },
      ]);

      return res.status(200).json({
        pedidos,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
        stats: stats[0] || {
          totalPedidos: 0,
          totalVendas: 0,
          totalRoyalties: 0,
          ticketMedio: 0,
        },
      });
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, status, observacoes } = req.body;

      if (!id || !status) {
        return res
          .status(400)
          .json({ message: 'ID e status são obrigatórios' });
      }

      const statusValidos = ['pendente', 'confirmado', 'enviado', 'entregue'];
      if (!statusValidos.includes(status)) {
        return res.status(400).json({ message: 'Status inválido' });
      }

      const pedido = await Pedido.findByIdAndUpdate(
        id,
        {
          status,
          observacoes,
          dataUltimaAtualizacao: new Date(),
        },
        { new: true }
      ).populate('distribuidorId fornecedorId');

      if (!pedido) {
        return res.status(404).json({ message: 'Pedido não encontrado' });
      }

      // Aqui você pode adicionar envio de email para notificar sobre mudança de status
      // await enviarEmailStatusPedido(pedido);

      return res.status(200).json({
        success: true,
        message: 'Status atualizado com sucesso',
        pedido,
      });
    } catch (error) {
      console.error('Erro ao atualizar pedido:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ message: 'ID do pedido é obrigatório' });
      }

      const pedido = await Pedido.findById(id);
      if (!pedido) {
        return res.status(404).json({ message: 'Pedido não encontrado' });
      }

      // Só permite deletar se estiver pendente
      if (pedido.status !== 'pendente') {
        return res.status(400).json({
          message: 'Só é possível deletar pedidos pendentes',
        });
      }

      await Pedido.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        message: 'Pedido deletado com sucesso',
      });
    } catch (error) {
      console.error('Erro ao deletar pedido:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

// Aplicar middleware de autenticação
export default requireAuth(handler);
