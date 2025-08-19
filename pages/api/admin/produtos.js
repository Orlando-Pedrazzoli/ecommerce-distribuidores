// PAGES/API/ADMIN/PRODUTOS.JS - SIMPLIFICADO
// ===================================

import dbConnect from '../../../lib/mongodb';
import Produto from '../../../models/Produto';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'POST') {
    try {
      const produto = new Produto(req.body);
      await produto.save();

      const produtoPopulado = await Produto.findById(produto._id).populate(
        'fornecedorId',
        'nome codigo'
      );

      return res.status(201).json({
        success: true,
        produto: produtoPopulado,
      });
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      return res.status(500).json({
        message: 'Erro ao criar produto',
        error: error.message,
      });
    }
  }

  if (req.method === 'GET') {
    try {
      const produtos = await Produto.find({ ativo: true })
        .populate('fornecedorId', 'nome codigo')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        produtos,
        total: produtos.length,
      });
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      return res.status(500).json({ message: 'Erro ao buscar produtos' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ message: 'ID do produto é obrigatório' });
      }

      const produto = await Produto.findByIdAndUpdate(id, req.body, {
        new: true,
      }).populate('fornecedorId', 'nome codigo');

      if (!produto) {
        return res.status(404).json({ message: 'Produto não encontrado' });
      }

      return res.status(200).json({
        success: true,
        produto,
      });
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      return res.status(500).json({
        message: 'Erro ao atualizar produto',
        error: error.message,
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ message: 'ID do produto é obrigatório' });
      }

      // Soft delete - marcar como inativo
      const produto = await Produto.findByIdAndUpdate(
        id,
        { ativo: false },
        { new: true }
      );

      if (!produto) {
        return res.status(404).json({ message: 'Produto não encontrado' });
      }

      return res.status(200).json({
        success: true,
        message: 'Produto removido com sucesso',
      });
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
      return res.status(500).json({ message: 'Erro ao deletar produto' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
