// PAGES/API/ADMIN/PRODUTOS.JS - ATUALIZADO COM MÚLTIPLAS IMAGENS
// ===================================
import dbConnect from '../../../lib/mongodb';
import Produto from '../../../models/Produto';
import Fornecedor from '../../../models/Fornecedor';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'POST') {
    try {
      // 🆕 Processar imagens (compatibilidade com formato antigo e novo)
      let imagens = [];

      // Se veio array de imagens
      if (req.body.imagens && Array.isArray(req.body.imagens)) {
        imagens = req.body.imagens;
      }
      // Se veio imagem única (retrocompatibilidade)
      else if (req.body.imagem) {
        imagens = [req.body.imagem];
      }

      const produtoData = {
        ...req.body,
        imagens: imagens,
        // 🔄 Manter campo antigo para retrocompatibilidade
        imagem: imagens.length > 0 ? imagens[0] : null,
        ativo: true,
      };

      const produto = new Produto(produtoData);
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
      const produtos = await Produto.find({
        $or: [{ ativo: true }, { ativo: { $exists: false } }],
      })
        .populate('fornecedorId', 'nome codigo')
        .sort({ createdAt: -1 });

      console.log(`📦 Produtos encontrados: ${produtos.length}`);

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

      // 🆕 Processar imagens na atualização
      const updateData = { ...req.body };

      // Se veio array de imagens, atualizar ambos os campos
      if (updateData.imagens && Array.isArray(updateData.imagens)) {
        updateData.imagem = updateData.imagens.length > 0 ? updateData.imagens[0] : null;
      }
      // Se veio imagem única (retrocompatibilidade)
      else if (updateData.imagem && !updateData.imagens) {
        updateData.imagens = [updateData.imagem];
      }

      // Garantir que ativo seja true ao atualizar
      updateData.ativo = true;

      const produto = await Produto.findByIdAndUpdate(id, updateData, {
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