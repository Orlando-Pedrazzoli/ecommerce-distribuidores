// pages/api/user/exportar-excel.js
// ===================================
// API para exportar tabela de preços em Excel (.xlsx)
// Separado por categorias (abas)

import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
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

  const usuarioId = decoded.id || decoded.userId || decoded.usuario;

  try {
    // Buscar usuário - tenta por _id primeiro, depois por usuario
    let user;
    if (usuarioId && usuarioId.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(usuarioId).select('tabelaPrecos nome');
    } else {
      user = await User.findOne({ usuario: usuarioId }).select('tabelaPrecos nome');
    }
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Buscar produtos ativos
    const produtos = await Produto.find({ ativo: true })
      .populate('fornecedorId', 'nome')
      .sort({ categoria: 1, codigo: 1 })
      .lean();

    // Converter tabela de preços
    const tabelaPrecos = user.tabelaPrecos ? Object.fromEntries(user.tabelaPrecos) : {};

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

    // Criar workbook
    const wb = XLSX.utils.book_new();

    // Formatar moeda
    const formatarMoeda = (valor) => {
      return `R$ ${(valor || 0).toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    };

    // Criar uma aba para cada categoria
    Object.entries(porCategoria).forEach(([categoria, produtosCategoria]) => {
      // Dados da planilha
      const dados = produtosCategoria.map(produto => ({
        'Código': produto.codigo || '',
        'Produto': produto.nome || '',
        'Preço': formatarMoeda(tabelaPrecos[produto._id.toString()]),
      }));

      // Criar worksheet
      const ws = XLSX.utils.json_to_sheet(dados);

      // Ajustar largura das colunas
      ws['!cols'] = [
        { wch: 12 },  // Código
        { wch: 40 },  // Produto
        { wch: 15 },  // Preço
      ];

      // Nome da aba (máx 31 caracteres, sem caracteres especiais)
      const nomeAba = categoria
        .substring(0, 31)
        .replace(/[\\\/\?\*\[\]]/g, '');

      XLSX.utils.book_append_sheet(wb, ws, nomeAba);
    });

    // Gerar buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Data formatada para nome do arquivo
    const dataFormatada = new Date().toISOString().split('T')[0];
    const nomeArquivo = `Tabela_Precos_${user.nome.replace(/\s+/g, '_')}_${dataFormatada}.xlsx`;

    // Enviar resposta
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
    res.send(buffer);

  } catch (error) {
    console.error('Erro ao exportar Excel:', error);
    return res.status(500).json({ message: 'Erro ao exportar Excel' });
  }
}