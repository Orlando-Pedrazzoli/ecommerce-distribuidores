// lib/statusPedido.js - STATUS DO PEDIDO (PENDENTE / CONFIRMADO)
// ===================================
// O portal trabalha só com dois status. Pedidos antigos gravados como
// "enviado" ou "entregue" são tratados como confirmados.
// Funções puras: podem ser usadas nas páginas e nas API routes.

export const STATUS_PEDIDO_VALIDOS = ['pendente', 'confirmado'];

// Valores antigos que ainda podem existir no banco
const STATUS_ANTIGOS_CONFIRMADOS = ['enviado', 'entregue'];

export const STATUS_PEDIDO_INFO = {
  pendente: { label: 'Pendente', icone: '⏳' },
  confirmado: { label: 'Confirmado', icone: '✅' },
};

/** 'enviado' | 'entregue' (antigos) -> 'confirmado'; o resto fica como está. */
export const normalizarStatus = status =>
  STATUS_ANTIGOS_CONFIRMADOS.includes(status) ? 'confirmado' : status || 'pendente';

/** Filtro do MongoDB para um status (inclui os valores antigos em "confirmado"). */
export const filtroStatus = status =>
  status === 'confirmado' ? { $in: ['confirmado', ...STATUS_ANTIGOS_CONFIRMADOS] } : status;
