// pages/api/admin/pedidos/todos.js - BUSCAR TODOS OS PEDIDOS
// ===================================

import dbConnect from '../../../../lib/mongodb';
import Pedido from '../../../../models/Pedido';
import { requireAdmin } from '../../../../lib/auth';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    // Buscar TODOS os pedidos
    const pedidos = await Pedido.find({})
      .populate('fornecedorId', 'nome codigo')
      .sort({ createdAt: -1 }); // Mais recentes primeiro

    // Estatísticas
    const stats = {
      total: pedidos.length,
      pendentes: pedidos.filter(p => p.status === 'pendente').length,
      // pedidos antigos "enviado"/"entregue" contam como confirmados
      confirmados: pedidos.filter(p => p.status !== 'pendente').length,
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

export default requireAdmin(handler);
