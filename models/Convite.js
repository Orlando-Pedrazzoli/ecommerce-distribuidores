// models/Convite.js - CONVITES DE CADASTRO PARA NOVOS DISTRIBUIDORES
// ===================================
// O admin envia um convite por email; o distribuidor abre o link
// (/cadastro/[token]) e cria a própria conta (usuário, senha, dados).
// Difere do AuthToken CONVITE, que pressupõe um User já criado pelo admin.
// Só o HASH do token é guardado; o valor em claro vai apenas no email.

import mongoose from 'mongoose';

export const STATUS_CONVITE = {
  PENDENTE: 'pendente',
  ACEITE: 'aceite',
  CANCELADO: 'cancelado',
};

const ConviteSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    // Nome/empresa sugerido pelo admin (pré-preenche o formulário)
    nome: { type: String, trim: true, default: '' },
    // Mensagem pessoal incluída no email (opcional)
    mensagem: { type: String, trim: true, default: '' },

    tokenHash: { type: String, required: true, unique: true },
    expiraEm: { type: Date, required: true },

    status: {
      type: String,
      enum: Object.values(STATUS_CONVITE),
      default: STATUS_CONVITE.PENDENTE,
      index: true,
    },

    criadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    enviadoEm: { type: Date, default: null },
    reenvios: { type: Number, default: 0 },
    ultimoErroEnvio: { type: String, default: '' },

    aceiteEm: { type: Date, default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    canceladoEm: { type: Date, default: null },
  },
  { timestamps: true },
);

ConviteSchema.virtual('expirado').get(function () {
  return this.status === STATUS_CONVITE.PENDENTE && this.expiraEm.getTime() < Date.now();
});

ConviteSchema.set('toJSON', { virtuals: true });
ConviteSchema.set('toObject', { virtuals: true });

export default mongoose.models.Convite || mongoose.model('Convite', ConviteSchema);
