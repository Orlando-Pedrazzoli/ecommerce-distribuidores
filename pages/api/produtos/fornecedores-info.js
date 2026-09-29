// pages/api/produtos/fornecedores-info.js - FORNECEDORES ATIVOS (PORTAL)
// ===================================
// Usado pelo dashboard do distribuidor (cartões) e pelo checkout
// (categoriasIsentasRoyalty). Devolve só os fornecedores ativos, ordenados
// pelo campo `ordem` definido em /admin/fornecedores.

import dbConnect from '../../../lib/mongodb';
import Fornecedor from '../../../models/Fornecedor';
import Produto from '../../../models/Produto';
import { requireAuth } from '../../../lib/auth';
import { fornecedorPublico } from '../../../lib/fornecedores';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const [fornecedores, contagens] = await Promise.all([
      Fornecedor.find({ ativo: true }).sort({ ordem: 1, nome: 1 }).lean(),
      Produto.aggregate([
        { $match: { ativo: true } },
        { $group: { _id: '$fornecedorId', total: { $sum: 1 } } },
      ]),
    ]);
    const mapa = Object.fromEntries(contagens.map(c => [String(c._id), c.total]));

    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.status(200).json({
      success: true,
      fornecedores: fornecedores.map(f => ({
        ...fornecedorPublico(f),
        totalProdutos: mapa[String(f._id)] || 0,
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar fornecedores:', error);
    return res.status(500).json({ message: 'Erro ao buscar fornecedores' });
  }
}

export default requireAuth(handler);
