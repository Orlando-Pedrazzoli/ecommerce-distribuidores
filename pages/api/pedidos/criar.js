// 1. CORREÇÃO: pages/api/pedidos/criar.js - SEM MONGOOSE USER
// ===================================

import dbConnect from '../../../lib/mongodb';
import Pedido from '../../../models/Pedido';
import Fornecedor from '../../../models/Fornecedor';
import { enviarEmailPedido } from '../../../lib/email';
import jwt from 'jsonwebtoken';

// Função para obter dados do distribuidor do .env
const getDistribuidor = usuario => {
  for (let i = 1; i <= 20; i++) {
    const distribuidorEnv = process.env[`DISTRIBUIDOR_${i}`];
    if (distribuidorEnv) {
      const parts = distribuidorEnv.split(':');
      const [user, password, nomeCompleto, email] = parts;
      if (user && user.trim() === usuario) {
        return {
          usuario: user.trim(),
          nome: nomeCompleto ? nomeCompleto.trim() : user.trim(),
          email: email ? email.trim() : `${user.trim()}@distribuidora.com`,
          telefone: '(11) 99999-9999',
        };
      }
    }
  }
  return null;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await dbConnect();

  try {
    // Verificar autenticação
    const token = req.cookies['auth-token'];
    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
    if (decoded.tipo !== 'distribuidor') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const { itens, fornecedorId, formaPagamento, endereco } = req.body;

    console.log('📦 Dados recebidos:', {
      usuario: decoded.usuario,
      fornecedorId,
      formaPagamento,
      itensCount: itens?.length,
    });

    if (!itens || !fornecedorId || !formaPagamento || !endereco) {
      return res
        .status(400)
        .json({ message: 'Dados obrigatórios não fornecidos' });
    }

    // Buscar dados do distribuidor do .env
    const distribuidor = getDistribuidor(decoded.usuario);
    if (!distribuidor) {
      return res.status(404).json({ message: 'Distribuidor não encontrado' });
    }

    console.log('👤 Distribuidor encontrado:', distribuidor.nome);

    // Calcular totais
    const subtotal = itens.reduce(
      (acc, item) => acc + item.quantidade * item.precoUnitario,
      0
    );
    const royalties = subtotal * 0.05; // 5%
    const total = subtotal + royalties;

    // Criar pedido - SEM USAR MONGOOSE USER MODEL
    const pedidoData = {
      userId: distribuidor.usuario, // String simples, não ObjectId
      fornecedorId,
      itens,
      subtotal,
      royalties,
      total,
      formaPagamento,
      endereco,
    };

    console.log('💾 Criando pedido...');
    const pedido = new Pedido(pedidoData);
    await pedido.save();

    console.log('✅ Pedido salvo:', pedido._id);

    // Buscar dados do fornecedor para email
    const fornecedor = await Fornecedor.findById(fornecedorId);
    if (!fornecedor) {
      console.log('⚠️ Fornecedor não encontrado');
    }

    // 🚀 ENVIAR EMAILS AUTOMATICAMENTE
    if (fornecedor) {
      console.log('📧 Iniciando envio de emails...');

      try {
        const resultadoEmail = await enviarEmailPedido(
          pedido,
          fornecedor,
          distribuidor
        );

        if (resultadoEmail.sucesso) {
          console.log(`✅ Emails enviados: ${resultadoEmail.totalEnviados}`);
        } else {
          console.error('❌ Erro no envio de emails:', resultadoEmail.erro);
        }
      } catch (emailError) {
        console.error('💥 Erro ao enviar emails:', emailError);
        // Não falhar o pedido por causa do email
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Pedido criado com sucesso! Emails enviados automaticamente.',
      pedidoId: pedido._id,
      numeroPedido: pedido._id.toString().slice(-8).toUpperCase(),
    });
  } catch (error) {
    console.error('💥 Erro ao criar pedido:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }
    return res.status(500).json({
      message: 'Erro interno do servidor',
      erro: error.message,
    });
  }
}
