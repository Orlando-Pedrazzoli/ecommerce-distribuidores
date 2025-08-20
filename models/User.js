// MODELS/USER.JS - NOVO MODEL PARA DISTRIBUIDORES
// ===================================

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
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
    tipo: {
      type: String,
      enum: ['distribuidor', 'admin'],
      default: 'distribuidor',
    },
    ativo: {
      type: Boolean,
      default: true,
    },
    ultimoLogin: Date,
    pedidos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pedido',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Hash da senha antes de salvar
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar senha
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual para nome completo
UserSchema.virtual('nomeCompleto').get(function () {
  return this.nome;
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
