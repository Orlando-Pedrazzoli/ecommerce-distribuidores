// models/Pedido.js - PEDIDO (ITENS, VALORES, SINAL PIX E ROYALTIES)
// ===================================
// Valores: subtotal (produtos, vai para o fornecedor) + royalties = total.
// Status usados: pendente e confirmado.
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
        // Preço unitário do produto (vai para o fornecedor)
        precoUnitario: {
          type: Number,
          required: true,
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

    // Subtotal = soma dos produtos (vai para o fornecedor)
    subtotal: {
      type: Number,
      required: true,
    },
    // Royalties = % do subtotal, sem as categorias isentas (vai para o admin)
    royalties: {
      type: Number,
      required: true,
    },
    // Total que o DISTRIBUIDOR paga (subtotal + royalties)
    total: {
      type: Number,
      required: true,
    },
    // Total que o FORNECEDOR recebe (igual ao subtotal)
    totalFornecedor: {
      type: Number,
      required: true,
    },

    // ══════════════════════════════════════════════════════════════
    // CONTROLE FINANCEIRO - PAGAMENTO DOS ROYALTIES
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
    // O portal usa só 'pendente' e 'confirmado'. 'enviado' e 'entregue'
    // ficam no enum apenas para pedidos antigos continuarem válidos; nas
    // telas aparecem como confirmados (lib/statusPedido.js).
    status: {
      type: String,
      enum: ['pendente', 'confirmado', 'enviado', 'entregue'],
      default: 'pendente',
      index: true,
    },
    observacoes: String,
    dataConfirmacao: Date,
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

  // Só recalcula ao criar o pedido ou quando os itens mudam. Alterar o
  // status ou marcar um pagamento nunca mexe nos valores já gravados
  // (pedidos antigos mantêm o total com que foram feitos).
  if (this.isNew || this.isModified('itens')) {
    // Subtotal = soma dos preços × quantidade
    this.subtotal = cent(
      this.itens.reduce((sum, item) => sum + item.quantidade * item.precoUnitario, 0),
    );

    // Royalties: o valor vem calculado de pages/api/pedidos/criar.js, que já
    // desconta as categorias isentas e usa ROYALTY_PERCENTAGE. Só calcula
    // aqui se o pedido chegar sem o campo.
    if (typeof this.royalties !== 'number' || Number.isNaN(this.royalties)) {
      this.royalties = this.subtotal * (parseFloat(process.env.ROYALTY_PERCENTAGE) || 0.05);
    }
    this.royalties = cent(this.royalties);

    // Total do fornecedor = subtotal dos produtos
    this.totalFornecedor = this.subtotal;

    // Total do distribuidor = produtos + royalties
    this.total = cent(this.subtotal + this.royalties);
  }

  // Inicializar controle financeiro se não existir
  if (!this.controleFinanceiro) {
    this.controleFinanceiro = {
      royalties: { status: 'pendente' },
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

// Total que o admin recebe (royalties)
PedidoSchema.virtual('totalAdmin').get(function () {
  return this.royalties;
});

// Status do pagamento dos royalties: pago | parcial | pendente
PedidoSchema.virtual('statusFinanceiroGeral').get(function () {
  const r = this.controleFinanceiro?.royalties;
  if (r?.status === 'pago') return 'pago';
  return (r?.valorPago || 0) > 0 ? 'parcial' : 'pendente';
});

// Garantir que virtuals apareçam no JSON
PedidoSchema.set('toJSON', { virtuals: true });
PedidoSchema.set('toObject', { virtuals: true });

export default mongoose.models.Pedido || mongoose.model('Pedido', PedidoSchema);