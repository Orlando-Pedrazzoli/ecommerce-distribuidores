// models/User.js - ATUALIZADO PARA DISTRIBUIDORES
// ===================================

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    // Para distribuidores via .env
    usuario: {
      type: String,
      unique: true,
      sparse: true, // Permite null/undefined para alguns usuários
      trim: true,
    },
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
      rua: { type: String, required: true, trim: true },
      numero: { type: String, required: true, trim: true },
      complemento: { type: String, trim: true },
      bairro: { type: String, required: true, trim: true },
      cidade: { type: String, required: true, trim: true },
      cep: { type: String, required: true, trim: true },
      estado: { type: String, required: true, trim: true },
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
    ultimaAtualizacaoEndereco: {
      type: Date,
      default: Date.now,
    },
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
  // Só fazer hash se password foi modificado
  if (!this.isModified('password')) {
    // Atualizar data de modificação do endereço se foi alterado
    if (this.isModified('endereco')) {
      this.ultimaAtualizacaoEndereco = new Date();
    }
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Middleware para atualizar data do endereço
UserSchema.pre('save', function (next) {
  if (this.isModified('endereco')) {
    this.ultimaAtualizacaoEndereco = new Date();
  }
  next();
});

// Método para comparar senha
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual para endereço completo formatado
UserSchema.virtual('enderecoCompleto').get(function () {
  if (!this.endereco) return '';

  const { rua, numero, complemento, bairro, cidade, estado, cep } =
    this.endereco;
  let enderecoFormatado = `${rua}, ${numero}`;

  if (complemento) enderecoFormatado += `, ${complemento}`;
  enderecoFormatado += ` - ${bairro} - ${cidade}/${estado}`;
  if (cep) enderecoFormatado += ` - CEP: ${cep}`;

  return enderecoFormatado;
});

// Índice para busca por usuário (distribuidores .env)
UserSchema.index({ usuario: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ tipo: 1 });

export default mongoose.models.User || mongoose.model('User', UserSchema);
