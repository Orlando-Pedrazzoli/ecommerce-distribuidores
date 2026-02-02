// MODELS/FORNECEDOR.JS - COM CATEGORIAS ISENTAS DE ROYALTIES
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
    // ══════════════════════════════════════════════════════════════
    // 🆕 CATEGORIAS ISENTAS DE ROYALTIES
    // Produtos nestas categorias NÃO pagam royalties (5%)
    // Exemplo: ['Produtos Próprios', 'Parafinas']
    // ══════════════════════════════════════════════════════════════
    categoriasIsentasRoyalty: {
      type: [String],
      default: [],
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

export default mongoose.models.Fornecedor ||
  mongoose.model('Fornecedor', FornecedorSchema);