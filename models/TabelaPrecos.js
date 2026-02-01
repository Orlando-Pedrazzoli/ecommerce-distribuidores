// models/TabelaPrecos.js
// ===================================
// Modelo para armazenar tabelas de preços dos distribuidores
// Usa 'usuario' (string) como identificador, não ObjectId

import mongoose from 'mongoose';

const TabelaPrecosSchema = new mongoose.Schema(
  {
    // Identificador do distribuidor (username do .env)
    usuario: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    // Nome do distribuidor (para referência)
    nomeDistribuidor: {
      type: String,
      trim: true,
    },
    // Preços definidos pelo distribuidor
    // Chave = productId (string), Valor = preço de venda
    precos: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    // Data da última atualização
    ultimaAtualizacao: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Índice para busca rápida por usuario
TabelaPrecosSchema.index({ usuario: 1 });

export default mongoose.models.TabelaPrecos || mongoose.model('TabelaPrecos', TabelaPrecosSchema);