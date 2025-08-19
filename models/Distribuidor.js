// MODELS/DISTRIBUIDOR.JS - SIMPLIFICADO
// ===================================

import mongoose from 'mongoose';

const DistribuidorSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    telefone: {
      type: String,
      required: true,
      trim: true,
    },
    endereco: {
      rua: String,
      numero: String,
      complemento: String,
      bairro: String,
      cidade: String,
      cep: String,
      estado: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Distribuidor ||
  mongoose.model('Distribuidor', DistribuidorSchema);
