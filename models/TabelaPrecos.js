// models/TabelaPrecos.js
// ===================================
// Modelo para armazenar tabelas de preços dos distribuidores
// COM SUPORTE A ORDENAÇÃO PERSONALIZADA E FILTRO POR FORNECEDOR

import mongoose from 'mongoose';

const TabelaPrecosSchema = new mongoose.Schema(
  {
    // Identificador do distribuidor (username do .env)
    usuario: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    // Nome do distribuidor (para referência)
    nomeDistribuidor: {
      type: String,
      trim: true,
    },
    // Preços definidos pelo distribuidor
    // Chave = productId (string), Valor = preço de venda
    precos: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    // Produtos ocultos pelo distribuidor
    // Array de IDs de produtos que o distribuidor não quer exibir
    produtosOcultos: {
      type: [String],
      default: [],
    },
    // 🆕 Fornecedores ocultos pelo distribuidor
    // Array de nomes de fornecedores que o distribuidor não quer exibir
    fornecedoresOcultos: {
      type: [String],
      default: [],
    },
    // Ordem personalizada das categorias
    // Array de nomes de categorias na ordem desejada
    ordemCategorias: {
      type: [String],
      default: [],
    },
    // Ordem personalizada dos produtos por categoria
    // Objeto: { "NomeCategoria": ["produtoId1", "produtoId2", ...], ... }
    ordemProdutos: {
      type: Map,
      of: [String],
      default: new Map(),
    },
    // Data da última atualização
    ultimaAtualizacao: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Índice para busca rápida por usuario
TabelaPrecosSchema.index({ usuario: 1 });

export default mongoose.models.TabelaPrecos || mongoose.model('TabelaPrecos', TabelaPrecosSchema);