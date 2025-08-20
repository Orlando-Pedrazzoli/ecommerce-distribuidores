// PAGES/API/PEDIDOS/CRIAR.JS - ATUALIZADO PARA USUARIOS
// ===================================

import dbConnect from '../../../lib/mongodb';
import Pedido from '../../../models/Pedido';
import Fornecedor from '../../../models/Fornecedor';
import User from '../../../models/User';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await dbConnect();

  try {
    // Verificar autenticação
    const token = req.cookies['auth-token'];
    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
    if (decoded.tipo !== 'distribuidor') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const { itens, fornecedorId, formaPagamento, endereco } = req.body;

    if (!itens || !fornecedorId || !formaPagamento || !endereco) {
      return res
        .status(400)
        .json({ message: 'Dados obrigatórios não fornecidos' });
    }

    // Buscar usuário
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Calcular totais
    const subtotal = itens.reduce(
      (acc, item) => acc + item.quantidade * item.precoUnitario,
      0
    );
    const royalties = subtotal * 0.05; // 5%
    const total = subtotal + royalties;

    // Criar pedido
    const pedido = new Pedido({
      userId: user._id,
      fornecedorId,
      itens,
      subtotal,
      royalties,
      total,
      formaPagamento,
      endereco,
    });

    await pedido.save();

    // Adicionar pedido ao histórico do usuário
    user.pedidos.push(pedido._id);
    await user.save();

    // Buscar dados para email (opcional)
    const fornecedor = await Fornecedor.findById(fornecedorId);

    return res.status(201).json({
      success: true,
      message: 'Pedido criado com sucesso',
      pedidoId: pedido._id,
      numeroPedido: pedido._id.toString().slice(-8).toUpperCase(),
    });
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
