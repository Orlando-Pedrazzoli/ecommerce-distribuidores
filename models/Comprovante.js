// models/Comprovante.js - COMPROVANTES DE PIX (IMAGEM OU PDF)
// ===================================
// O arquivo fica guardado no próprio MongoDB (campo `dados`) e só é servido
// por /api/comprovantes/[id], que exige sessão: o dono do comprovante ou o
// admin. Assim os dados bancários do distribuidor nunca ficam num link público.
//
// Um comprovante nasce "solto" (vinculado: false) quando é enviado e passa a
// vinculado quando o pedido ou o pagamento é registrado. Os que nunca são
// usados apagam-se sozinhos ao fim de 48 h (índice TTL parcial).

import mongoose from 'mongoose';

const ComprovanteSchema = new mongoose.Schema(
  {
    // `usuario` do distribuidor que enviou (mesmo valor de Pedido.userId)
    userId: { type: String, required: true, index: true },
    finalidade: { type: String, enum: ['sinal', 'royalties'], required: true },

    mimetype: { type: String, required: true },
    tamanho: { type: Number, required: true },
    nomeOriginal: { type: String, default: '' },
    // Impressão digital do arquivo: impede reutilizar o mesmo comprovante
    sha256: { type: String, required: true, index: true },
    dados: { type: Buffer, required: true, select: false },

    vinculado: { type: Boolean, default: false },
    referencia: {
      tipo: { type: String, enum: ['Pedido', 'Pagamento'] },
      id: mongoose.Schema.Types.ObjectId,
    },
  },
  { timestamps: true },
);

ComprovanteSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 48 * 60 * 60, partialFilterExpression: { vinculado: false } },
);

export default mongoose.models.Comprovante || mongoose.model('Comprovante', ComprovanteSchema);
