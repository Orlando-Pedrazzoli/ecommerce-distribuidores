// 3. CORREÇÃO: models/Pedido.js - SEM REFERÊNCIA A USER
// ===================================

import mongoose from 'mongoose';

const PedidoSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // ← MUDANÇA: String em vez de ObjectId
      required: true,
      index: true,
    },
    fornecedorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fornecedor',
      required: true,
      index: true,
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
    endereco: {
      rua: { type: String, required: true },
      numero: { type: String, required: true },
      complemento: String,
      bairro: { type: String, required: true },
      cidade: { type: String, required: true },
      cep: { type: String, required: true },
      estado: { type: String, required: true },
    },
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
    status: {
      type: String,
      enum: ['pendente', 'confirmado', 'enviado', 'entregue'],
      default: 'pendente',
      index: true,
    },
    observacoes: String,
    codigoRastreamento: String,
    dataConfirmacao: Date,
    dataEnvio: Date,
    dataEntrega: Date,
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

// Índices compostos
PedidoSchema.index({ userId: 1, createdAt: -1 });
PedidoSchema.index({ fornecedorId: 1, createdAt: -1 });
PedidoSchema.index({ status: 1, createdAt: -1 });

// Virtual para número do pedido
PedidoSchema.virtual('numeroPedido').get(function () {
  return this._id.toString().slice(-8).toUpperCase();
});

export default mongoose.models.Pedido || mongoose.model('Pedido', PedidoSchema);
