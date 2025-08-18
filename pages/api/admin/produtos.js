// 15. PAGES/API/ADMIN/PRODUTOS.JS
// ===================================

import dbConnect from '../../../lib/mongodb';
import Produto from '../../../models/Produto';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'POST') {
    try {
      const produto = new Produto(req.body);
      await produto.save();
      return res.status(201).json(produto);
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao criar produto' });
    }
  }

  if (req.method === 'GET') {
    try {
      const produtos = await Produto.find().populate('fornecedorId');
      return res.status(200).json(produtos);
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao buscar produtos' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      await Produto.findByIdAndDelete(id);
      return res.status(200).json({ message: 'Produto deletado' });
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao deletar produto' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
