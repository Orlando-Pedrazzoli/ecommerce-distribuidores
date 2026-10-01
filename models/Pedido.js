// models/Pedido.js - PEDIDO (ITENS, VALORES, SINAL PIX E CONTROLE FINANCEIRO)
// ===================================
// - sinal: entrada paga por Pix ao fornecedor no checkout (com comprovante)
// - controleFinanceiro.royalties.valorPago: quanto já foi abatido por
//   pagamentos Pix do distribuidor (ver models/Pagamento.js)

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
        // Foto principal do produto no momento do pedido (vai nos emails,
        // para o fornecedor produzir exatamente o que foi pedido)
        imagem: String,
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
        // Soma dos pagamentos Pix já abatidos neste pedido (baixas parciais).
        // Em aberto = royalties - valorPago (ver lib/financeiro.js)
        valorPago: {
          type: Number,
          default: 0,
        },
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
    // SINAL - entrada paga por Pix ao fornecedor para o pedido ser enviado
    // ══════════════════════════════════════════════════════════════

    sinal: {
      // % aplicado sobre o total do fornecedor no momento do pedido
      percentual: { type: Number, default: 0 },
      valor: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ['nao_aplicavel', 'em_analise', 'confirmado', 'rejeitado'],
        default: 'nao_aplicavel',
      },
      // Identificador do Pix (aparece no extrato de quem recebe)
      txid: String,
      // Chave Pix para onde o sinal foi enviado (cópia do momento do pedido)
      chavePix: String,
      comprovanteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comprovante',
      },
      // Comprovantes substituídos depois de uma rejeição
      comprovantesAnteriores: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Comprovante',
        },
      ],
      enviadoEm: Date,
      conferidoEm: Date,
      conferidoPor: String,
      motivoRejeicao: String,
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
  const cent = v => Math.round((Number(v) || 0) * 100) / 100;

  // Subtotal = soma dos preços BASE × quantidade
  this.subtotal = cent(
    this.itens.reduce((sum, item) => sum + item.quantidade * item.precoUnitario, 0),
  );

  // Total de etiquetas
  this.totalEtiquetas = cent(
    this.itens.reduce((sum, item) => sum + item.quantidade * (item.precoEtiqueta || 0), 0),
  );

  // Total de embalagens
  this.totalEmbalagens = cent(
    this.itens.reduce((sum, item) => sum + item.quantidade * (item.precoEmbalagem || 0), 0),
  );

  // Royalties: o valor vem calculado de pages/api/pedidos/criar.js, que já
  // desconta as categorias isentas e usa ROYALTY_PERCENTAGE. NÃO recalcular
  // aqui: antes este hook repunha sempre 5% do subtotal a cada save() e
  // anulava a isenção. Só calcula se o pedido chegar sem o campo.
  if (typeof this.royalties !== 'number' || Number.isNaN(this.royalties)) {
    this.royalties = this.subtotal * (parseFloat(process.env.ROYALTY_PERCENTAGE) || 0.05);
  }
  this.royalties = cent(this.royalties);

  // Total do fornecedor (apenas subtotal base)
  this.totalFornecedor = this.subtotal;

  // Total do distribuidor (tudo junto)
  this.total = cent(this.subtotal + this.totalEtiquetas + this.totalEmbalagens + this.royalties);

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
PedidoSchema.index({ 'sinal.status': 1 });
// Um identificador de Pix só pode pertencer a um pedido (evita pedido duplicado
// se o distribuidor clicar duas vezes em "Enviar")
PedidoSchema.index(
  { 'sinal.txid': 1 },
  { unique: true, partialFilterExpression: { 'sinal.txid': { $type: 'string' } } },
);

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