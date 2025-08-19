// MODELS/FORNECEDOR.JS - SIMPLIFICADO
// ===================================

import mongoose from 'mongoose';

const FornecedorSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true,
    },
    codigo: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    categorias: [
      {
        type: String,
        trim: true,
      },
    ],
    ativo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Fornecedor ||
  mongoose.model('Fornecedor', FornecedorSchema);
