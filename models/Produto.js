// 10. MODELS/PRODUTO.JS
// ===================================

import mongoose from 'mongoose';

const ProdutoSchema = new mongoose.Schema({
  fornecedorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fornecedor',
    required: true,
  },
  categoria: {
    type: String,
    enum: ['Capas', 'Decks', 'Leashes', 'Acessórios'],
    required: true,
  },
  nome: { type: String, required: true },
  descricao: { type: String, required: true },
  preco: { type: Number, required: true },
  imagens: [String], // URLs do Cloudinary
  estoque: { type: Number, default: 0 },
  ativo: { type: Boolean, default: true },
  dataCriacao: { type: Date, default: Date.now },
});

export default mongoose.models.Produto ||
  mongoose.model('Produto', ProdutoSchema);
