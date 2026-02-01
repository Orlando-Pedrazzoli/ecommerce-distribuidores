// pages/api/user/exportar-excel.js
// ===================================
// API para exportar tabela de preços em Excel (.xlsx)
// Tudo numa única planilha com categorias como separadores

import dbConnect from '../../../lib/mongodb';
import TabelaPrecos from '../../../models/TabelaPrecos';
import Produto from '../../../models/Produto';
import { verifyToken } from '../../../utils/auth';
import * as XLSX from 'xlsx';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

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

  const usuario = decoded.usuario || decoded.id;
  const nomeDistribuidor = decoded.nome || usuario;

  try {
    // Buscar tabela de preços
    const tabela = await TabelaPrecos.findOne({ usuario }).lean();
    
    if (!tabela || !tabela.precos || Object.keys(tabela.precos).length === 0) {
      return res.status(400).json({ 
        message: 'Nenhum produto com preço definido. Defina os preços antes de exportar.' 
      });
    }

    // Converter preços
    const tabelaPrecos = tabela.precos instanceof Map 
      ? Object.fromEntries(tabela.precos) 
      : tabela.precos;

    // Buscar produtos ativos
    const produtos = await Produto.find({ ativo: true })
      .populate('fornecedorId', 'nome')
      .sort({ categoria: 1, codigo: 1 })
      .lean();

    // Filtrar apenas produtos com preço definido
    const produtosComPreco = produtos.filter(p => 
      tabelaPrecos[p._id.toString()] !== undefined && 
      tabelaPrecos[p._id.toString()] !== null
    );

    if (produtosComPreco.length === 0) {
      return res.status(400).json({ 
        message: 'Nenhum produto com preço definido. Defina os preços antes de exportar.' 
      });
    }

    // Agrupar por categoria
    const porCategoria = produtosComPreco.reduce((acc, produto) => {
      const cat = produto.categoria || 'Sem Categoria';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(produto);
      return acc;
    }, {});

    // Formatar moeda
    const formatarMoeda = (valor) => {
      return `R$ ${(valor || 0).toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    };

    // Data formatada
    const dataFormatada = new Date().toLocaleDateString('pt-BR');

    // Criar dados para uma única planilha
    const dados = [];

    // Título
    dados.push(['ELITE SURFING - Tabela de Preços']);
    dados.push([`Distribuidor: ${nomeDistribuidor}`]);
    dados.push([`Data: ${dataFormatada}`]);
    dados.push([]); // Linha vazia

    // Iterar por categorias
    Object.entries(porCategoria).forEach(([categoria, produtosCategoria]) => {
      // Título da categoria
      dados.push([categoria.toUpperCase()]);
      
      // Header dos produtos
      dados.push(['Código', 'Produto', 'Preço']);
      
      // Produtos da categoria
      produtosCategoria.forEach(produto => {
        dados.push([
          produto.codigo || '',
          produto.nome || '',
          formatarMoeda(tabelaPrecos[produto._id.toString()])
        ]);
      });
      
      // Linha vazia entre categorias
      dados.push([]);
    });

    // Criar worksheet
    const ws = XLSX.utils.aoa_to_sheet(dados);

    // Ajustar largura das colunas
    ws['!cols'] = [
      { wch: 15 },  // Código
      { wch: 45 },  // Produto
      { wch: 15 },  // Preço
    ];

    // Mesclar células do título principal (A1:C1)
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, // Título
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }, // Distribuidor
      { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } }, // Data
    ];

    // Criar workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tabela de Preços');

    // Gerar buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Nome do arquivo
    const dataArquivo = new Date().toISOString().split('T')[0];
    const nomeArquivo = `Tabela_Precos_${nomeDistribuidor.replace(/\s+/g, '_')}_${dataArquivo}.xlsx`;

    // Enviar resposta
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
    res.send(buffer);

  } catch (error) {
    console.error('Erro ao exportar Excel:', error);
    return res.status(500).json({ message: 'Erro ao exportar Excel' });
  }
}