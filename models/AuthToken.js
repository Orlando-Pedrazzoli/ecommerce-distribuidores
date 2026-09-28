// models/AuthToken.js - TOKENS DE USO ÚNICO (OTP, RESET DE SENHA, CONVITE)
// ===================================
// Guarda apenas o HASH do código/token. O valor em claro só existe no email.
// Documentos expirados são removidos automaticamente pelo índice TTL.

import mongoose from 'mongoose';

export const TIPOS_TOKEN = {
  OTP_LOGIN: 'otp_login',
  RESET_SENHA: 'reset_senha',
  CONVITE: 'convite',
};

const AuthTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tipo: {
      type: String,
      enum: Object.values(TIPOS_TOKEN),
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    expiraEm: {
      type: Date,
      required: true,
    },
    tentativas: {
      type: Number,
      default: 0,
    },
    usadoEm: {
      type: Date,
      default: null,
    },
    meta: {
      ip: String,
      userAgent: String,
    },
  },
  { timestamps: true }
);

// TTL: o Mongo apaga o documento assim que `expiraEm` passa
AuthTokenSchema.index({ expiraEm: 1 }, { expireAfterSeconds: 0 });
AuthTokenSchema.index({ userId: 1, tipo: 1, usadoEm: 1 });

export default mongoose.models.AuthToken ||
  mongoose.model('AuthToken', AuthTokenSchema);
