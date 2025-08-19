// MODELS/PRODUTO.JS - SIMPLIFICADO
// ===================================

import mongoose from 'mongoose';

const ProdutoSchema = new mongoose.Schema(
  {
    fornecedorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fornecedor',
      required: true,
    },
    codigo: {
      type: String,
      required: true,
      trim: true,
    },
    nome: {
      type: String,
      required: true,
      trim: true,
    },
    descricao: {
      type: String,
      required: true,
      trim: true,
    },
    categoria: {
      type: String,
      required: true,
      trim: true,
    },
    preco: {
      type: Number,
      required: true,
      min: 0,
    },
    imagem: String, // URL do Cloudinary
    ativo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Índice composto para busca
ProdutoSchema.index({ fornecedorId: 1, categoria: 1 });
ProdutoSchema.index({ fornecedorId: 1, ativo: 1 });

export default mongoose.models.Produto ||
  mongoose.model('Produto', ProdutoSchema);
