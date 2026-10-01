// lib/comprovantes.js - REGRAS DOS COMPROVANTES DE PIX (SERVIDOR)
// ===================================
// Deteção do tipo de arquivo, reserva ("vincular") e leitura para anexar
// aos emails. O upload em si está em pages/api/comprovantes/index.js.

import crypto from 'crypto';
import mongoose from 'mongoose';
import Comprovante from '../models/Comprovante';

// A Vercel recusa corpos acima de ~4,5 MB; o cliente já comprime as imagens.
export const TAMANHO_MAXIMO = 4 * 1024 * 1024;

const EXTENSOES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/**
 * Descobre o tipo real do arquivo pelos primeiros bytes (não confia no
 * nome nem no mimetype enviados pelo navegador).
 * @returns {string|null} mimetype aceite ou null
 */
export const detetarTipo = buffer => {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return 'image/png';
  if (
    buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buffer.subarray(8, 12).toString('latin1') === 'WEBP'
  )
    return 'image/webp';
  if (buffer.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  return null;
};

export const extensaoDe = mimetype => EXTENSOES[mimetype] || 'bin';

export const hashDe = buffer => crypto.createHash('sha256').update(buffer).digest('hex');

export const idValido = id => mongoose.Types.ObjectId.isValid(String(id || ''));

/**
 * Reserva um comprovante solto para um pedido/pagamento. É atómico: se dois
 * pedidos tentarem usar o mesmo comprovante, só um consegue.
 * @returns {Promise<object|null>} o comprovante (sem os bytes) ou null
 */
export const vincularComprovante = async ({ comprovanteId, usuario, finalidade }) => {
  if (!idValido(comprovanteId)) return null;
  // O filtro `vinculado: false` faz a reserva: só um updateOne consegue alterar
  const r = await Comprovante.updateOne(
    { _id: comprovanteId, userId: usuario, finalidade, vinculado: false },
    { $set: { vinculado: true } },
  );
  if (r.modifiedCount !== 1) return null;
  return Comprovante.findById(comprovanteId);
};

/** Grava a que pedido/pagamento o comprovante ficou associado. */
export const referenciarComprovante = (comprovanteId, tipo, id) =>
  Comprovante.updateOne({ _id: comprovanteId }, { $set: { referencia: { tipo, id } } });

/** Desfaz a reserva (quando a criação do pedido/pagamento falha a seguir). */
export const libertarComprovante = comprovanteId =>
  Comprovante.updateOne(
    { _id: comprovanteId },
    { $set: { vinculado: false }, $unset: { referencia: 1 } },
  );

/**
 * Lê o comprovante no formato de anexo do lib/mailer.js.
 * @returns {Promise<Array<{filename:string, content:Buffer}>>} lista (vazia se não existir)
 */
export const anexoDoComprovante = async (comprovanteId, nomeBase = 'comprovante-pix') => {
  if (!idValido(comprovanteId)) return [];
  const doc = await Comprovante.findById(comprovanteId).select('+dados');
  if (!doc?.dados) return [];
  return [
    {
      filename: `${nomeBase}.${extensaoDe(doc.mimetype)}`,
      content: Buffer.from(doc.dados),
    },
  ];
};
