// pages/api/produtos/fornecedores-info.js
// ===================================
// API para buscar informações dos fornecedores
// 🆕 Inclui categoriasIsentasRoyalty para o checkout

import dbConnect from '../../../lib/mongodb';
import Fornecedor from '../../../models/Fornecedor';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    // Buscar todos os fornecedores ativos com as categorias isentas
    const fornecedores = await Fornecedor.find({ ativo: true })
      .select('_id nome codigo categoriasIsentasRoyalty')
      .lean();

    return res.status(200).json({
      success: true,
      fornecedores,
    });

  } catch (error) {
    console.error('Erro ao buscar fornecedores:', error);
    return res.status(500).json({ message: 'Erro ao buscar fornecedores' });
  }
}