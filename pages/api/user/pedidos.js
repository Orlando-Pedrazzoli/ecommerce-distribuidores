// PAGES/API/USER/PEDIDOS.JS - API DE PEDIDOS DO DISTRIBUIDOR
// ===================================
// Busca todos os pedidos do distribuidor logado (de TODOS os fornecedores)

import jwt from 'jsonwebtoken';
import Pedido from '../../../models/Pedido';
import Fornecedor from '../../../models/Fornecedor'; // ← NECESSÁRIO para populate
import Produto from '../../../models/Produto'; // ← NECESSÁRIO para populate
import dbConnect from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // ══════════════════════════════════════════════════════════════
    // AUTENTICAÇÃO
    // ══════════════════════════════════════════════════════════════
    const token = req.cookies['auth-token'];
    
    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);

    // Admin deve usar rota específica
    if (decoded.tipo === 'admin') {
      return res.status(403).json({ message: 'Use a rota admin para pedidos' });
    }

    await dbConnect();

    // ══════════════════════════════════════════════════════════════
    // PARÂMETROS DE FILTRO E PAGINAÇÃO
    // ══════════════════════════════════════════════════════════════
    const { 
      page = 1, 
      limit = 50,  // Aumentado para mostrar mais pedidos
      status,
      fornecedor  // Opcional: filtrar por fornecedor específico
    } = req.query;

    // Filtro base: sempre pelo userId do distribuidor logado
    let filter = { userId: decoded.usuario };

    // Filtro opcional por status
    if (status && status !== 'todos') {
      filter.status = status;
    }

    // Filtro opcional por fornecedor
    if (fornecedor && fornecedor !== 'todos') {
      filter.fornecedorId = fornecedor;
    }

    // ══════════════════════════════════════════════════════════════
    // BUSCAR PEDIDOS
    // ══════════════════════════════════════════════════════════════
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const pedidos = await Pedido.find(filter)
      .populate('fornecedorId', 'nome codigo')
      .populate('itens.produtoId', 'nome imagem codigo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Pedido.countDocuments(filter);

    // ══════════════════════════════════════════════════════════════
    // CALCULAR RESUMO FINANCEIRO (para exibir no dashboard/pedidos)
    // ══════════════════════════════════════════════════════════════
    const todosOsPedidos = await Pedido.find({ userId: decoded.usuario });
    
    let resumoFinanceiro = {
      totalPedidos: 0,
      royaltiesPendentes: 0,
      etiquetasPendentes: 0,
      embalagensPendentes: 0,
      totalPendente: 0,
    };

    todosOsPedidos.forEach(pedido => {
      resumoFinanceiro.totalPedidos += pedido.total || 0;
      const cf = pedido.controleFinanceiro || {};

      if (cf.royalties?.status !== 'pago') {
        resumoFinanceiro.royaltiesPendentes += pedido.royalties || 0;
      }
      if (cf.etiquetas?.status !== 'pago') {
        resumoFinanceiro.etiquetasPendentes += pedido.totalEtiquetas || 0;
      }
      if (cf.embalagens?.status !== 'pago') {
        resumoFinanceiro.embalagensPendentes += pedido.totalEmbalagens || 0;
      }
    });

    resumoFinanceiro.totalPendente = 
      resumoFinanceiro.royaltiesPendentes + 
      resumoFinanceiro.etiquetasPendentes + 
      resumoFinanceiro.embalagensPendentes;

    // ══════════════════════════════════════════════════════════════
    // RESPOSTA
    // ══════════════════════════════════════════════════════════════
    return res.status(200).json({
      success: true,
      pedidos,
      resumoFinanceiro,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    });

  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    
    // Verificar se é erro de token
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token inválido ou expirado' });
    }
    
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}