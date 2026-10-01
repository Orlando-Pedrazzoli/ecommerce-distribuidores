// MODELS/PRODUTO.JS - ATUALIZADO COM MÚLTIPLAS IMAGENS
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
    // Preço do produto (vai para o fornecedor)
    preco: {
      type: Number,
      required: true,
      min: 0,
    },
    // 🆕 ALTERADO: Array de imagens ao invés de única
    imagens: {
      type: [String], // Array de URLs do Cloudinary
      default: [],
    },
    // 🔄 RETROCOMPATIBILIDADE: Manter campo antigo para migração
    imagem: {
      type: String,
      default: null,
    },
    ativo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Mantido por compatibilidade: o preço total é o próprio preço do produto
ProdutoSchema.virtual('precoTotal').get(function () {
  return this.preco;
});

// 🆕 Virtual para obter todas as imagens (compatível com formato antigo e novo)
ProdutoSchema.virtual('todasImagens').get(function () {
  const imgs = [];
  
  // Primeiro, adiciona imagens do novo array
  if (this.imagens && this.imagens.length > 0) {
    imgs.push(...this.imagens);
  }
  
  // Se não tem imagens no array mas tem no campo antigo, usa ele
  if (imgs.length === 0 && this.imagem) {
    imgs.push(this.imagem);
  }
  
  return imgs;
});

// 🆕 Virtual para imagem principal (primeira do array ou campo antigo)
ProdutoSchema.virtual('imagemPrincipal').get(function () {
  if (this.imagens && this.imagens.length > 0) {
    return this.imagens[0];
  }
  return this.imagem || null;
});

// Garantir que virtuals apareçam no JSON
ProdutoSchema.set('toJSON', { virtuals: true });
ProdutoSchema.set('toObject', { virtuals: true });

// Índice composto para busca
ProdutoSchema.index({ fornecedorId: 1, categoria: 1 });
ProdutoSchema.index({ fornecedorId: 1, ativo: 1 });

export default mongoose.models.Produto ||
  mongoose.model('Produto', ProdutoSchema);