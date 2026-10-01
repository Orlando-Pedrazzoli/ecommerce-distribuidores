// models/Configuracao.js - CONFIGURAÇÕES GERAIS DO PORTAL (DOCUMENTO ÚNICO)
// ===================================
// Por agora guarda a chave Pix onde os distribuidores pagam os royalties.
// O admin edita em /admin/financeiro.

import mongoose from 'mongoose';

const ConfiguracaoSchema = new mongoose.Schema(
  {
    // Só existe um documento, com id 'geral'
    _id: { type: String, default: 'geral' },

    pixRoyalties: {
      tipo: {
        type: String,
        enum: ['', 'cpf', 'cnpj', 'email', 'telefone', 'aleatoria'],
        default: '',
      },
      chave: { type: String, trim: true, default: '' },
      titular: { type: String, trim: true, default: '' },
      cidade: { type: String, trim: true, default: '' },
    },

    atualizadoPor: String,
  },
  { timestamps: true },
);

const Configuracao =
  mongoose.models.Configuracao || mongoose.model('Configuracao', ConfiguracaoSchema);

/** Lê a configuração (objeto simples). Nunca devolve null. */
export const obterConfiguracao = async () => {
  const doc = await Configuracao.findById('geral').lean();
  return doc || { _id: 'geral', pixRoyalties: { tipo: '', chave: '', titular: '', cidade: '' } };
};

export default Configuracao;
