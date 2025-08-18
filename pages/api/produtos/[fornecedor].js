// PAGES/API/PRODUTOS/[FORNECEDOR].JS
// ===================================

import dbConnect from '../../../lib/mongodb';
import Produto from '../../../models/Produto';
import Fornecedor from '../../../models/Fornecedor';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      const { fornecedor } = req.query;
      const {
        categoria,
        busca,
        precoMin,
        precoMax,
        page = 1,
        limit = 12,
        ordenacao = 'nome',
      } = req.query;

      // Buscar fornecedor pelo código
      const fornecedorDoc = await Fornecedor.findOne({
        codigo: fornecedor.toUpperCase(),
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
      if (categoria && categoria !== 'Todos') {
        filter.categoria = categoria;
      }

      // Filtro por busca (nome, descrição, tags)
      if (busca) {
        filter.$or = [
          { nome: { $regex: busca, $options: 'i' } },
          { descricao: { $regex: busca, $options: 'i' } },
          { tags: { $in: [new RegExp(busca, 'i')] } },
          { sku: { $regex: busca, $options: 'i' } },
        ];
      }

      // Filtro por preço
      if (precoMin || precoMax) {
        filter.preco = {};
        if (precoMin) filter.preco.$gte = parseFloat(precoMin);
        if (precoMax) filter.preco.$lte = parseFloat(precoMax);
      }

      // Configurar ordenação
      let sortOptions = {};
      switch (ordenacao) {
        case 'preco_asc':
          sortOptions = { preco: 1 };
          break;
        case 'preco_desc':
          sortOptions = { preco: -1 };
          break;
        case 'nome':
          sortOptions = { nome: 1 };
          break;
        case 'mais_novo':
          sortOptions = { dataCriacao: -1 };
          break;
        default:
          sortOptions = { nome: 1 };
      }

      // Paginação
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Buscar produtos
      const produtos = await Produto.find(filter)
        .populate('fornecedorId', 'nome codigo')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit));

      // Contar total
      const total = await Produto.countDocuments(filter);

      // Estatísticas para o fornecedor
      const stats = await Produto.aggregate([
        { $match: { fornecedorId: fornecedorDoc._id, ativo: true } },
        {
          $group: {
            _id: '$categoria',
            count: { $sum: 1 },
            precoMedio: { $avg: '$preco' },
            precoMin: { $min: '$preco' },
            precoMax: { $max: '$preco' },
          },
        },
      ]);

      // Preços para filtros
      const precoRange = await Produto.aggregate([
        { $match: { fornecedorId: fornecedorDoc._id, ativo: true } },
        {
          $group: {
            _id: null,
            min: { $min: '$preco' },
            max: { $max: '$preco' },
          },
        },
      ]);

      return res.status(200).json({
        produtos,
        fornecedor: {
          nome: fornecedorDoc.nome,
          codigo: fornecedorDoc.codigo,
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
        stats: {
          categorias: stats,
          precoRange: precoRange[0] || { min: 0, max: 0 },
          totalProdutos: total,
        },
        filtros: {
          categoria: categoria || 'Todos',
          busca: busca || '',
          precoMin: precoMin || '',
          precoMax: precoMax || '',
          ordenacao,
        },
      });
    } catch (error) {
      console.error('Erro ao buscar produtos do fornecedor:', error);
      return res.status(500).json({
        message: 'Erro interno do servidor',
        error: error.message,
      });
    }
  }

  if (req.method === 'POST') {
    // Endpoint para criar produto específico para um fornecedor
    try {
      const { fornecedor } = req.query;

      // Buscar fornecedor
      const fornecedorDoc = await Fornecedor.findOne({
        codigo: fornecedor.toUpperCase(),
      });

      if (!fornecedorDoc) {
        return res.status(404).json({ message: 'Fornecedor não encontrado' });
      }

      // Criar produto com fornecedor específico
      const productData = {
        ...req.body,
        fornecedorId: fornecedorDoc._id,
      };

      const produto = new Produto(productData);
      await produto.save();

      const produtoPopulado = await Produto.findById(produto._id).populate(
        'fornecedorId',
        'nome codigo'
      );

      return res.status(201).json({
        success: true,
        message: 'Produto criado com sucesso',
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

  return res.status(405).json({ message: 'Method not allowed' });
}
