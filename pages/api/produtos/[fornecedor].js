// PAGES/API/PRODUTOS/[FORNECEDOR].JS - SIMPLIFICADO
// ===================================

import dbConnect from '../../../lib/mongodb';
import Produto from '../../../models/Produto';
import Fornecedor from '../../../models/Fornecedor';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      const { fornecedor } = req.query;
      const { categoria } = req.query;

      // Buscar fornecedor pelo código
      const fornecedorDoc = await Fornecedor.findOne({
        codigo: fornecedor.toUpperCase(),
        ativo: true,
      });

      if (!fornecedorDoc) {
        return res.status(404).json({
          message: 'Fornecedor não encontrado',
          codigo: fornecedor,
        });
      }

      // Construir filtros
      let filter = {
        fornecedorId: fornecedorDoc._id,
        ativo: true,
      };

      // Filtro por categoria
      if (categoria && categoria !== 'Todas') {
        filter.categoria = categoria;
      }

      // Buscar produtos
      const produtos = await Produto.find(filter)
        .populate('fornecedorId', 'nome codigo')
        .sort({ nome: 1 });

      // Buscar categorias disponíveis para este fornecedor
      const categorias = fornecedorDoc.categorias || [];

      return res.status(200).json({
        produtos,
        fornecedor: {
          nome: fornecedorDoc.nome,
          codigo: fornecedorDoc.codigo,
        },
        categorias,
        total: produtos.length,
      });
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      return res.status(500).json({
        message: 'Erro interno do servidor',
        error: error.message,
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
