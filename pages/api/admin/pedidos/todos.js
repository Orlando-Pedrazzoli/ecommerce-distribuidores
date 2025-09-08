// pages/api/admin/pedidos/todos.js - BUSCAR TODOS OS PEDIDOS
// ===================================

import dbConnect from '../../../../lib/mongodb';
import Pedido from '../../../../models/Pedido';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verificar autenticação e se é admin
    const token = req.cookies['auth-token'];
    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
    if (decoded.tipo !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado - apenas admin' });
    }

    await dbConnect();

    // Buscar TODOS os pedidos
    const pedidos = await Pedido.find({})
      .populate('fornecedorId', 'nome codigo')
      .sort({ createdAt: -1 }); // Mais recentes primeiro

    // Estatísticas
    const stats = {
      total: pedidos.length,
      pendentes: pedidos.filter(p => p.status === 'pendente').length,
      confirmados: pedidos.filter(p => p.status === 'confirmado').length,
      enviados: pedidos.filter(p => p.status === 'enviado').length,
      entregues: pedidos.filter(p => p.status === 'entregue').length,
      valorTotal: pedidos.reduce((acc, p) => acc + (p.total || 0), 0),
    };

    return res.status(200).json({
      success: true,
      pedidos,
      stats,
    });
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }
    return res.status(500).json({
      message: 'Erro interno do servidor',
      error: error.message,
    });
  }
}
