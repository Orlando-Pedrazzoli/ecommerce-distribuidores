// pages/api/admin/pedidos/atualizar-status.js - ATUALIZAR STATUS DO PEDIDO
// ===================================

import dbConnect from '../../../../lib/mongodb';
import Pedido from '../../../../models/Pedido';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
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

    const { pedidoId, status } = req.body;

    if (!pedidoId || !status) {
      return res
        .status(400)
        .json({ message: 'PedidoId e status são obrigatórios' });
    }

    const statusValidos = ['pendente', 'confirmado', 'enviado', 'entregue'];
    if (!statusValidos.includes(status)) {
      return res.status(400).json({ message: 'Status inválido' });
    }

    await dbConnect();

    // Buscar e atualizar o pedido
    const pedido = await Pedido.findById(pedidoId);

    if (!pedido) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    // Atualizar status e datas correspondentes
    pedido.status = status;

    // Registrar datas de mudança de status
    const now = new Date();
    switch (status) {
      case 'confirmado':
        pedido.dataConfirmacao = now;
        break;
      case 'enviado':
        pedido.dataEnvio = now;
        break;
      case 'entregue':
        pedido.dataEntrega = now;
        break;
    }

    await pedido.save();

    // Opcionalmente, você pode enviar um email notificando a mudança de status
    // await enviarEmailMudancaStatus(pedido, status);

    console.log(`✅ Status do pedido ${pedidoId} atualizado para: ${status}`);

    return res.status(200).json({
      success: true,
      message: 'Status atualizado com sucesso',
      pedido: {
        _id: pedido._id,
        status: pedido.status,
        dataAtualizacao: now,
      },
    });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }
    return res.status(500).json({
      message: 'Erro interno do servidor',
      error: error.message,
    });
  }
}
