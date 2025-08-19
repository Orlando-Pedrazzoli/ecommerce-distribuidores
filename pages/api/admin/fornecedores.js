// PAGES/API/ADMIN/FORNECEDORES.JS - SIMPLIFICADO
// ===================================

import dbConnect from '../../../lib/mongodb';
import Fornecedor from '../../../models/Fornecedor';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      const fornecedores = await Fornecedor.find({ ativo: true }).sort({
        nome: 1,
      });
      return res.status(200).json(fornecedores);
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
