// lib/financeiro.js - REGRAS FINANCEIRAS (SINAL E ROYALTIES)
// ===================================
// Funções puras, sem acesso ao banco: podem ser usadas nas API routes e nas
// páginas. Todas as contas são feitas em centavos para não acumular erros
// de vírgula flutuante.

export const PERCENTUAL_SINAL_PADRAO = 40;

export const centavos = valor => Math.round((Number(valor) || 0) * 100);
export const arred = valor => centavos(valor) / 100;

// ══════════════════════════════════════════════════════════════
// SINAL (ENTRADA PAGA AO FORNECEDOR - NO CHECKOUT OU DEPOIS)
// ══════════════════════════════════════════════════════════════

/** Percentual de sinal do fornecedor. Sem valor gravado vale o padrão (40%). */
export const percentualSinalDe = fornecedor => {
  const p = fornecedor?.percentualSinal;
  if (p === undefined || p === null || p === '' || Number.isNaN(Number(p))) {
    return PERCENTUAL_SINAL_PADRAO;
  }
  return Math.min(100, Math.max(0, Number(p)));
};

/** O sinal incide sobre o valor que vai para o fornecedor (preço base). */
export const calcularSinal = (totalFornecedor, percentual) =>
  Math.round((centavos(totalFornecedor) * (Number(percentual) || 0)) / 100) / 100;

export const STATUS_SINAL = {
  nao_aplicavel: { label: 'Sem sinal', cor: 'gray' },
  pendente: { label: 'Sinal a pagar', cor: 'blue' },
  em_analise: { label: 'Sinal em conferência', cor: 'orange' },
  parcial: { label: 'Sinal pago em parte', cor: 'blue' },
  confirmado: { label: 'Sinal confirmado', cor: 'green' },
  rejeitado: { label: 'Sinal rejeitado', cor: 'red' },
};

/**
 * Pagamentos Pix do sinal de um pedido. Pedidos anteriores aos pagamentos
 * parciais guardavam um único Pix nos campos `sinal.txid`/`comprovanteId`:
 * aqui aparecem como um pagamento com `_id: 'legado'` (lib/sinal.js converte
 * de vez na primeira alteração).
 */
export const pagamentosSinal = pedido => {
  const sinal = pedido?.sinal;
  if (!sinal) return [];
  if (Array.isArray(sinal.pagamentos) && sinal.pagamentos.length > 0) return sinal.pagamentos;
  if (sinal.comprovanteId && ['em_analise', 'confirmado', 'rejeitado'].includes(sinal.status)) {
    return [
      {
        _id: 'legado',
        valor: sinal.valor,
        txid: sinal.txid,
        chavePix: sinal.chavePix,
        comprovanteId: sinal.comprovanteId,
        status: sinal.status,
        enviadoEm: sinal.enviadoEm,
        conferidoEm: sinal.conferidoEm,
        conferidoPor: sinal.conferidoPor,
        motivoRejeicao: sinal.motivoRejeicao,
      },
    ];
  }
  return [];
};

const somaPagamentos = (pedido, status) =>
  pagamentosSinal(pedido)
    .filter(p => p.status === status)
    .reduce((s, p) => s + centavos(p.valor), 0) / 100;

/** Valor do sinal já confirmado pelo admin. */
export const sinalConfirmado = pedido => somaPagamentos(pedido, 'confirmado');

/** Valor do sinal declarado (com comprovante) à espera de conferência. */
export const sinalEmConferencia = pedido => somaPagamentos(pedido, 'em_analise');

/**
 * Quanto do sinal ainda falta pagar. Pagamentos em conferência já contam
 * como pagos (tal como nos royalties); rejeitados voltam ao em aberto.
 */
export const sinalEmAberto = pedido => {
  const total = centavos(pedido?.sinal?.valor);
  if (total <= 0) return 0;
  const falta =
    total - centavos(sinalConfirmado(pedido)) - centavos(sinalEmConferencia(pedido));
  return falta > 0 ? falta / 100 : 0;
};

/** O distribuidor pode (voltar a) pagar o sinal deste pedido? */
export const sinalPodePagar = pedido =>
  (pedido?.sinal?.valor || 0) > 0 && sinalEmAberto(pedido) >= 0.01;

/** Estado agregado do sinal a partir dos pagamentos (ver models/Pedido.js). */
export const statusSinalCalculado = pedido => {
  const total = centavos(pedido?.sinal?.valor);
  if (total <= 0) return 'nao_aplicavel';
  const pagamentos = pagamentosSinal(pedido);
  if (pagamentos.some(p => p.status === 'em_analise')) return 'em_analise';
  const pago = centavos(sinalConfirmado(pedido));
  if (pago >= total) return 'confirmado';
  if (pago > 0) return 'parcial';
  if (pagamentos.length > 0) return 'rejeitado';
  return 'pendente';
};

/** Resumo do sinal para as telas e emails. */
export const resumoSinal = pedido => ({
  total: arred(pedido?.sinal?.valor),
  percentual: pedido?.sinal?.percentual || 0,
  confirmado: sinalConfirmado(pedido),
  emConferencia: sinalEmConferencia(pedido),
  emAberto: sinalEmAberto(pedido),
  status: statusSinalCalculado(pedido),
  pagamentos: pagamentosSinal(pedido),
});

export const STATUS_PAGAMENTO_PIX = {
  em_analise: { label: 'Em conferência', cor: 'orange' },
  confirmado: { label: 'Confirmado', cor: 'green' },
  rejeitado: { label: 'Rejeitado', cor: 'red' },
};

// ══════════════════════════════════════════════════════════════
// ROYALTIES
// ══════════════════════════════════════════════════════════════

/** Quanto do royalty deste pedido já foi abatido por pagamentos Pix. */
export const royaltiesAbatidos = pedido =>
  arred(pedido?.controleFinanceiro?.royalties?.valorPago || 0);

/** Quanto falta pagar de royalties neste pedido. */
export const royaltiesEmAberto = pedido => {
  if (pedido?.controleFinanceiro?.royalties?.status === 'pago') return 0;
  const falta = centavos(pedido?.royalties) - centavos(royaltiesAbatidos(pedido));
  return falta > 0 ? falta / 100 : 0;
};

/** Soma dos royalties em aberto de uma lista de pedidos. */
export const totalRoyaltiesEmAberto = pedidos =>
  (pedidos || []).reduce((soma, p) => soma + centavos(royaltiesEmAberto(p)), 0) / 100;

/**
 * Distribui um pagamento pelos pedidos com royalties em aberto, do mais
 * antigo para o mais recente.
 * @param {Array}  pedidos pedidos do distribuidor (qualquer ordem)
 * @param {number} valor   valor pago
 * @returns {{ alocacoes: Array<{pedidoId:string, valor:number, quitou:boolean}>, sobra:number }}
 */
export const alocarRoyalties = (pedidos, valor) => {
  let resto = centavos(valor);
  const alocacoes = [];

  const ordenados = [...(pedidos || [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  for (const pedido of ordenados) {
    if (resto <= 0) break;
    const emAberto = centavos(royaltiesEmAberto(pedido));
    if (emAberto <= 0) continue;
    const usar = Math.min(emAberto, resto);
    alocacoes.push({
      pedidoId: String(pedido._id),
      valor: usar / 100,
      quitou: usar === emAberto,
    });
    resto -= usar;
  }

  return { alocacoes, sobra: resto / 100 };
};

/**
 * Expressão de agregação do MongoDB equivalente a royaltiesEmAberto(),
 * para os $group das dashboards.
 */
export const EXPR_ROYALTIES_EM_ABERTO = {
  $cond: [
    { $eq: ['$controleFinanceiro.royalties.status', 'pago'] },
    0,
    {
      $max: [
        0,
        {
          $subtract: [
            { $ifNull: ['$royalties', 0] },
            { $ifNull: ['$controleFinanceiro.royalties.valorPago', 0] },
          ],
        },
      ],
    },
  ],
};

// ══════════════════════════════════════════════════════════════
// FORMATAÇÃO / ENTRADA DE VALORES
// ══════════════════════════════════════════════════════════════
export const formatarMoeda = valor =>
  `R$ ${(Number(valor) || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** "1.234,56" | "1234.56" | "1234,5" -> 1234.56 (NaN se não for um valor) */
export const parsearValor = texto => {
  let s = String(texto ?? '')
    .replace(/[R$\s]/g, '')
    .trim();
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  return arred(parseFloat(s));
};
