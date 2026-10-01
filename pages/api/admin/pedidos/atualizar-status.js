// pages/api/admin/pedidos/atualizar-status.js - ATUALIZAR STATUS DO PEDIDO
// ===================================
// PUT { pedidoId, status: 'pendente' | 'confirmado' }

import dbConnect from '../../../../lib/mongodb';
import Pedido from '../../../../models/Pedido';
import { requireAdmin } from '../../../../lib/auth';
import { STATUS_PEDIDO_VALIDOS } from '../../../../lib/statusPedido';

async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { pedidoId, status } = req.body;

    if (!pedidoId || !status) {
      return res
        .status(400)
        .json({ message: 'PedidoId e status são obrigatórios' });
    }

    if (!STATUS_PEDIDO_VALIDOS.includes(status)) {
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

    // Registrar a data da confirmação
    const now = new Date();
    if (status === 'confirmado') pedido.dataConfirmacao = now;

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

export default requireAdmin(handler);
