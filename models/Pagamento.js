// models/Pagamento.js - PAGAMENTOS PIX FEITOS PELO DISTRIBUIDOR (ROYALTIES)
// ===================================
// Cada documento é um Pix que o distribuidor declarou ter feito, com o
// comprovante. Ao ser registrado, o valor é abatido dos royalties em aberto
// (pedidos mais antigos primeiro) e fica "em_analise" até o admin conferir.
// Se o admin rejeitar, as alocações são revertidas e a dívida volta.

import mongoose from 'mongoose';

const PagamentoSchema = new mongoose.Schema(
  {
    // `usuario` do distribuidor (mesmo valor de Pedido.userId)
    userId: { type: String, required: true, index: true },
    userNome: { type: String, default: '' },

    tipo: { type: String, enum: ['royalties'], default: 'royalties' },
    valor: { type: Number, required: true, min: 0.01 },

    // Identificador do Pix (aparece no extrato de quem recebe). Único:
    // um segundo envio com o mesmo txid devolve o pagamento já registrado.
    txid: { type: String, required: true, unique: true },
    chavePix: { type: String, default: '' },
    comprovanteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comprovante',
      required: true,
    },

    status: {
      type: String,
      enum: ['em_analise', 'confirmado', 'rejeitado'],
      default: 'em_analise',
      index: true,
    },

    // Como o valor foi distribuído pelos pedidos
    alocacoes: [
      {
        _id: false,
        pedidoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pedido', required: true },
        valor: { type: Number, required: true },
        quitou: { type: Boolean, default: false }, // este pagamento zerou o royalty do pedido
      },
    ],
    saldoAntes: { type: Number, default: 0 },
    saldoDepois: { type: Number, default: 0 },

    conferidoEm: Date,
    conferidoPor: String,
    motivoRejeicao: String,
  },
  { timestamps: true },
);

PagamentoSchema.index({ userId: 1, createdAt: -1 });
PagamentoSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.Pagamento || mongoose.model('Pagamento', PagamentoSchema);
