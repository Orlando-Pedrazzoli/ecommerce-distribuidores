// pages/api/admin/fornecedores/index.js - LISTAR / CRIAR FORNECEDORES
// ===================================
// GET  ?todos=1 -> lista completa (ativos e inativos) com contagens de
//                  produtos e pedidos. Sem o parâmetro devolve só os ativos
//                  (formato antigo: array simples, usado por admin-produtos).
// POST           -> cria fornecedor
//
// Substitui o antigo pages/api/admin/fornecedores.js (apagar esse ficheiro).

import dbConnect from '../../../../lib/mongodb';
import Fornecedor from '../../../../models/Fornecedor';
import Produto from '../../../../models/Produto';
import Pedido from '../../../../models/Pedido';
import { requireAdmin } from '../../../../lib/auth';
import { validarFornecedor, aplicarCampos } from '../../../../lib/fornecedores';

async function handler(req, res) {
  await dbConnect();

  // ── GET ──
  if (req.method === 'GET') {
    try {
      const todos = req.query.todos === '1';

      if (!todos) {
        const ativos = await Fornecedor.find({ ativo: true }).sort({ ordem: 1, nome: 1 });
        return res.status(200).json(ativos);
      }

      const [fornecedores, produtosPorForn, pedidosPorForn] = await Promise.all([
        Fornecedor.find({}).sort({ ativo: -1, ordem: 1, nome: 1 }).lean(),
        Produto.aggregate([
          {
            $group: {
              _id: '$fornecedorId',
              total: { $sum: 1 },
              ativos: { $sum: { $cond: ['$ativo', 1, 0] } },
            },
          },
        ]),
        Pedido.aggregate([
          {
            $group: {
              _id: '$fornecedorId',
              total: { $sum: 1 },
              pendentes: { $sum: { $cond: [{ $eq: ['$status', 'pendente'] }, 1, 0] } },
              valor: { $sum: '$total' },
              ultimo: { $max: '$createdAt' },
            },
          },
        ]),
      ]);

      const mapaProdutos = Object.fromEntries(produtosPorForn.map(p => [String(p._id), p]));
      const mapaPedidos = Object.fromEntries(pedidosPorForn.map(p => [String(p._id), p]));

      const lista = fornecedores.map(f => {
        const p = mapaProdutos[String(f._id)] || { total: 0, ativos: 0 };
        const d = mapaPedidos[String(f._id)] || { total: 0, pendentes: 0, valor: 0, ultimo: null };
        return {
          ...f,
          stats: {
            produtos: p.total,
            produtosAtivos: p.ativos,
            pedidos: d.total,
            pedidosPendentes: d.pendentes,
            valorPedidos: d.valor,
            ultimoPedido: d.ultimo,
          },
        };
      });

      return res.status(200).json({
        success: true,
        total: lista.length,
        ativos: lista.filter(f => f.ativo).length,
        fornecedores: lista,
      });
    } catch (error) {
      console.error('❌ Erro ao listar fornecedores:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  // ── POST ──
  if (req.method === 'POST') {
    try {
      const erro = validarFornecedor(req.body, { novo: true });
      if (erro) return res.status(400).json({ message: erro });

      const codigo = String(req.body.codigo).trim().toUpperCase();
      const existente = await Fornecedor.findOne({ codigo });
      if (existente) {
        return res.status(409).json({ message: `Já existe um fornecedor com o código ${codigo}` });
      }

      const fornecedor = new Fornecedor({ codigo });
      aplicarCampos(fornecedor, req.body);
      await fornecedor.save();

      console.log(`🏢 Fornecedor criado por ${req.user.usuario}: ${codigo} - ${fornecedor.nome}`);
      return res.status(201).json({ success: true, message: 'Fornecedor criado', fornecedor });
    } catch (error) {
      console.error('❌ Erro ao criar fornecedor:', error);
      if (error.code === 11000) return res.status(409).json({ message: 'Código já cadastrado' });
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default requireAdmin(handler);
