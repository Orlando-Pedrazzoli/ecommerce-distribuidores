// lib/rateLimit.js - RATE LIMIT EM MEMÓRIA (JANELA FIXA)
// ===================================
// Primeira barreira contra brute force / abuso de envio de email.
// Em serverless (Vercel) cada instância tem a sua memória, por isso este
// limite é "best effort". A proteção definitiva por conta (bloqueio após
// N tentativas) fica no banco, em lib/auth.js.

const buckets = new Map();
const LIMPEZA_INTERVALO_MS = 60 * 1000;
let ultimaLimpeza = Date.now();

const limparExpirados = agora => {
  if (agora - ultimaLimpeza < LIMPEZA_INTERVALO_MS) return;
  ultimaLimpeza = agora;
  for (const [chave, bucket] of buckets) {
    if (bucket.reset <= agora) buckets.delete(chave);
  }
};

/**
 * @param {string} chave    identificador (ex.: `login:ip:1.2.3.4`)
 * @param {number} limite   máximo de chamadas por janela
 * @param {number} janelaMs tamanho da janela em ms
 * @returns {{ ok: boolean, restante: number, retryAfterSeg: number }}
 */
export const rateLimit = (chave, limite, janelaMs) => {
  const agora = Date.now();
  limparExpirados(agora);

  let bucket = buckets.get(chave);
  if (!bucket || bucket.reset <= agora) {
    bucket = { count: 0, reset: agora + janelaMs };
    buckets.set(chave, bucket);
  }

  bucket.count += 1;
  const ok = bucket.count <= limite;

  return {
    ok,
    restante: Math.max(0, limite - bucket.count),
    retryAfterSeg: Math.ceil((bucket.reset - agora) / 1000),
  };
};

/** Helper para responder 429 de forma consistente */
export const responder429 = (res, resultado, mensagem) => {
  res.setHeader('Retry-After', String(resultado.retryAfterSeg));
  return res.status(429).json({
    success: false,
    message:
      mensagem ||
      `Muitas tentativas. Tente novamente em ${resultado.retryAfterSeg}s.`,
    retryAfter: resultado.retryAfterSeg,
  });
};
