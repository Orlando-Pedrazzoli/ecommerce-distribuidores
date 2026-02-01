// pages/api/user/exportar-pdf.js
// ===================================
// API para exportar tabela de preços em PDF
// Versão simplificada (sem imagens externas para compatibilidade com Vercel)

import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import Produto from '../../../models/Produto';
import { verifyToken } from '../../../utils/auth';

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
      user = await User.findById(usuarioId).select('tabelaPrecos nome telefone');
    } else {
      user = await User.findOne({ usuario: usuarioId }).select('tabelaPrecos nome telefone');
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

    // Formatar moeda
    const formatarMoeda = (valor) => {
      return `R$ ${(valor || 0).toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    };

    // Data formatada
    const dataFormatada = new Date().toLocaleDateString('pt-BR');

    // Gerar HTML para PDF
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Tabela de Preços - ${user.nome}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1a365d; }
    .header h1 { color: #1a365d; font-size: 28px; margin-bottom: 5px; }
    .header p { color: #666; font-size: 14px; }
    .categoria { margin-bottom: 30px; page-break-inside: avoid; }
    .categoria h2 { background: #1a365d; color: white; padding: 10px 15px; font-size: 16px; margin-bottom: 0; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f5f5f5; padding: 10px; text-align: left; font-size: 12px; color: #666; border-bottom: 1px solid #ddd; }
    td { padding: 12px 10px; border-bottom: 1px solid #eee; font-size: 13px; }
    .codigo { width: 15%; color: #666; }
    .produto { width: 60%; }
    .preco { width: 25%; text-align: right; font-weight: bold; color: #16a34a; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
    @media print {
      body { padding: 0; }
      .categoria { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>ELITE SURFING</h1>
    <p>Tabela de Preços</p>
    <p><strong>Distribuidor:</strong> ${user.nome}</p>
    <p>Atualizada em: ${dataFormatada}</p>
  </div>
`;

    // Adicionar categorias
    Object.entries(porCategoria).forEach(([categoria, produtosCategoria]) => {
      html += `
  <div class="categoria">
    <h2>${categoria.toUpperCase()}</h2>
    <table>
      <thead>
        <tr>
          <th class="codigo">Código</th>
          <th class="produto">Produto</th>
          <th class="preco">Preço</th>
        </tr>
      </thead>
      <tbody>
`;
      
      produtosCategoria.forEach(produto => {
        const preco = tabelaPrecos[produto._id.toString()];
        html += `
        <tr>
          <td class="codigo">${produto.codigo || ''}</td>
          <td class="produto">${produto.nome || ''}</td>
          <td class="preco">${formatarMoeda(preco)}</td>
        </tr>
`;
      });

      html += `
      </tbody>
    </table>
  </div>
`;
    });

    // Footer
    html += `
  <div class="footer">
    <p>${user.telefone ? `Contato: ${user.telefone}` : 'Elite Surfing - Produtos de Qualidade'}</p>
  </div>
</body>
</html>
`;

    // Data formatada para nome do arquivo
    const dataArquivo = new Date().toISOString().split('T')[0];
    const nomeArquivo = `Tabela_Precos_${user.nome.replace(/\s+/g, '_')}_${dataArquivo}.html`;

    // Enviar como HTML (usuário pode imprimir como PDF)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
    res.send(html);

  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    return res.status(500).json({ message: 'Erro ao exportar: ' + error.message });
  }
}