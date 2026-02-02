// PAGES/API/PEDIDOS/CRIAR.JS - COM CATEGORIAS ISENTAS DE ROYALTIES
// ===================================
// Inclui: totalEtiquetas, totalEmbalagens, controle financeiro
// 🆕 Verifica categorias isentas de royalties

import dbConnect from '../../../lib/mongodb';
import Pedido from '../../../models/Pedido';
import Fornecedor from '../../../models/Fornecedor';
import { enviarEmailsPedido } from '../../../lib/email';
import jwt from 'jsonwebtoken';

// 🆕 Taxa de royalty do .env (padrão 5%)
const ROYALTY_RATE = parseFloat(process.env.ROYALTY_PERCENTAGE) || 0.05;

// Função para buscar dados do distribuidor do .env
const getDistribuidor = usuario => {
  for (let i = 1; i <= 20; i++) {
    const distribuidorEnv = process.env[`DISTRIBUIDOR_${i}`];
    if (distribuidorEnv) {
      const parts = distribuidorEnv.split(':');

      if (parts.length >= 5) {
        const [user, password, nomeCompleto, email, telefone] = parts;

        if (user && user.trim() === usuario) {
          return {
            usuario: user.trim(),
            nome: nomeCompleto ? nomeCompleto.trim() : user.trim(),
            email: email ? email.trim() : `${user.trim()}@distribuidora.com`,
            telefone: telefone ? telefone.trim() : '(11) 99999-9999',
          };
        }
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
      return res.status(400).json({ message: 'Dados obrigatórios não fornecidos' });
    }

    // Buscar dados do distribuidor do .env
    const distribuidor = getDistribuidor(decoded.usuario);
    if (!distribuidor) {
      return res.status(404).json({ message: 'Distribuidor não encontrado' });
    }

    console.log('👤 Distribuidor encontrado:', {
      nome: distribuidor.nome,
      email: distribuidor.email,
      telefone: distribuidor.telefone,
    });

    // ══════════════════════════════════════════════════════════════
    // 🆕 BUSCAR FORNECEDOR PARA VERIFICAR CATEGORIAS ISENTAS
    // ══════════════════════════════════════════════════════════════
    const fornecedor = await Fornecedor.findById(fornecedorId);
    const categoriasIsentas = fornecedor?.categoriasIsentasRoyalty || [];

    console.log('🏭 Fornecedor:', {
      nome: fornecedor?.nome,
      categoriasIsentas: categoriasIsentas,
    });

    // ══════════════════════════════════════════════════════════════
    // CALCULAR TOTAIS
    // ══════════════════════════════════════════════════════════════

    // Subtotal BASE (preços base dos produtos) - TODOS os itens
    const subtotal = itens.reduce(
      (acc, item) => acc + item.quantidade * item.precoUnitario,
      0
    );

    // 🆕 Subtotal APENAS de itens que pagam royalty (categorias NÃO isentas)
    const subtotalComRoyalty = itens.reduce((acc, item) => {
      // Se a categoria do item está na lista de isentas, não conta para royalties
      if (categoriasIsentas.includes(item.categoria)) {
        return acc;
      }
      return acc + item.quantidade * item.precoUnitario;
    }, 0);

    // 🆕 Subtotal de itens isentos (para log/debug)
    const subtotalIsento = subtotal - subtotalComRoyalty;

    // Total de etiquetas
    const totalEtiquetas = itens.reduce(
      (acc, item) => acc + item.quantidade * (item.precoEtiqueta || 0),
      0
    );

    // Total de embalagens
    const totalEmbalagens = itens.reduce(
      (acc, item) => acc + item.quantidade * (item.precoEmbalagem || 0),
      0
    );

    // 🆕 Royalties = ROYALTY_RATE APENAS do subtotal COM royalty (não isentos)
    const royalties = subtotalComRoyalty * ROYALTY_RATE;

    // Total que o fornecedor recebe (apenas subtotal base)
    const totalFornecedor = subtotal;

    // Total que o distribuidor paga
    const total = subtotal + totalEtiquetas + totalEmbalagens + royalties;

    console.log('💰 Valores calculados:', {
      subtotal,
      subtotalComRoyalty,
      subtotalIsento,
      totalEtiquetas,
      totalEmbalagens,
      royaltyRate: `${ROYALTY_RATE * 100}%`,
      royalties,
      totalFornecedor,
      total,
    });

    // ══════════════════════════════════════════════════════════════
    // CRIAR PEDIDO
    // ══════════════════════════════════════════════════════════════

    const pedidoData = {
      userId: distribuidor.usuario,
      fornecedorId,
      itens,
      subtotal,
      totalEtiquetas,
      totalEmbalagens,
      royalties,
      totalFornecedor,
      total,
      formaPagamento,
      endereco,
      // Controle financeiro iniciado como pendente
      controleFinanceiro: {
        royalties: { status: 'pendente' },
        etiquetas: { status: 'pendente' },
        embalagens: { status: 'pendente' },
      },
    };

    console.log('💾 Criando pedido...');
    const pedido = new Pedido(pedidoData);
    await pedido.save();

    console.log('✅ Pedido salvo:', pedido._id);

    // ══════════════════════════════════════════════════════════════
    // ENVIAR EMAILS
    // ══════════════════════════════════════════════════════════════

    if (fornecedor) {
      console.log('📧 Iniciando envio de emails...');

      try {
        const resultadoEmail = await enviarEmailsPedido(
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
      resumo: {
        subtotal,
        subtotalComRoyalty,
        subtotalIsento,
        totalEtiquetas,
        totalEmbalagens,
        royalties,
        total,
      },
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