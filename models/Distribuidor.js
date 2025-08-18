// 8. MODELS/DISTRIBUIDOR.JS
// ===================================

import mongoose from 'mongoose';

const DistribuidorSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  telefone: { type: String, required: true },
  endereco: {
    rua: String,
    numero: String,
    complemento: String,
    bairro: String,
    cidade: String,
    cep: String,
    estado: String,
  },
  ativo: { type: Boolean, default: true },
  dataCriacao: { type: Date, default: Date.now },
});

export default mongoose.models.Distribuidor ||
  mongoose.model('Distribuidor', DistribuidorSchema);
