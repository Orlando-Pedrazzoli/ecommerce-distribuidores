// MODELS/PEDIDO.JS - SIMPLIFICADO
// ===================================

import mongoose from 'mongoose';

const PedidoSchema = new mongoose.Schema(
  {
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
        codigo: String,
        nome: String,
        quantidade: {
          type: Number,
          required: true,
          min: 1,
        },
        precoUnitario: {
          type: Number,
          required: true,
        },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
    },
    royalties: {
      type: Number,
      required: true, // 5% do subtotal
    },
    total: {
      type: Number,
      required: true, // subtotal + royalties
    },
    formaPagamento: {
      type: String,
      enum: ['boleto', 'transferencia'],
      required: true,
    },
    endereco: {
      rua: { type: String, required: true },
      numero: { type: String, required: true },
      complemento: String,
      bairro: { type: String, required: true },
      cidade: { type: String, required: true },
      cep: { type: String, required: true },
      estado: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ['pendente', 'confirmado', 'enviado', 'entregue'],
      default: 'pendente',
    },
  },
  {
    timestamps: true,
  }
);

// Middleware para calcular totais
PedidoSchema.pre('save', function (next) {
  this.subtotal = this.itens.reduce(
    (sum, item) => sum + item.quantidade * item.precoUnitario,
    0
  );
  this.royalties = this.subtotal * 0.05; // 5%
  this.total = this.subtotal + this.royalties;
  next();
});

export default mongoose.models.Pedido || mongoose.model('Pedido', PedidoSchema);
