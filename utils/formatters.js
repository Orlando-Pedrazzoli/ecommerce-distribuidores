// utils/formatters.js
// Funções de formatação de moeda

export const formatarMoeda = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '';
  return (parseFloat(valor) || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const parsearMoeda = (valor) => {
  if (!valor) return null;
  const num = parseFloat(valor.toString().replace(/\./g, '').replace(',', '.'));
  return isNaN(num) ? null : num;
};

export const calcularMargem = (produtoId, produtos, precos) => {
  const produto = produtos.find((p) => p._id === produtoId);
  if (!produto) return null;

  const preco = precos[produtoId];
  if (!preco || produto.custoTotal <= 0) return null;

  return ((preco - produto.custoTotal) / produto.custoTotal) * 100;
};

export const corMargem = (margem) => {
  if (margem === null) return 'text-gray-400';
  if (margem >= 30) return 'text-green-600';
  if (margem >= 15) return 'text-yellow-600';
  return 'text-red-600';
};

export const badgeMargem = (margem) => {
  if (margem === null) return null;
  if (margem >= 30) return '🟢';
  if (margem >= 15) return '🟡';
  return '🔴';
};