// 9. MODELS/FORNECEDOR.JS
// ===================================

import mongoose from 'mongoose';

const FornecedorSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  codigo: { type: String, required: true, unique: true }, // A, B, C
  email: { type: String, required: true },
  ativo: { type: Boolean, default: true },
  dataCriacao: { type: Date, default: Date.now },
});

export default mongoose.models.Fornecedor ||
  mongoose.model('Fornecedor', FornecedorSchema);
