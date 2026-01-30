// PAGES/API/USER/PAGAMENTOS.JS - API DE PAGAMENTOS DO DISTRIBUIDOR
// ===================================
// CORRIGIDO: Consistência com api/user/pedidos.js

import dbConnect from '../../../lib/mongodb';
import Pedido from '../../../models/Pedido';
import Fornecedor from '../../../models/Fornecedor'; // ← NECESSÁRIO para populate
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // ══════════════════════════════════════════════════════════════
    // CORREÇÃO: Usar 'auth-token' igual ao pedidos.js
    // ══════════════════════════════════════════════════════════════
    const token = req.cookies['auth-token'];
    
    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);

    // ══════════════════════════════════════════════════════════════
    // CORREÇÃO: Usar 'tipo' igual ao pedidos.js (não 'role')
    // ══════════════════════════════════════════════════════════════
    if (decoded.tipo === 'admin') {
      return res.status(403).json({ message: 'Use /api/admin/financeiro para administradores' });
    }

    await dbConnect();

    // ══════════════════════════════════════════════════════════════
    // CORREÇÃO: Usar 'decoded.usuario' igual ao pedidos.js (não 'decoded.id')
    // ══════════════════════════════════════════════════════════════
    const pedidos = await Pedido.find({ userId: decoded.usuario })
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
    
    // Verificar se é erro de token inválido
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token inválido ou expirado' });
    }
    
    return res.status(500).json({ message: 'Erro ao buscar pagamentos' });
  }
}