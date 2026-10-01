// pages/api/pedidos/sinal.js - PIX DO SINAL (PRÉ-VISUALIZAÇÃO DO CHECKOUT)
// ===================================
// POST { grupos: [{ fornecedorId, itens: [{ produtoId, quantidade, ... }], txid? }] }
// Para cada fornecedor do carrinho devolve os totais calculados no servidor,
// o valor do sinal e o Pix Copia e Cola + QR Code para a chave do fornecedor.
// Não grava nada: o pedido só nasce em /api/pedidos/criar, com o comprovante.

import mongoose from 'mongoose';
import dbConnect from '../../../lib/mongodb';
import Fornecedor from '../../../models/Fornecedor';
import Pedido from '../../../models/Pedido';
import { requireDistribuidor } from '../../../lib/auth';
import { montarPedido, ErroPedido } from '../../../lib/pedidos';
import { montarCobrancaPix, pixConfigurado, txidValido } from '../../../lib/pix';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const grupos = Array.isArray(req.body?.grupos) ? req.body.grupos : [];
  if (grupos.length === 0 || grupos.length > 30) {
    return res.status(400).json({ message: 'Carrinho vazio' });
  }

  try {
    await dbConnect();

    const resultado = [];
    for (const grupo of grupos) {
      const fornecedorId = String(grupo?.fornecedorId || '');
      const base = { fornecedorId };

      if (!mongoose.Types.ObjectId.isValid(fornecedorId)) {
        resultado.push({ ...base, erro: 'Fornecedor inválido' });
        continue;
      }
      const fornecedor = await Fornecedor.findById(fornecedorId).lean();
      if (!fornecedor || fornecedor.ativo === false) {
        resultado.push({
          ...base,
          erro: 'Este fornecedor já não está disponível. Remova os produtos dele do carrinho.',
        });
        continue;
      }
      base.nome = fornecedor.nome;

      try {
        const { valores, sinal, precosAlterados } = await montarPedido({
          itens: grupo.itens,
          fornecedor,
        });

        const item = {
          ...base,
          valores,
          precosAlterados,
          sinal: { ...sinal, pixConfigurado: pixConfigurado(fornecedor.pix) },
          pix: null,
        };

        if (sinal.exigido && item.sinal.pixConfigurado) {
          // Mantém o mesmo código se a tela for recarregada, mas nunca reutiliza
          // o identificador de um pedido que já foi enviado
          const txidLivre =
            txidValido(grupo.txid) && !(await Pedido.exists({ 'sinal.txid': grupo.txid }));
          item.pix = await montarCobrancaPix({
            pix: fornecedor.pix,
            valor: sinal.valor,
            txid: txidLivre ? grupo.txid : undefined,
            prefixo: 'SN',
          });
        }
        resultado.push(item);
      } catch (error) {
        if (!(error instanceof ErroPedido)) throw error;
        resultado.push({ ...base, erro: error.message });
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ success: true, grupos: resultado });
  } catch (error) {
    console.error('❌ Erro ao calcular sinal:', error);
    return res.status(500).json({ message: 'Erro ao calcular o sinal. Tente novamente.' });
  }
}

export default requireDistribuidor(handler);
