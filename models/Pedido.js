// MODELS/PEDIDO.JS - ATUALIZADO COM CONTROLE FINANCEIRO
// ===================================
// Adicionado: totalEtiquetas, totalEmbalagens, controle de pagamentos

import mongoose from 'mongoose';

const PedidoSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // String em vez de ObjectId (distribuidores do .env)
      required: true,
      index: true,
    },
    fornecedorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fornecedor',
      required: true,
      index: true,
    },
    itens: [
      {
        produtoId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Produto',
          required: true,
        },
        codigo: String,
        nome: String,
        categoria: String,
        quantidade: {
          type: Number,
          required: true,
          min: 1,
        },
        // Preço base unitário (vai para fornecedor)
        precoUnitario: {
          type: Number,
          required: true,
        },
        // 🆕 Valor unitário da etiqueta
        precoEtiqueta: {
          type: Number,
          default: 0,
        },
        // 🆕 Valor unitário da embalagem
        precoEmbalagem: {
          type: Number,
          default: 0,
        },
      },
    ],
    endereco: {
      rua: { type: String, required: true },
      numero: { type: String, required: true },
      complemento: String,
      bairro: { type: String, required: true },
      cidade: { type: String, required: true },
      cep: { type: String, required: true },
      estado: { type: String, required: true },
    },

    // ══════════════════════════════════════════════════════════════
    // VALORES FINANCEIROS
    // ══════════════════════════════════════════════════════════════

    // Subtotal = soma dos preços BASE (vai para fornecedor)
    subtotal: {
      type: Number,
      required: true,
    },
    // 🆕 Total de etiquetas (vai para admin)
    totalEtiquetas: {
      type: Number,
      required: true,
      default: 0,
    },
    // 🆕 Total de embalagens (vai para admin)
    totalEmbalagens: {
      type: Number,
      required: true,
      default: 0,
    },
    // Royalties = 5% APENAS do subtotal base (vai para admin)
    royalties: {
      type: Number,
      required: true,
    },
    // Total que o DISTRIBUIDOR paga (subtotal + etiquetas + embalagens + royalties)
    total: {
      type: Number,
      required: true,
    },
    // 🆕 Total que o FORNECEDOR recebe (apenas subtotal base)
    totalFornecedor: {
      type: Number,
      required: true,
    },

    // ══════════════════════════════════════════════════════════════
    // 🆕 CONTROLE FINANCEIRO - STATUS DE PAGAMENTOS
    // ══════════════════════════════════════════════════════════════

    controleFinanceiro: {
      // Royalties (5% do subtotal base)
      royalties: {
        status: {
          type: String,
          enum: ['pendente', 'pago'],
          default: 'pendente',
        },
        dataPagamento: Date,
        observacao: String,
      },
      // Etiquetas
      etiquetas: {
        status: {
          type: String,
          enum: ['pendente', 'pago'],
          default: 'pendente',
        },
        dataPagamento: Date,
        observacao: String,
      },
      // Embalagens
      embalagens: {
        status: {
          type: String,
          enum: ['pendente', 'pago'],
          default: 'pendente',
        },
        dataPagamento: Date,
        observacao: String,
      },
    },

    // ══════════════════════════════════════════════════════════════
    // INFORMAÇÕES DO PEDIDO
    // ══════════════════════════════════════════════════════════════

    formaPagamento: {
      type: String,
      enum: ['boleto', 'transferencia'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pendente', 'confirmado', 'enviado', 'entregue'],
      default: 'pendente',
      index: true,
    },
    observacoes: String,
    codigoRastreamento: String,
    dataConfirmacao: Date,
    dataEnvio: Date,
    dataEntrega: Date,
  },
  {
    timestamps: true,
  }
);

// ══════════════════════════════════════════════════════════════
// MIDDLEWARE - Calcular totais automaticamente antes de salvar
// ══════════════════════════════════════════════════════════════

PedidoSchema.pre('save', function (next) {
  // Subtotal = soma dos preços BASE × quantidade
  this.subtotal = this.itens.reduce(
    (sum, item) => sum + item.quantidade * item.precoUnitario,
    0
  );

  // Total de etiquetas
  this.totalEtiquetas = this.itens.reduce(
    (sum, item) => sum + item.quantidade * (item.precoEtiqueta || 0),
    0
  );

  // Total de embalagens
  this.totalEmbalagens = this.itens.reduce(
    (sum, item) => sum + item.quantidade * (item.precoEmbalagem || 0),
    0
  );

  // Royalties = 5% APENAS do subtotal base
  this.royalties = this.subtotal * 0.05;

  // Total do fornecedor (apenas subtotal base)
  this.totalFornecedor = this.subtotal;

  // Total do distribuidor (tudo junto)
  this.total = this.subtotal + this.totalEtiquetas + this.totalEmbalagens + this.royalties;

  // Inicializar controle financeiro se não existir
  if (!this.controleFinanceiro) {
    this.controleFinanceiro = {
      royalties: { status: 'pendente' },
      etiquetas: { status: 'pendente' },
      embalagens: { status: 'pendente' },
    };
  }

  next();
});

// ══════════════════════════════════════════════════════════════
// ÍNDICES
// ══════════════════════════════════════════════════════════════

PedidoSchema.index({ userId: 1, createdAt: -1 });
PedidoSchema.index({ fornecedorId: 1, createdAt: -1 });
PedidoSchema.index({ status: 1, createdAt: -1 });
PedidoSchema.index({ 'controleFinanceiro.royalties.status': 1 });
PedidoSchema.index({ 'controleFinanceiro.etiquetas.status': 1 });
PedidoSchema.index({ 'controleFinanceiro.embalagens.status': 1 });

// ══════════════════════════════════════════════════════════════
// VIRTUALS
// ══════════════════════════════════════════════════════════════

// Número do pedido formatado
PedidoSchema.virtual('numeroPedido').get(function () {
  return this._id.toString().slice(-8).toUpperCase();
});

// Total que o admin recebe (royalties + etiquetas + embalagens)
PedidoSchema.virtual('totalAdmin').get(function () {
  return this.royalties + this.totalEtiquetas + this.totalEmbalagens;
});

// Status geral do controle financeiro
PedidoSchema.virtual('statusFinanceiroGeral').get(function () {
  const cf = this.controleFinanceiro;
  if (!cf) return 'pendente';

  const royaltiesPago = cf.royalties?.status === 'pago';
  const etiquetasPago = cf.etiquetas?.status === 'pago';
  const embalagensPago = cf.embalagens?.status === 'pago';

  if (royaltiesPago && etiquetasPago && embalagensPago) {
    return 'pago';
  } else if (royaltiesPago || etiquetasPago || embalagensPago) {
    return 'parcial';
  }
  return 'pendente';
});

// Garantir que virtuals apareçam no JSON
PedidoSchema.set('toJSON', { virtuals: true });
PedidoSchema.set('toObject', { virtuals: true });

export default mongoose.models.Pedido || mongoose.model('Pedido', PedidoSchema);