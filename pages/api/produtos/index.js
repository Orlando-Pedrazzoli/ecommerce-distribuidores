// PAGES/API/PRODUTOS/INDEX.JS - LISTA DE PRODUTOS ATIVOS (QUALQUER USUÁRIO LOGADO)
// ===================================

import dbConnect from '../../../lib/mongodb';
import Produto from '../../../models/Produto';
import Fornecedor from '../../../models/Fornecedor';
import { requireAuth } from '../../../lib/auth';

async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      const { fornecedor, categoria } = req.query;

      let filter = { ativo: true };

      if (fornecedor) {
        const fornecedorDoc = await Fornecedor.findOne({ codigo: fornecedor });
        if (fornecedorDoc) {
          filter.fornecedorId = fornecedorDoc._id;
        }
      }

      if (categoria && categoria !== 'Todos') {
        filter.categoria = categoria;
      }

      // Só nome e código do fornecedor: o documento completo tem dados
      // internos (observações do admin, emails, CNPJ, chave Pix)
      const produtos = await Produto.find(filter).populate('fornecedorId', 'nome codigo');

      return res.status(200).json(produtos);
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao buscar produtos' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default requireAuth(handler);
