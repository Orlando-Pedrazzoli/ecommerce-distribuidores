// lib/pagamentos.js - BAIXA DE ROYALTIES POR PIX (ACESSO AO BANCO)
// ===================================
// Regista um pagamento declarado pelo distribuidor, abate os royalties dos
// pedidos mais antigos e sabe desfazer tudo quando o admin rejeita.
// As contas puras estão em lib/financeiro.js.

import Pedido from '../models/Pedido';
import Pagamento from '../models/Pagamento';
import { arred, alocarRoyalties, royaltiesEmAberto, totalRoyaltiesEmAberto } from './financeiro';

const CAMPO = 'controleFinanceiro.royalties';

/** Pedidos do distribuidor que ainda têm royalties por pagar (objetos simples). */
export const pedidosComRoyaltiesEmAberto = async usuario => {
  const pedidos = await Pedido.find({
    userId: usuario,
    [`${CAMPO}.status`]: { $ne: 'pago' },
  })
    .select('royalties controleFinanceiro createdAt')
    .sort({ createdAt: 1 })
    .lean();
  return pedidos.filter(p => royaltiesEmAberto(p) > 0);
};

/** Total de royalties em aberto do distribuidor. */
export const saldoRoyalties = async usuario =>
  totalRoyaltiesEmAberto(await pedidosComRoyaltiesEmAberto(usuario));

// Aplica (sinal = +1) ou desfaz (sinal = -1) uma alocação num pedido
const aplicarAlocacao = async (alocacao, sinal, agora) => {
  await Pedido.updateOne(
    { _id: alocacao.pedidoId },
    { $inc: { [`${CAMPO}.valorPago`]: sinal * alocacao.valor } },
  );

  if (!alocacao.quitou) return;

  await Pedido.updateOne(
    { _id: alocacao.pedidoId },
    sinal > 0
      ? {
          $set: {
            [`${CAMPO}.status`]: 'pago',
            [`${CAMPO}.dataPagamento`]: agora,
            [`${CAMPO}.observacao`]: 'Pago por Pix pelo distribuidor',
          },
        }
      : {
          $set: {
            [`${CAMPO}.status`]: 'pendente',
            [`${CAMPO}.dataPagamento`]: null,
            [`${CAMPO}.observacao`]: 'Pagamento Pix rejeitado',
          },
        },
  );
};

/**
 * Regista o pagamento e dá baixa nos pedidos (mais antigos primeiro).
 * O valor nunca pode ser maior do que o total em aberto.
 * @returns {Promise<{pagamento: object, saldoDepois: number}>}
 * @throws {Error & {status:number}} quando o valor não é aceite
 */
export const registrarPagamentoRoyalties = async ({
  usuario,
  nome,
  valor,
  txid,
  comprovanteId,
  chavePix,
}) => {
  const pedidos = await pedidosComRoyaltiesEmAberto(usuario);
  const saldoAntes = totalRoyaltiesEmAberto(pedidos);
  const valorPago = arred(valor);

  const erro = (mensagem, status = 400) => Object.assign(new Error(mensagem), { status });

  if (saldoAntes <= 0) throw erro('Não há royalties em aberto para pagar', 409);
  if (!(valorPago >= 0.01)) throw erro('Informe um valor válido');
  if (valorPago > saldoAntes) {
    throw erro('O valor é maior do que o total de royalties em aberto', 409);
  }

  const { alocacoes } = alocarRoyalties(pedidos, valorPago);
  const saldoDepois = arred(saldoAntes - valorPago);

  const pagamento = await Pagamento.create({
    userId: usuario,
    userNome: nome || '',
    tipo: 'royalties',
    valor: valorPago,
    txid,
    chavePix: chavePix || '',
    comprovanteId,
    status: 'em_analise',
    alocacoes,
    saldoAntes,
    saldoDepois,
  });

  // Dá baixa pedido a pedido; se algo falhar a meio, desfaz o que já foi feito
  const agora = new Date();
  const aplicadas = [];
  try {
    for (const alocacao of alocacoes) {
      await aplicarAlocacao(alocacao, +1, agora);
      aplicadas.push(alocacao);
    }
  } catch (error) {
    for (const alocacao of aplicadas) {
      await aplicarAlocacao(alocacao, -1, agora).catch(() => {});
    }
    await Pagamento.deleteOne({ _id: pagamento._id }).catch(() => {});
    throw error;
  }

  return { pagamento, saldoDepois };
};

/** Desfaz a baixa de um pagamento (usado quando o admin rejeita). */
export const reverterPagamento = async pagamento => {
  const agora = new Date();
  for (const alocacao of pagamento.alocacoes || []) {
    await aplicarAlocacao(
      { pedidoId: alocacao.pedidoId, valor: alocacao.valor, quitou: alocacao.quitou },
      -1,
      agora,
    );
  }
};
