// 4. CORREÇÃO: pages/api/user/pedidos.js - SEM MONGOOSE USER
// ===================================

import jwt from 'jsonwebtoken';
import Pedido from '../../../models/Pedido';
import dbConnect from '../../../lib/mongodb';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = req.cookies['auth-token'];

    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);

    if (decoded.tipo === 'admin') {
      return res.status(403).json({ message: 'Use a rota admin para pedidos' });
    }

    const { page = 1, limit = 10, status } = req.query;

    let filter = { userId: decoded.usuario }; // ← Usar usuário string
    if (status && status !== 'todos') {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const pedidos = await Pedido.find(filter)
      .populate('fornecedorId', 'nome codigo')
      .populate('itens.produtoId', 'nome imagem')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Pedido.countDocuments(filter);

    return res.status(200).json({
      success: true,
      pedidos,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
