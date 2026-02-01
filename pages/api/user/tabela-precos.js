// pages/api/user/tabela-precos.js
// ===================================
// API para gerenciar tabela de preços do distribuidor

import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import Produto from '../../../models/Produto';
import { verifyToken } from '../../../utils/auth';

export default async function handler(req, res) {
  await dbConnect();

  // Verificar autenticação
  const token = req.cookies['auth-token'];
  if (!token) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: 'Token inválido' });
  }

  const userId = decoded.id || decoded.userId;

  // ══════════════════════════════════════════════════════════════
  // GET - Carregar tabela de preços com produtos
  // ══════════════════════════════════════════════════════════════
  if (req.method === 'GET') {
    try {
      // Buscar usuário
      const user = await User.findById(userId).select('tabelaPrecos ultimaAtualizacaoTabela nome');
      
      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      // Buscar todos os produtos ativos
      const produtos = await Produto.find({ ativo: true })
        .populate('fornecedorId', 'nome codigo')
        .sort({ categoria: 1, nome: 1 })
        .lean();

      // Converter Map para objeto
      const tabelaPrecos = user.tabelaPrecos ? Object.fromEntries(user.tabelaPrecos) : {};

      // Calcular custo total de cada produto e adicionar preço de venda
      const produtosComPrecos = produtos.map(produto => {
        const custoBase = produto.preco || 0;
        const royalties = custoBase * 0.05;
        const etiqueta = produto.precoEtiqueta || 0;
        const embalagem = produto.precoEmbalagem || 0;
        const custoTotal = custoBase + royalties + etiqueta + embalagem;

        const precoVenda = tabelaPrecos[produto._id.toString()] || null;
        
        // Calcular margem se tiver preço de venda
        let margem = null;
        let lucro = null;
        if (precoVenda && custoTotal > 0) {
          lucro = precoVenda - custoTotal;
          margem = ((precoVenda - custoTotal) / custoTotal) * 100;
        }

        return {
          _id: produto._id,
          codigo: produto.codigo,
          nome: produto.nome,
          categoria: produto.categoria,
          imagem: produto.imagem || produto.imagens?.[0] || null,
          fornecedor: produto.fornecedorId?.nome || 'N/A',
          // Custos
          custoBase,
          royalties,
          etiqueta,
          embalagem,
          custoTotal,
          // Venda
          precoVenda,
          margem: margem !== null ? Math.round(margem * 100) / 100 : null,
          lucro: lucro !== null ? Math.round(lucro * 100) / 100 : null,
        };
      });

      // Agrupar por categoria
      const porCategoria = produtosComPrecos.reduce((acc, produto) => {
        const cat = produto.categoria || 'Sem Categoria';
        if (!acc[cat]) {
          acc[cat] = [];
        }
        acc[cat].push(produto);
        return acc;
      }, {});

      // Calcular estatísticas
      const comPreco = produtosComPrecos.filter(p => p.precoVenda !== null);
      const margemMedia = comPreco.length > 0
        ? comPreco.reduce((sum, p) => sum + (p.margem || 0), 0) / comPreco.length
        : 0;

      const stats = {
        totalProdutos: produtosComPrecos.length,
        comPreco: comPreco.length,
        semPreco: produtosComPrecos.length - comPreco.length,
        margemMedia: Math.round(margemMedia * 100) / 100,
        lucroTotal: comPreco.reduce((sum, p) => sum + (p.lucro || 0), 0),
        margemVerde: comPreco.filter(p => p.margem >= 30).length,
        margemAmarela: comPreco.filter(p => p.margem >= 15 && p.margem < 30).length,
        margemVermelha: comPreco.filter(p => p.margem !== null && p.margem < 15).length,
      };

      return res.status(200).json({
        produtos: produtosComPrecos,
        porCategoria,
        stats,
        ultimaAtualizacao: user.ultimaAtualizacaoTabela,
        distribuidorNome: user.nome,
      });

    } catch (error) {
      console.error('Erro ao buscar tabela de preços:', error);
      return res.status(500).json({ message: 'Erro ao buscar tabela de preços' });
    }
  }

  // ══════════════════════════════════════════════════════════════
  // PUT - Salvar tabela de preços
  // ══════════════════════════════════════════════════════════════
  if (req.method === 'PUT') {
    try {
      const { precos } = req.body;

      if (!precos || typeof precos !== 'object') {
        return res.status(400).json({ message: 'Dados inválidos' });
      }

      // Validar que todos os valores são números positivos ou null
      const precosValidados = {};
      for (const [produtoId, preco] of Object.entries(precos)) {
        if (preco === null || preco === '' || preco === undefined) {
          // Não incluir produtos sem preço
          continue;
        }
        const precoNum = parseFloat(preco);
        if (isNaN(precoNum) || precoNum < 0) {
          return res.status(400).json({ 
            message: `Preço inválido para produto ${produtoId}` 
          });
        }
        precosValidados[produtoId] = precoNum;
      }

      // Atualizar usuário
      const user = await User.findByIdAndUpdate(
        userId,
        {
          tabelaPrecos: precosValidados,
          ultimaAtualizacaoTabela: new Date(),
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      return res.status(200).json({
        message: 'Tabela de preços salva com sucesso',
        totalProdutos: Object.keys(precosValidados).length,
        ultimaAtualizacao: user.ultimaAtualizacaoTabela,
      });

    } catch (error) {
      console.error('Erro ao salvar tabela de preços:', error);
      return res.status(500).json({ message: 'Erro ao salvar tabela de preços' });
    }
  }

  // ══════════════════════════════════════════════════════════════
  // DELETE - Limpar tabela de preços
  // ══════════════════════════════════════════════════════════════
  if (req.method === 'DELETE') {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          tabelaPrecos: {},
          ultimaAtualizacaoTabela: new Date(),
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      return res.status(200).json({
        message: 'Tabela de preços limpa com sucesso',
      });

    } catch (error) {
      console.error('Erro ao limpar tabela de preços:', error);
      return res.status(500).json({ message: 'Erro ao limpar tabela de preços' });
    }
  }

  return res.status(405).json({ message: 'Método não permitido' });
}