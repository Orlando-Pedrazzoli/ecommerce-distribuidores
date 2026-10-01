// pages/api/user/pagamentos.js - PAGAMENTOS DO DISTRIBUIDOR
// ===================================
// GET  -> pedidos com o estado financeiro, resumo (royalties em aberto já
//         descontam as baixas parciais) e histórico de pagamentos Pix.
// POST { valor, txid, comprovanteId } -> regista um Pix de royalties e dá
//         baixa nos pedidos mais antigos. Fica "em conferência" até o admin
//         confirmar; se for rejeitado, a dívida volta.

import dbConnect from '../../../lib/mongodb';
import Pedido from '../../../models/Pedido';
import Pagamento from '../../../models/Pagamento';
import Fornecedor from '../../../models/Fornecedor'; // ← NECESSÁRIO para populate
import { requireDistribuidor } from '../../../lib/auth';
import { obterConfiguracao } from '../../../models/Configuracao';
import { pixConfigurado, txidValido } from '../../../lib/pix';
import { arred, royaltiesEmAberto } from '../../../lib/financeiro';
import { registrarPagamentoRoyalties, saldoRoyalties } from '../../../lib/pagamentos';
import {
  vincularComprovante,
  referenciarComprovante,
  libertarComprovante,
  anexoDoComprovante,
} from '../../../lib/comprovantes';
import { enviarPagamentoDeclarado } from '../../../lib/pagamentoEmails';

const pagamentoPublico = p => ({
  _id: p._id,
  valor: p.valor,
  status: p.status,
  txid: p.txid,
  comprovanteId: p.comprovanteId,
  alocacoes: (p.alocacoes || []).map(a => ({
    pedidoId: a.pedidoId,
    numero: String(a.pedidoId).slice(-8).toUpperCase(),
    valor: a.valor,
    quitou: a.quitou,
  })),
  saldoAntes: p.saldoAntes,
  saldoDepois: p.saldoDepois,
  motivoRejeicao: p.motivoRejeicao || '',
  conferidoEm: p.conferidoEm || null,
  createdAt: p.createdAt,
});

async function listar(req, res) {
  const usuario = req.user.usuario;

  const [pedidosDocs, pagamentos, config] = await Promise.all([
    Pedido.find({ userId: usuario }).populate('fornecedorId', 'nome codigo').sort({ createdAt: -1 }),
    Pagamento.find({ userId: usuario }).sort({ createdAt: -1 }).limit(100).lean(),
    obterConfiguracao(),
  ]);

  let totalPedidos = 0;
  let royaltiesPendentes = 0;
  let royaltiesPagos = 0;
  let etiquetasPendentes = 0;
  let etiquetasPagas = 0;
  let embalagensPendentes = 0;
  let embalagensPagas = 0;

  const pedidos = pedidosDocs.map(doc => {
    const pedido = doc.toJSON();
    const cf = pedido.controleFinanceiro || {};
    const emAberto = royaltiesEmAberto(pedido);

    totalPedidos += pedido.total || 0;
    royaltiesPendentes += emAberto;
    royaltiesPagos += Math.max(0, (pedido.royalties || 0) - emAberto);

    if (cf.etiquetas?.status === 'pago') etiquetasPagas += pedido.totalEtiquetas || 0;
    else etiquetasPendentes += pedido.totalEtiquetas || 0;

    if (cf.embalagens?.status === 'pago') embalagensPagas += pedido.totalEmbalagens || 0;
    else embalagensPendentes += pedido.totalEmbalagens || 0;

    return { ...pedido, royaltiesEmAberto: emAberto };
  });

  royaltiesPendentes = arred(royaltiesPendentes);
  royaltiesPagos = arred(royaltiesPagos);

  const emConferencia = arred(
    pagamentos.filter(p => p.status === 'em_analise').reduce((s, p) => s + p.valor, 0),
  );

  return res.status(200).json({
    success: true,
    pedidos,
    pagamentos: pagamentos.map(pagamentoPublico),
    pixDisponivel: pixConfigurado(config.pixRoyalties),
    resumo: {
      totalPedidos,
      royaltiesPendentes,
      royaltiesPagos,
      royaltiesEmConferencia: emConferencia,
      etiquetasPendentes,
      etiquetasPagas,
      embalagensPendentes,
      embalagensPagas,
      totalPendente: arred(royaltiesPendentes + etiquetasPendentes + embalagensPendentes),
      totalPago: arred(royaltiesPagos + etiquetasPagas + embalagensPagas),
    },
    totalPedidos: pedidos.length,
  });
}

async function registrar(req, res) {
  const usuario = req.user.usuario;
  const txid = String(req.body?.txid || '');
  const valor = arred(req.body?.valor);

  if (!txidValido(txid)) {
    return res.status(400).json({ message: 'Gere o Pix antes de registrar o pagamento' });
  }
  if (!(valor >= 0.01)) {
    return res.status(400).json({ message: 'Informe o valor pago' });
  }
  if (!req.body?.comprovanteId) {
    return res.status(400).json({ message: 'Anexe o comprovante do Pix para dar baixa' });
  }

  // Envio repetido do mesmo Pix: devolve o que já está registrado
  const existente = await Pagamento.findOne({ txid, userId: usuario }).lean();
  if (existente) {
    return res.status(200).json({
      success: true,
      duplicado: true,
      message: 'Pagamento já registrado',
      pagamento: pagamentoPublico(existente),
      saldo: await saldoRoyalties(usuario),
    });
  }

  const config = await obterConfiguracao();
  if (!pixConfigurado(config.pixRoyalties)) {
    return res.status(409).json({
      message: 'O pagamento de royalties por Pix ainda não está disponível.',
    });
  }

  const comprovante = await vincularComprovante({
    comprovanteId: req.body.comprovanteId,
    usuario,
    finalidade: 'royalties',
  });
  if (!comprovante) {
    return res.status(409).json({
      message: 'Comprovante não encontrado ou já usado. Anexe o comprovante deste Pix.',
    });
  }

  let resultado;
  try {
    resultado = await registrarPagamentoRoyalties({
      usuario,
      nome: req.user.nome,
      valor,
      txid,
      comprovanteId: comprovante._id,
      chavePix: config.pixRoyalties.chave,
    });
  } catch (error) {
    await libertarComprovante(comprovante._id).catch(() => {});
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Este Pix já foi registrado' });
    }
    throw error;
  }

  const { pagamento, saldoDepois } = resultado;
  await referenciarComprovante(comprovante._id, 'Pagamento', pagamento._id);

  console.log(
    `💰 Pix de royalties: ${usuario} pagou ${pagamento.valor} ` +
      `(${pagamento.alocacoes.length} pedido(s), em aberto ${saldoDepois})`,
  );

  await enviarPagamentoDeclarado({
    pagamento,
    distribuidor: req.user,
    anexos: await anexoDoComprovante(comprovante._id, `comprovante-royalties-${pagamento.txid}`),
  });

  return res.status(201).json({
    success: true,
    message:
      saldoDepois > 0
        ? 'Pagamento registrado e valor abatido dos royalties em aberto.'
        : 'Pagamento registrado. Os royalties em aberto foram quitados.',
    pagamento: pagamentoPublico(pagamento.toObject()),
    saldo: saldoDepois,
  });
}

async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Autenticação garantida por requireDistribuidor (req.user)
    await dbConnect();
    return req.method === 'GET' ? await listar(req, res) : await registrar(req, res);
  } catch (error) {
    console.error('Erro em pagamentos:', error);
    return res.status(500).json({
      message: req.method === 'GET' ? 'Erro ao buscar pagamentos' : 'Erro ao registrar o pagamento',
    });
  }
}

export default requireDistribuidor(handler);
