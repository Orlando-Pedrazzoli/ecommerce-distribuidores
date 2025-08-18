// 14. PAGES/API/PEDIDOS/CRIAR.JS
// ===================================

import dbConnect from '../../../lib/mongodb';
import Pedido from '../../../models/Pedido';
import Fornecedor from '../../../models/Fornecedor';
import Distribuidor from '../../../models/Distribuidor';
import { enviarEmailPedido } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await dbConnect();

  try {
    const { itens, fornecedorId, distribuidorId, formaPagamento, endereco } =
      req.body;

    // Calcular totais
    const subtotal = itens.reduce(
      (acc, item) => acc + item.quantidade * item.precoUnitario,
      0
    );
    const royalties = subtotal * 0.05; // 5%
    const total = subtotal + royalties;

    // Criar pedido
    const pedido = new Pedido({
      distribuidorId,
      fornecedorId,
      itens,
      subtotal,
      royalties,
      total,
      formaPagamento,
    });

    await pedido.save();

    // Atualizar endereço do distribuidor se fornecido
    if (endereco) {
      await Distribuidor.findByIdAndUpdate(distribuidorId, { endereco });
    }

    // Buscar dados para email
    const fornecedor = await Fornecedor.findById(fornecedorId);
    const distribuidor = await Distribuidor.findById(distribuidorId);

    // Enviar emails
    await enviarEmailPedido(pedido, fornecedor, distribuidor);

    return res.status(201).json({
      success: true,
      message: 'Pedido criado com sucesso',
      pedidoId: pedido._id,
    });
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
