// lib/sinal.js - PAGAMENTOS PIX DO SINAL (ACESSO AO BANCO)
// ===================================
// O sinal (ex.: 40% do valor do fornecedor) pode ser pago em partes: 30% no
// checkout, 10% na semana seguinte, etc. Cada parte é um elemento de
// `pedido.sinal.pagamentos`, com o seu comprovante, e o admin confere cada
// um. As contas puras (em aberto, estado agregado) estão em lib/financeiro.js.

import mongoose from 'mongoose';
import Pedido from '../models/Pedido';
import { arred, sinalEmAberto, statusSinalCalculado } from './financeiro';

export class ErroSinal extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Pedidos anteriores aos pagamentos parciais guardavam o único Pix em
 * `sinal.txid`/`comprovanteId`. Converte para `pagamentos[0]` (em memória;
 * quem chama grava). Devolve true se mudou alguma coisa.
 */
export const migrarSinalLegado = pedido => {
  const s = pedido.sinal;
  if (!s || (Array.isArray(s.pagamentos) && s.pagamentos.length > 0)) return false;
  if (!s.comprovanteId || !['em_analise', 'confirmado', 'rejeitado'].includes(s.status)) {
    return false;
  }
  s.pagamentos = [
    {
      valor: s.valor,
      txid: s.txid,
      chavePix: s.chavePix,
      comprovanteId: s.comprovanteId,
      status: s.status,
      enviadoEm: s.enviadoEm || pedido.createdAt,
      conferidoEm: s.conferidoEm,
      conferidoPor: s.conferidoPor,
      motivoRejeicao: s.motivoRejeicao,
    },
  ];
  s.txid = undefined;
  s.comprovanteId = undefined;
  s.enviadoEm = undefined;
  s.conferidoEm = undefined;
  s.conferidoPor = undefined;
  s.motivoRejeicao = undefined;
  return true;
};

/** Recalcula o estado agregado do sinal (chamar depois de mexer em pagamentos). */
export const atualizarStatusSinal = pedido => {
  pedido.sinal.status = statusSinalCalculado(pedido);
  return pedido.sinal.status;
};

/**
 * Regista um pagamento Pix do sinal (em conferência).
 * @param {object} p
 * @param {object} p.pedido        documento Mongoose
 * @param {number} p.valor         valor pago (≤ em aberto)
 * @param {string} p.txid          identificador do Pix
 * @param {string} p.chavePix
 * @param {import('mongoose').Types.ObjectId} p.comprovanteId  comprovante já reservado
 * @returns {Promise<{pagamento:object, duplicado:boolean}>}
 */
export const registrarPagamentoSinal = async ({ pedido, valor, txid, chavePix, comprovanteId }) => {
  migrarSinalLegado(pedido);

  // Envio repetido do mesmo Pix (duplo clique): devolve o que já existe
  const existente = (pedido.sinal.pagamentos || []).find(p => p.txid === txid);
  if (existente) return { pagamento: existente, duplicado: true };

  const v = arred(valor);
  const emAberto = sinalEmAberto(pedido);
  if (!(v >= 0.01)) throw new ErroSinal('Informe o valor pago');
  if (emAberto < 0.01) throw new ErroSinal('O sinal deste pedido já está pago', 409);
  if (v > emAberto + 0.004) {
    throw new ErroSinal(
      `O valor é maior do que o sinal em aberto (R$ ${emAberto.toFixed(2)}). Gere o Pix de novo.`,
      409,
    );
  }

  pedido.sinal.pagamentos.push({
    valor: v,
    txid,
    chavePix,
    comprovanteId,
    status: 'em_analise',
    enviadoEm: new Date(),
  });
  pedido.sinal.chavePix = chavePix || pedido.sinal.chavePix;
  atualizarStatusSinal(pedido);
  await pedido.save();

  return { pagamento: pedido.sinal.pagamentos[pedido.sinal.pagamentos.length - 1], duplicado: false };
};

/**
 * Admin confirma ou rejeita UM pagamento do sinal.
 * @param {object} p
 * @param {string} p.pedidoId
 * @param {string} p.pagamentoId  _id do pagamento ('legado' = o Pix antigo)
 * @param {'confirmar'|'rejeitar'} p.acao
 * @param {string} p.motivo
 * @param {string} p.admin        usuário do admin
 * @returns {Promise<{pedido:object, pagamento:object}>}
 */
export const conferirPagamentoSinal = async ({ pedidoId, pagamentoId, acao, motivo, admin }) => {
  const pedido = await Pedido.findById(pedidoId);
  if (!pedido) throw new ErroSinal('Pedido não encontrado', 404);

  migrarSinalLegado(pedido);
  const pagamentos = pedido.sinal.pagamentos || [];

  const pagamento =
    pagamentoId === 'legado'
      ? pagamentos[0]
      : pagamentos.find(p => String(p._id) === String(pagamentoId));
  if (!pagamento) throw new ErroSinal('Pagamento do sinal não encontrado', 404);

  const novoStatus = acao === 'confirmar' ? 'confirmado' : 'rejeitado';
  if (pagamento.status === novoStatus) {
    throw new ErroSinal(`Este pagamento já está ${novoStatus}`, 409);
  }

  pagamento.status = novoStatus;
  pagamento.conferidoEm = new Date();
  pagamento.conferidoPor = admin;
  pagamento.motivoRejeicao = acao === 'rejeitar' ? motivo : '';
  atualizarStatusSinal(pedido);
  await pedido.save();

  return { pedido, pagamento };
};

export const idPagamentoValido = id =>
  id === 'legado' || mongoose.Types.ObjectId.isValid(String(id || ''));
