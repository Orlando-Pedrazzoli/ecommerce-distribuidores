// models/User.js - USUÁRIOS (ADMIN + DISTRIBUIDORES) COM AUTENTICAÇÃO NO BANCO
// ===================================
// A partir desta versão o Mongo é a fonte de verdade das credenciais.
// As variáveis DISTRIBUIDOR_x / ADMIN_PASSWORD deixam de ser usadas no login
// (ver scripts/migrar-usuarios.js).

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const DispositivoConfiavelSchema = new mongoose.Schema(
  {
    did: { type: String, required: true }, // hash do id do dispositivo
    nome: { type: String, default: 'Dispositivo' }, // resumo do user-agent
    criadoEm: { type: Date, default: Date.now },
    ultimoUso: { type: Date, default: Date.now },
    expiraEm: { type: Date, required: true },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    // Identificador de login. Também é o `userId` usado nos pedidos,
    // por isso NUNCA deve ser alterado depois de criado.
    usuario: {
      type: String,
      required: true,
      unique: true,
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
    // Hash bcrypt. Pode estar vazio enquanto o distribuidor não define a
    // senha pelo link de convite.
    password: {
      type: String,
      select: false, // nunca vem nas queries por padrão
    },
    senhaDefinida: {
      type: Boolean,
      default: false,
    },
    telefone: {
      type: String,
      trim: true,
      default: '',
    },
    endereco: {
      rua: { type: String, trim: true },
      numero: { type: String, trim: true },
      complemento: { type: String, trim: true },
      bairro: { type: String, trim: true },
      cidade: { type: String, trim: true },
      cep: { type: String, trim: true },
      estado: { type: String, trim: true },
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

    // ══════════════════════════════════════════════════════════════
    // SEGURANÇA
    // ══════════════════════════════════════════════════════════════
    ultimoLogin: Date,
    tentativasLogin: { type: Number, default: 0 },
    bloqueadoAte: { type: Date, default: null },
    // Sessões (JWT) emitidas antes desta data são rejeitadas.
    passwordAlteradaEm: { type: Date, default: null },
    dispositivosConfiaveis: {
      type: [DispositivoConfiavelSchema],
      default: [],
    },

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
    ultimaAtualizacaoTabela: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Hash da senha + datas de atualização
UserSchema.pre('save', async function (next) {
  if (this.isModified('endereco')) {
    this.ultimaAtualizacaoEndereco = new Date();
  }
  if (this.isModified('tabelaPrecos')) {
    this.ultimaAtualizacaoTabela = new Date();
  }

  if (!this.isModified('password')) {
    return next();
  }

  try {
    if (!this.password) {
      this.senhaDefinida = false;
      return next();
    }
    // Evita re-hash se já for um hash bcrypt (ex.: script de migração)
    if (!/^\$2[aby]\$\d{2}\$/.test(this.password)) {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    }
    this.senhaDefinida = true;
    this.passwordAlteradaEm = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// Comparar senha (o documento precisa ter sido carregado com .select('+password'))
UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password || !candidatePassword) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual para endereço completo formatado
UserSchema.virtual('enderecoCompleto').get(function () {
  if (!this.endereco || !this.endereco.rua) return '';

  const { rua, numero, complemento, bairro, cidade, estado, cep } =
    this.endereco;
  let enderecoFormatado = `${rua}, ${numero}`;

  if (complemento) enderecoFormatado += `, ${complemento}`;
  enderecoFormatado += ` - ${bairro} - ${cidade}/${estado}`;
  if (cep) enderecoFormatado += ` - CEP: ${cep}`;

  return enderecoFormatado;
});

// Índices (usuario e email já têm unique)
UserSchema.index({ tipo: 1 });

export default mongoose.models.User || mongoose.model('User', UserSchema);
