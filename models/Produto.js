// MODELS/PRODUTO.JS - ATUALIZADO COM ETIQUETA E EMBALAGEM
// ===================================
// Removido: precoSemNF
// Adicionado: precoEtiqueta, precoEmbalagem

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
    // Preço base do produto (vai para o fornecedor)
    preco: {
      type: Number,
      required: true,
      min: 0,
    },
    // 🆕 Valor da etiqueta (vai para o admin)
    precoEtiqueta: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    // 🆕 Valor da embalagem (vai para o admin)
    precoEmbalagem: {
      type: Number,
      required: true,
      default: 0,
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

// Virtual para preço total (base + etiqueta + embalagem)
ProdutoSchema.virtual('precoTotal').get(function () {
  return this.preco + (this.precoEtiqueta || 0) + (this.precoEmbalagem || 0);
});

// Garantir que virtuals apareçam no JSON
ProdutoSchema.set('toJSON', { virtuals: true });
ProdutoSchema.set('toObject', { virtuals: true });

// Índice composto para busca
ProdutoSchema.index({ fornecedorId: 1, categoria: 1 });
ProdutoSchema.index({ fornecedorId: 1, ativo: 1 });

export default mongoose.models.Produto ||
  mongoose.model('Produto', ProdutoSchema);