// pages/api/user/tabela-precos.js
// ===================================
// API para gerenciar tabela de preços do distribuidor
// 🆕 COM SUPORTE A ORDENAÇÃO DE CATEGORIAS E PRODUTOS (DRAG & DROP)

import dbConnect from '../../../lib/mongodb';
import TabelaPrecos from '../../../models/TabelaPrecos';
import Produto from '../../../models/Produto';
import Fornecedor from '../../../models/Fornecedor';
import { verifyToken } from '../../../utils/auth';

// Taxa de royalty do .env (padrão 5%)
const ROYALTY_RATE = parseFloat(process.env.ROYALTY_PERCENTAGE) || 0.05;

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

  // Pegar usuario e nome do token
  const usuario = decoded.usuario || decoded.id;
  const nomeDistribuidor = decoded.nome || usuario;

  // ══════════════════════════════════════════════════════════════
  // GET - Carregar tabela de preços com produtos
  // ══════════════════════════════════════════════════════════════
  if (req.method === 'GET') {
    try {
      // Buscar tabela de preços do distribuidor
      let tabela = await TabelaPrecos.findOne({ usuario }).lean();
      
      // Se não existe, criar uma vazia
      if (!tabela) {
        tabela = { 
          usuario, 
          precos: {}, 
          produtosOcultos: [], 
          ordemCategorias: [],
          ordemProdutos: {},
          ultimaAtualizacao: null 
        };
      }

      // Buscar todos os produtos ativos COM dados do fornecedor
      const produtos = await Produto.find({ ativo: true })
        .populate('fornecedorId', 'nome codigo categoriasIsentasRoyalty')
        .sort({ categoria: 1, nome: 1 })
        .lean();

      // Converter Map para objeto (se necessário)
      const tabelaPrecos = tabela.precos instanceof Map 
        ? Object.fromEntries(tabela.precos) 
        : (tabela.precos || {});

      // Lista de produtos ocultos
      const produtosOcultos = tabela.produtosOcultos || [];
      
      // Ordem personalizada das categorias
      const ordemCategorias = tabela.ordemCategorias || [];
      
      // 🆕 Ordem personalizada dos produtos por categoria
      const ordemProdutos = tabela.ordemProdutos instanceof Map
        ? Object.fromEntries(tabela.ordemProdutos)
        : (tabela.ordemProdutos || {});

      // Calcular custo total de cada produto e adicionar preço de venda
      const produtosComPrecos = produtos.map(produto => {
        const custoBase = produto.preco || 0;
        
        // Verificar se categoria é isenta de royalties
        const categoriasIsentas = produto.fornecedorId?.categoriasIsentasRoyalty || [];
        const categoriaIsenta = categoriasIsentas.includes(produto.categoria);
        
        const royalties = categoriaIsenta ? 0 : custoBase * ROYALTY_RATE;
        
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
          _id: produto._id.toString(),
          codigo: produto.codigo,
          nome: produto.nome,
          categoria: produto.categoria,
          imagem: produto.imagem || produto.imagens?.[0] || null,
          fornecedor: produto.fornecedorId?.nome || 'N/A',
          fornecedorCodigo: produto.fornecedorId?.codigo || '',
          custoBase,
          royalties,
          etiqueta,
          embalagem,
          custoTotal,
          isentoRoyalty: categoriaIsenta,
          precoVenda,
          margem: margem !== null ? Math.round(margem * 100) / 100 : null,
          lucro: lucro !== null ? Math.round(lucro * 100) / 100 : null,
          oculto: produtosOcultos.includes(produto._id.toString()),
        };
      });

      // Agrupar por categoria
      const porCategoriaObj = produtosComPrecos.reduce((acc, produto) => {
        const cat = produto.categoria || 'Sem Categoria';
        if (!acc[cat]) {
          acc[cat] = [];
        }
        acc[cat].push(produto);
        return acc;
      }, {});

      // ══════════════════════════════════════════════════════════════
      // ORDENAR CATEGORIAS
      // ══════════════════════════════════════════════════════════════
      const todasCategorias = Object.keys(porCategoriaObj);
      const categoriasComOrdem = ordemCategorias.filter(cat => todasCategorias.includes(cat));
      const categoriasSemOrdem = todasCategorias
        .filter(cat => !ordemCategorias.includes(cat))
        .sort();
      const ordemFinalCategorias = [...categoriasComOrdem, ...categoriasSemOrdem];

      // ══════════════════════════════════════════════════════════════
      // 🆕 ORDENAR PRODUTOS DENTRO DE CADA CATEGORIA
      // ══════════════════════════════════════════════════════════════
      const porCategoria = {};
      const ordemFinalProdutos = {};

      ordemFinalCategorias.forEach(cat => {
        if (porCategoriaObj[cat]) {
          const produtosDaCategoria = porCategoriaObj[cat];
          const ordemSalva = ordemProdutos[cat] || [];
          
          // Ordenar produtos: primeiro os que têm ordem, depois os novos (por nome)
          const produtosComOrdem = [];
          const produtosSemOrdem = [];
          
          produtosDaCategoria.forEach(p => {
            if (ordemSalva.includes(p._id)) {
              produtosComOrdem.push(p);
            } else {
              produtosSemOrdem.push(p);
            }
          });
          
          // Ordenar os com ordem conforme a ordem salva
          produtosComOrdem.sort((a, b) => {
            return ordemSalva.indexOf(a._id) - ordemSalva.indexOf(b._id);
          });
          
          // Ordenar os sem ordem por nome
          produtosSemOrdem.sort((a, b) => a.nome.localeCompare(b.nome));
          
          // Juntar: primeiro ordenados, depois novos
          porCategoria[cat] = [...produtosComOrdem, ...produtosSemOrdem];
          
          // Gerar ordem final dos produtos desta categoria
          ordemFinalProdutos[cat] = porCategoria[cat].map(p => p._id);
        }
      });

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
        produtosIsentos: produtosComPrecos.filter(p => p.isentoRoyalty).length,
      };

      return res.status(200).json({
        produtos: produtosComPrecos,
        porCategoria,
        stats,
        produtosOcultos,
        ordemCategorias: ordemFinalCategorias,
        ordemProdutos: ordemFinalProdutos,
        ultimaAtualizacao: tabela.ultimaAtualizacao,
        distribuidorNome: nomeDistribuidor,
        royaltyRate: ROYALTY_RATE * 100,
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
      const { precos, produtosOcultos, ordemCategorias, ordemProdutos } = req.body;

      if (!precos || typeof precos !== 'object') {
        return res.status(400).json({ message: 'Dados inválidos' });
      }

      // Validar preços
      const precosValidados = {};
      for (const [produtoId, preco] of Object.entries(precos)) {
        if (preco === null || preco === '' || preco === undefined) {
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

      // Validar produtos ocultos
      const ocultosValidados = Array.isArray(produtosOcultos) 
        ? produtosOcultos.filter(id => typeof id === 'string') 
        : [];

      // Validar ordem das categorias
      const ordemCategoriasValidada = Array.isArray(ordemCategorias)
        ? ordemCategorias.filter(cat => typeof cat === 'string' && cat.trim())
        : [];

      // 🆕 Validar ordem dos produtos por categoria
      const ordemProdutosValidada = {};
      if (ordemProdutos && typeof ordemProdutos === 'object') {
        for (const [categoria, ids] of Object.entries(ordemProdutos)) {
          if (Array.isArray(ids)) {
            ordemProdutosValidada[categoria] = ids.filter(id => typeof id === 'string');
          }
        }
      }

      // Upsert - criar se não existe, atualizar se existe
      const tabela = await TabelaPrecos.findOneAndUpdate(
        { usuario },
        {
          usuario,
          nomeDistribuidor,
          precos: precosValidados,
          produtosOcultos: ocultosValidados,
          ordemCategorias: ordemCategoriasValidada,
          ordemProdutos: ordemProdutosValidada,
          ultimaAtualizacao: new Date(),
        },
        { new: true, upsert: true }
      );

      return res.status(200).json({
        message: 'Tabela de preços salva com sucesso',
        totalProdutos: Object.keys(precosValidados).length,
        produtosOcultos: ocultosValidados.length,
        ordemCategorias: ordemCategoriasValidada,
        ordemProdutos: ordemProdutosValidada,
        ultimaAtualizacao: tabela.ultimaAtualizacao,
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
      await TabelaPrecos.findOneAndUpdate(
        { usuario },
        {
          precos: {},
          ultimaAtualizacao: new Date(),
        },
        { new: true }
      );

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