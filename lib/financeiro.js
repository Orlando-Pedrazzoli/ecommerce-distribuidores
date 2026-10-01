// lib/financeiro.js - REGRAS FINANCEIRAS (SINAL E ROYALTIES)
// ===================================
// Funções puras, sem acesso ao banco: podem ser usadas nas API routes e nas
// páginas. Todas as contas são feitas em centavos para não acumular erros
// de vírgula flutuante.

export const PERCENTUAL_SINAL_PADRAO = 40;

export const centavos = valor => Math.round((Number(valor) || 0) * 100);
export const arred = valor => centavos(valor) / 100;

// ══════════════════════════════════════════════════════════════
// SINAL (ENTRADA PAGA AO FORNECEDOR NO CHECKOUT)
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
  em_analise: { label: 'Sinal em conferência', cor: 'orange' },
  confirmado: { label: 'Sinal confirmado', cor: 'green' },
  rejeitado: { label: 'Sinal rejeitado', cor: 'red' },
};

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
