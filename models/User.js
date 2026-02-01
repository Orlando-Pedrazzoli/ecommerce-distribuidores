// models/User.js - ATUALIZADO COM TABELA DE PREÇOS
// ===================================

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    // Para distribuidores via .env
    usuario: {
      type: String,
      unique: true,
      sparse: true,
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

    // ══════════════════════════════════════════════════════════════
    // TABELA DE PREÇOS DO DISTRIBUIDOR
    // ══════════════════════════════════════════════════════════════
    tabelaPrecos: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    // Data da última atualização da tabela de preços
    ultimaAtualizacaoTabela: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Hash da senha antes de salvar
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    if (this.isModified('endereco')) {
      this.ultimaAtualizacaoEndereco = new Date();
    }
    if (this.isModified('tabelaPrecos')) {
      this.ultimaAtualizacaoTabela = new Date();
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

// Middleware para atualizar datas
UserSchema.pre('save', function (next) {
  if (this.isModified('endereco')) {
    this.ultimaAtualizacaoEndereco = new Date();
  }
  if (this.isModified('tabelaPrecos')) {
    this.ultimaAtualizacaoTabela = new Date();
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

// Índices
UserSchema.index({ usuario: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ tipo: 1 });

export default mongoose.models.User || mongoose.model('User', UserSchema);