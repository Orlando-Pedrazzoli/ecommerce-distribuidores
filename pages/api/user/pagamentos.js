// PAGES/API/USER/PAGAMENTOS.JS - API DE PAGAMENTOS DO DISTRIBUIDOR
// ===================================

import dbConnect from '../../../lib/mongodb';
import Pedido from '../../../models/Pedido';
import Fornecedor from '../../../models/Fornecedor';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verificar autenticação
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
    
    // Admin deve usar /api/admin/financeiro
    if (decoded.role === 'admin') {
      return res.status(403).json({ message: 'Use /api/admin/financeiro para administradores' });
    }

    await dbConnect();

    // Buscar pedidos do usuário
    const pedidos = await Pedido.find({ userId: decoded.id })
      .populate('fornecedorId', 'nome codigo')
      .sort({ createdAt: -1 });

    // Calcular resumo
    let totalPedidos = 0;
    let royaltiesPendentes = 0;
    let royaltiesPagos = 0;
    let etiquetasPendentes = 0;
    let etiquetasPagas = 0;
    let embalagensPendentes = 0;
    let embalagensPagas = 0;

    pedidos.forEach(pedido => {
      totalPedidos += pedido.total || 0;

      const cf = pedido.controleFinanceiro || {};

      // Royalties
      if (cf.royalties?.status === 'pago') {
        royaltiesPagos += pedido.royalties || 0;
      } else {
        royaltiesPendentes += pedido.royalties || 0;
      }

      // Etiquetas
      if (cf.etiquetas?.status === 'pago') {
        etiquetasPagas += pedido.totalEtiquetas || 0;
      } else {
        etiquetasPendentes += pedido.totalEtiquetas || 0;
      }

      // Embalagens
      if (cf.embalagens?.status === 'pago') {
        embalagensPagas += pedido.totalEmbalagens || 0;
      } else {
        embalagensPendentes += pedido.totalEmbalagens || 0;
      }
    });

    const resumo = {
      totalPedidos,
      royaltiesPendentes,
      royaltiesPagos,
      etiquetasPendentes,
      etiquetasPagas,
      embalagensPendentes,
      embalagensPagas,
      totalPendente: royaltiesPendentes + etiquetasPendentes + embalagensPendentes,
      totalPago: royaltiesPagos + etiquetasPagas + embalagensPagas,
    };

    return res.status(200).json({
      success: true,
      pedidos,
      resumo,
      totalPedidos: pedidos.length,
    });

  } catch (error) {
    console.error('Erro ao buscar pagamentos:', error);
    return res.status(500).json({ message: 'Erro ao buscar pagamentos' });
  }
}