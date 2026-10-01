// lib/pedidos.js - CÁLCULO DE UM PEDIDO NO SERVIDOR
// ===================================
// Usado por /api/pedidos/sinal (pré-visualização do Pix) e por
// /api/pedidos/criar. Os preços vêm SEMPRE do cadastro de produtos: o que o
// navegador envia só serve para saber quais produtos e quantidades. Assim o
// valor do sinal mostrado no Pix é exatamente o que fica gravado no pedido.

import mongoose from 'mongoose';
import Produto from '../models/Produto';
import { arred, percentualSinalDe, calcularSinal } from './financeiro';

const ROYALTY_RATE = parseFloat(process.env.ROYALTY_PERCENTAGE) || 0.05;

export class ErroPedido extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * @param {object} p
 * @param {Array}  p.itens      [{ produtoId, quantidade, precoUnitario? ... }]
 * @param {object} p.fornecedor documento (ou lean) do fornecedor
 * @returns {Promise<{itens:Array, valores:object, sinal:{percentual:number,valor:number,exigido:boolean}, precosAlterados:boolean}>}
 */
export const montarPedido = async ({ itens, fornecedor }) => {
  if (!Array.isArray(itens) || itens.length === 0) {
    throw new ErroPedido('O pedido não tem itens');
  }

  const quantidades = new Map();
  for (const item of itens) {
    const id = String(item?.produtoId?._id || item?.produtoId || '');
    const qtd = Number(item?.quantidade);
    if (!mongoose.Types.ObjectId.isValid(id)) throw new ErroPedido('Produto inválido no pedido');
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > 100000) {
      throw new ErroPedido('Quantidade inválida no pedido');
    }
    quantidades.set(id, (quantidades.get(id) || 0) + qtd);
  }

  const produtos = await Produto.find({ _id: { $in: [...quantidades.keys()] } }).lean();
  const mapa = new Map(produtos.map(p => [String(p._id), p]));

  const categoriasIsentas = fornecedor.categoriasIsentasRoyalty || [];
  const enviados = new Map(
    itens.map(i => [String(i?.produtoId?._id || i?.produtoId || ''), i]),
  );

  let precosAlterados = false;
  const itensFinais = [];

  for (const [id, quantidade] of quantidades) {
    const produto = mapa.get(id);
    if (!produto || String(produto.fornecedorId) !== String(fornecedor._id)) {
      throw new ErroPedido(
        'Um dos produtos do carrinho já não existe. Remova-o do carrinho e tente novamente.',
        409,
      );
    }
    if (produto.ativo === false) {
      throw new ErroPedido(
        `O produto "${produto.nome}" já não está disponível. Remova-o do carrinho e tente novamente.`,
        409,
      );
    }

    const item = {
      produtoId: produto._id,
      codigo: produto.codigo,
      nome: produto.nome,
      categoria: produto.categoria || 'Sem categoria',
      // Foto principal (1.ª do array novo; campo antigo como alternativa)
      imagem: (Array.isArray(produto.imagens) && produto.imagens[0]) || produto.imagem || '',
      quantidade,
      precoUnitario: Number(produto.preco) || 0,
    };

    const enviado = enviados.get(id) || {};
    if (
      enviado.precoUnitario !== undefined &&
      arred(enviado.precoUnitario) !== arred(item.precoUnitario)
    ) {
      precosAlterados = true;
    }

    itensFinais.push(item);
  }

  const soma = fn => arred(itensFinais.reduce((acc, i) => acc + fn(i), 0));

  const subtotal = soma(i => i.quantidade * i.precoUnitario);
  const subtotalComRoyalty = soma(i =>
    categoriasIsentas.includes(i.categoria) ? 0 : i.quantidade * i.precoUnitario,
  );
  const royalties = arred(subtotalComRoyalty * ROYALTY_RATE);
  const totalFornecedor = subtotal;
  const total = arred(subtotal + royalties);

  const percentual = percentualSinalDe(fornecedor);
  const valorSinal = calcularSinal(totalFornecedor, percentual);

  return {
    itens: itensFinais,
    valores: {
      subtotal,
      subtotalComRoyalty,
      subtotalIsento: arred(subtotal - subtotalComRoyalty),
      royalties,
      royaltyRate: ROYALTY_RATE,
      totalFornecedor,
      total,
    },
    sinal: {
      percentual,
      valor: valorSinal,
      exigido: percentual > 0 && valorSinal >= 0.01,
      saldo: arred(totalFornecedor - valorSinal),
    },
    precosAlterados,
  };
};
