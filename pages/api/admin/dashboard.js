// pages/api/admin/dashboard.js - DADOS AGREGADOS DA DASHBOARD ADMIN
// ===================================
// Uma única chamada com tudo o que a página /admin precisa:
// KPIs do dia/mês, pendências, a receber, pedidos recentes, resumo por
// fornecedor, distribuidores e convites.

import dbConnect from '../../../lib/mongodb';
import Pedido from '../../../models/Pedido';
import Produto from '../../../models/Produto';
import Fornecedor from '../../../models/Fornecedor';
import User from '../../../models/User';
import Convite from '../../../models/Convite';
import Pagamento from '../../../models/Pagamento';
import { requireAdmin } from '../../../lib/auth';
import { EXPR_ROYALTIES_EM_ABERTO } from '../../../lib/financeiro';

const inicioDoDia = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const inicioDoMes = d => new Date(d.getFullYear(), d.getMonth(), 1);

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    await dbConnect();
    const agora = new Date();
    const hoje = inicioDoDia(agora);
    const mes = inicioDoMes(agora);
    const mesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    const ha30Dias = new Date(agora.getTime() - 30 * 86400000);
    const ha7Dias = new Date(agora.getTime() - 7 * 86400000);

    const [
      porStatus,
      hojeAgg,
      mesAgg,
      mesAnteriorAgg,
      aReceber,
      recentes,
      porFornecedor,
      fornecedores,
      produtosAgg,
      distribuidoresAgg,
      convitesAgg,
      serie,
      sinaisAConferir,
      pixAConferirAgg,
    ] = await Promise.all([
      Pedido.aggregate([
        { $group: { _id: '$status', total: { $sum: 1 }, valor: { $sum: '$total' } } },
      ]),
      Pedido.aggregate([
        { $match: { createdAt: { $gte: hoje } } },
        { $group: { _id: null, total: { $sum: 1 }, valor: { $sum: '$total' } } },
      ]),
      Pedido.aggregate([
        { $match: { createdAt: { $gte: mes } } },
        { $group: { _id: null, total: { $sum: 1 }, valor: { $sum: '$total' } } },
      ]),
      Pedido.aggregate([
        { $match: { createdAt: { $gte: mesAnterior, $lt: mes } } },
        { $group: { _id: null, total: { $sum: 1 }, valor: { $sum: '$total' } } },
      ]),
      Pedido.aggregate([
        {
          $group: {
            _id: null,
            // já desconta as baixas parciais feitas por Pix
            royalties: { $sum: EXPR_ROYALTIES_EM_ABERTO },
            etiquetas: {
              $sum: {
                $cond: [
                  { $ne: ['$controleFinanceiro.etiquetas.status', 'pago'] },
                  '$totalEtiquetas',
                  0,
                ],
              },
            },
            embalagens: {
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
      Pedido.find({})
        .populate('fornecedorId', 'nome codigo cor logo')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      Pedido.aggregate([
        { $match: { createdAt: { $gte: ha30Dias } } },
        {
          $group: {
            _id: '$fornecedorId',
            pedidos: { $sum: 1 },
            valor: { $sum: '$total' },
            pendentes: { $sum: { $cond: [{ $eq: ['$status', 'pendente'] }, 1, 0] } },
          },
        },
      ]),
      Fornecedor.find({})
        .sort({ ordem: 1, nome: 1 })
        .select('nome codigo cor logo ativo especialidade pix percentualSinal')
        .lean(),
      Produto.aggregate([
        {
          $group: {
            _id: '$fornecedorId',
            total: { $sum: 1 },
            ativos: { $sum: { $cond: ['$ativo', 1, 0] } },
          },
        },
      ]),
      User.aggregate([
        { $match: { tipo: 'distribuidor' } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            ativos: { $sum: { $cond: ['$ativo', 1, 0] } },
            semSenha: {
              $sum: { $cond: [{ $and: ['$ativo', { $ne: ['$senhaDefinida', true] }] }, 1, 0] },
            },
            bloqueados: { $sum: { $cond: [{ $gt: ['$bloqueadoAte', agora] }, 1, 0] } },
            novos30d: { $sum: { $cond: [{ $gte: ['$createdAt', ha30Dias] }, 1, 0] } },
          },
        },
      ]),
      Convite.aggregate([
        {
          $group: {
            _id: null,
            pendentes: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$status', 'pendente'] }, { $gt: ['$expiraEm', agora] }] },
                  1,
                  0,
                ],
              },
            },
            expirados: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$status', 'pendente'] }, { $lte: ['$expiraEm', agora] }] },
                  1,
                  0,
                ],
              },
            },
            aceites7d: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$status', 'aceite'] }, { $gte: ['$aceiteEm', ha7Dias] }] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
      // últimos 14 dias, para o mini-gráfico
      Pedido.aggregate([
        { $match: { createdAt: { $gte: new Date(hoje.getTime() - 13 * 86400000) } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
                timezone: 'America/Sao_Paulo',
              },
            },
            total: { $sum: 1 },
            valor: { $sum: '$total' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Pix à espera de conferência
      Pedido.countDocuments({ 'sinal.status': 'em_analise' }),
      Pagamento.aggregate([
        { $match: { status: 'em_analise' } },
        { $group: { _id: null, total: { $sum: 1 }, valor: { $sum: '$valor' } } },
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

    const fin = aReceber[0] || {
      royalties: 0,
      etiquetas: 0,
      embalagens: 0,
      pedidosComPendencia: 0,
    };
    const totalAReceber = (fin.royalties || 0) + (fin.etiquetas || 0) + (fin.embalagens || 0);

    const mapaPed = Object.fromEntries(porFornecedor.map(p => [String(p._id), p]));
    const mapaProd = Object.fromEntries(produtosAgg.map(p => [String(p._id), p]));
    const fornecedoresResumo = fornecedores.map(f => {
      const p = mapaPed[String(f._id)] || { pedidos: 0, valor: 0, pendentes: 0 };
      const pr = mapaProd[String(f._id)] || { total: 0, ativos: 0 };
      return {
        _id: f._id,
        nome: f.nome,
        codigo: f.codigo,
        cor: f.cor,
        logo: f.logo,
        ativo: f.ativo,
        especialidade: f.especialidade,
        pedidos30d: p.pedidos,
        valor30d: p.valor,
        pendentes: p.pendentes,
        produtos: pr.total,
        produtosAtivos: pr.ativos,
      };
    });

    // Série dos últimos 14 dias com zeros nos dias sem pedidos
    const mapaSerie = Object.fromEntries(serie.map(s => [s._id, s]));
    const serie14 = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(hoje.getTime() - i * 86400000);
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      serie14.push({
        dia: chave,
        total: mapaSerie[chave]?.total || 0,
        valor: mapaSerie[chave]?.valor || 0,
      });
    }

    const dist = distribuidoresAgg[0] || {
      total: 0,
      ativos: 0,
      semSenha: 0,
      bloqueados: 0,
      novos30d: 0,
    };
    const conv = convitesAgg[0] || { pendentes: 0, expirados: 0, aceites7d: 0 };

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      geradoEm: agora,
      pedidos: {
        total: totalPedidos,
        valorTotal,
        status,
        hoje: hojeAgg[0] || { total: 0, valor: 0 },
        mes: mesAgg[0] || { total: 0, valor: 0 },
        mesAnterior: mesAnteriorAgg[0] || { total: 0, valor: 0 },
        serie14,
      },
      financeiro: {
        royalties: fin.royalties || 0,
        etiquetas: fin.etiquetas || 0,
        embalagens: fin.embalagens || 0,
        totalAReceber,
        pedidosComPendencia: fin.pedidosComPendencia || 0,
      },
      recentes: recentes.map(p => ({
        _id: p._id,
        numero: String(p._id).slice(-8).toUpperCase(),
        userId: p.userId,
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
        createdAt: p.createdAt,
      })),
      fornecedores: {
        total: fornecedores.length,
        ativos: fornecedores.filter(f => f.ativo).length,
        semProdutos: fornecedoresResumo.filter(f => f.ativo && f.produtosAtivos === 0).length,
        // ativos que exigem sinal mas não têm chave Pix: o checkout fica bloqueado
        semPix: fornecedores.filter(
          f => f.ativo && (f.percentualSinal ?? 40) > 0 && !(f.pix && f.pix.chave),
        ).length,
        lista: fornecedoresResumo,
      },
      produtos: {
        total: produtosAgg.reduce((s, p) => s + p.total, 0),
        ativos: produtosAgg.reduce((s, p) => s + p.ativos, 0),
      },
      distribuidores: dist,
      convites: conv,
      pix: {
        sinaisAConferir,
        pagamentosAConferir: pixAConferirAgg[0]?.total || 0,
        valorAConferir: pixAConferirAgg[0]?.valor || 0,
      },
    });
  } catch (error) {
    console.error('❌ Erro na dashboard admin:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

export default requireAdmin(handler);
