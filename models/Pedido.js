// 11. MODELS/PEDIDO.JS
// ===================================

import mongoose from 'mongoose';

const PedidoSchema = new mongoose.Schema({
  distribuidorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Distribuidor',
    required: true,
  },
  fornecedorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fornecedor',
    required: true,
  },
  itens: [
    {
      produtoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Produto',
        required: true,
      },
      nome: String,
      quantidade: { type: Number, required: true },
      precoUnitario: { type: Number, required: true },
    },
  ],
  subtotal: { type: Number, required: true },
  royalties: { type: Number, required: true }, // 5%
  total: { type: Number, required: true },
  formaPagamento: {
    type: String,
    enum: ['boleto', 'transferencia'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pendente', 'confirmado', 'enviado', 'entregue'],
    default: 'pendente',
  },
  dataPedido: { type: Date, default: Date.now },
});

export default mongoose.models.Pedido || mongoose.model('Pedido', PedidoSchema);
