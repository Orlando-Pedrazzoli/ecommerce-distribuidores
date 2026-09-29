// models/Fornecedor.js - FORNECEDOR (DADOS CADASTRAIS + APRESENTAÇÃO + REGRAS)
// ===================================
// Passa a guardar tudo o que antes estava hardcoded em pages/dashboard.js e
// no seed (especialidade, descrição, cor, logo), mais contactos e regras
// de royalties. O admin gere estes dados em /admin/fornecedores.

import mongoose from 'mongoose';

const FornecedorSchema = new mongoose.Schema(
  {
    // ── Identificação ──
    nome: {
      type: String,
      required: true,
      trim: true,
    },
    // Código curto usado nas URLs (/produtos/A). Único e imutável depois
    // de ter produtos/pedidos associados.
    codigo: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    // ── Contacto ──
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    // Emails adicionais que também recebem os pedidos (opcional)
    emailsCopia: {
      type: [String],
      default: [],
    },
    telefone: { type: String, trim: true, default: '' },
    whatsapp: { type: String, trim: true, default: '' },
    responsavel: { type: String, trim: true, default: '' },
    cnpj: { type: String, trim: true, default: '' },
    cidade: { type: String, trim: true, default: '' },
    estado: { type: String, trim: true, default: '' },

    // ── Apresentação no portal do distribuidor ──
    especialidade: { type: String, trim: true, default: '' },
    descricao: { type: String, trim: true, default: '' },
    cor: { type: String, trim: true, default: '#374151' }, // hex
    logo: { type: String, default: '' }, // URL (Cloudinary) ou /public
    ordem: { type: Number, default: 0 }, // ordem dos cartões no dashboard

    // ── Catálogo ──
    categorias: [
      {
        type: String,
        trim: true,
      },
    ],
    // Produtos nestas categorias NÃO pagam royalties (5%)
    categoriasIsentasRoyalty: {
      type: [String],
      default: [],
    },

    // ── Operação ──
    prazoEntregaDias: { type: Number, default: null },
    pedidoMinimo: { type: Number, default: 0 },
    observacoes: { type: String, trim: true, default: '' }, // notas internas (só admin)

    ativo: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

FornecedorSchema.index({ ativo: 1, ordem: 1 });

export default mongoose.models.Fornecedor || mongoose.model('Fornecedor', FornecedorSchema);
