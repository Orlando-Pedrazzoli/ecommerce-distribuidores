// pages/api/user/dashboard.js - DADOS AGREGADOS DA DASHBOARD DO DISTRIBUIDOR
// ===================================
// Uma única chamada com tudo o que /dashboard precisa: resumo de pedidos,
// pendências financeiras, pedidos recentes, fornecedores ativos e o que
// requer atenção (em trânsito, pagamentos em aberto).

import dbConnect from '../../../lib/mongodb';
import Pedido from '../../../models/Pedido';
import Fornecedor from '../../../models/Fornecedor';
import Produto from '../../../models/Produto';
import { requireDistribuidor } from '../../../lib/auth';
import { fornecedorPublico } from '../../../lib/fornecedores';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    await dbConnect();
    const userId = req.user.usuario;
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

    const [porStatus, mesAgg, financeiro, recentes, fornecedores, contagemProdutos, porFornecedor] =
      await Promise.all([
        Pedido.aggregate([
          { $match: { userId } },
          { $group: { _id: '$status', total: { $sum: 1 }, valor: { $sum: '$total' } } },
        ]),
        Pedido.aggregate([
          { $match: { userId, createdAt: { $gte: inicioMes } } },
          { $group: { _id: null, total: { $sum: 1 }, valor: { $sum: '$total' } } },
        ]),
        Pedido.aggregate([
          { $match: { userId } },
          {
            $group: {
              _id: null,
              royaltiesPendentes: {
                $sum: {
                  $cond: [
                    { $ne: ['$controleFinanceiro.royalties.status', 'pago'] },
                    '$royalties',
                    0,
                  ],
                },
              },
              etiquetasPendentes: {
                $sum: {
                  $cond: [
                    { $ne: ['$controleFinanceiro.etiquetas.status', 'pago'] },
                    '$totalEtiquetas',
                    0,
                  ],
                },
              },
              embalagensPendentes: {
                $sum: {
                  $cond: [
                    { $ne: ['$controleFinanceiro.embalagens.status', 'pago'] },
                    '$totalEmbalagens',
                    0,
                  ],
                },
              },
              pedidosComPendencia: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $ne: ['$controleFinanceiro.royalties.status', 'pago'] },
                        { $ne: ['$controleFinanceiro.etiquetas.status', 'pago'] },
                        { $ne: ['$controleFinanceiro.embalagens.status', 'pago'] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ]),
        Pedido.find({ userId })
          .populate('fornecedorId', 'nome codigo cor logo')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        Fornecedor.find({ ativo: true }).sort({ ordem: 1, nome: 1 }).lean(),
        Produto.aggregate([
          { $match: { ativo: true } },
          { $group: { _id: '$fornecedorId', total: { $sum: 1 } } },
        ]),
        Pedido.aggregate([
          { $match: { userId } },
          { $group: { _id: '$fornecedorId', total: { $sum: 1 }, ultimo: { $max: '$createdAt' } } },
        ]),
      ]);

    const status = { pendente: 0, confirmado: 0, enviado: 0, entregue: 0 };
    let totalPedidos = 0;
    let valorTotal = 0;
    porStatus.forEach(s => {
      status[s._id] = s.total;
      totalPedidos += s.total;
      valorTotal += s.valor;
    });

    const fin = financeiro[0] || {
      royaltiesPendentes: 0,
      etiquetasPendentes: 0,
      embalagensPendentes: 0,
      pedidosComPendencia: 0,
    };
    const totalPendente =
      (fin.royaltiesPendentes || 0) +
      (fin.etiquetasPendentes || 0) +
      (fin.embalagensPendentes || 0);

    const mapaProd = Object.fromEntries(contagemProdutos.map(c => [String(c._id), c.total]));
    const mapaPed = Object.fromEntries(porFornecedor.map(p => [String(p._id), p]));

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      geradoEm: agora,
      pedidos: {
        total: totalPedidos,
        valorTotal,
        status,
        emAndamento: status.pendente + status.confirmado + status.enviado,
        mes: mesAgg[0] || { total: 0, valor: 0 },
      },
      financeiro: {
        royaltiesPendentes: fin.royaltiesPendentes || 0,
        etiquetasPendentes: fin.etiquetasPendentes || 0,
        embalagensPendentes: fin.embalagensPendentes || 0,
        totalPendente,
        pedidosComPendencia: fin.pedidosComPendencia || 0,
      },
      recentes: recentes.map(p => ({
        _id: p._id,
        numero: String(p._id).slice(-8).toUpperCase(),
        fornecedor: p.fornecedorId
          ? {
              nome: p.fornecedorId.nome,
              codigo: p.fornecedorId.codigo,
              cor: p.fornecedorId.cor,
              logo: p.fornecedorId.logo,
            }
          : null,
        status: p.status,
        total: p.total,
        itens: (p.itens || []).reduce((s, i) => s + (i.quantidade || 0), 0),
        codigoRastreamento: p.codigoRastreamento || '',
        createdAt: p.createdAt,
      })),
      fornecedores: fornecedores.map(f => ({
        ...fornecedorPublico(f),
        totalProdutos: mapaProd[String(f._id)] || 0,
        meusPedidos: mapaPed[String(f._id)]?.total || 0,
        ultimoPedido: mapaPed[String(f._id)]?.ultimo || null,
      })),
    });
  } catch (error) {
    console.error('❌ Erro na dashboard do distribuidor:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

export default requireDistribuidor(handler);
