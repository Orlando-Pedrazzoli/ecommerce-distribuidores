// pages/api/user/exportar-pdf.js
// ===================================
// API para exportar tabela de preços em HTML/PDF
// Layout compacto para impressão

import dbConnect from '../../../lib/mongodb';
import TabelaPrecos from '../../../models/TabelaPrecos';
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

    // Gerar HTML compacto
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Tabela de Preços - ${nomeDistribuidor}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body { 
      font-family: Arial, sans-serif; 
      font-size: 11px;
      color: #333; 
      padding: 15px;
      line-height: 1.3;
    }
    
    .header { 
      text-align: center; 
      margin-bottom: 15px; 
      padding-bottom: 10px; 
      border-bottom: 2px solid #1a365d; 
    }
    .header h1 { 
      color: #1a365d; 
      font-size: 20px; 
      margin-bottom: 3px; 
    }
    .header p { 
      color: #666; 
      font-size: 10px; 
      margin: 2px 0;
    }
    
    .categoria-titulo { 
      background: #1a365d; 
      color: white; 
      padding: 5px 10px; 
      font-size: 12px; 
      font-weight: bold;
      margin-top: 10px;
    }
    
    table { 
      width: 100%; 
      border-collapse: collapse; 
    }
    
    th { 
      background: #f0f0f0; 
      padding: 4px 8px; 
      text-align: left; 
      font-size: 9px; 
      color: #666; 
      border-bottom: 1px solid #ddd; 
      text-transform: uppercase;
    }
    th.preco { text-align: right; }
    
    td { 
      padding: 4px 8px; 
      border-bottom: 1px solid #eee; 
      font-size: 10px; 
    }
    td.codigo { 
      width: 12%; 
      color: #666; 
    }
    td.produto { 
      width: 68%; 
    }
    td.preco { 
      width: 20%; 
      text-align: right; 
      font-weight: bold; 
      color: #16a34a; 
    }
    
    tr:nth-child(even) { background: #fafafa; }
    
    .footer { 
      margin-top: 15px; 
      text-align: center; 
      color: #999; 
      font-size: 9px; 
      border-top: 1px solid #ddd; 
      padding-top: 10px; 
    }
    
    /* Otimização para impressão */
    @media print {
      body { 
        padding: 10px; 
        font-size: 10px;
      }
      .header { margin-bottom: 10px; padding-bottom: 8px; }
      .header h1 { font-size: 18px; }
      .categoria-titulo { 
        margin-top: 8px; 
        padding: 4px 8px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      th, td { padding: 3px 6px; }
      td { font-size: 9px; }
      .footer { margin-top: 10px; }
      
      /* Evitar quebra de página no meio de uma categoria */
      .categoria { page-break-inside: avoid; }
      
      /* Forçar cores no print */
      .categoria-titulo { background: #1a365d !important; color: white !important; }
      td.preco { color: #16a34a !important; }
    }
    
    /* Botões de ação (não aparecem na impressão) */
    .actions {
      position: fixed;
      top: 10px;
      right: 10px;
      display: flex;
      gap: 8px;
      z-index: 1000;
    }
    .actions button {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-print {
      background: #3b82f6;
      color: white;
    }
    .btn-print:hover { background: #2563eb; }
    .btn-whatsapp {
      background: #25d366;
      color: white;
    }
    .btn-whatsapp:hover { background: #1da851; }
    
    @media print {
      .actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="actions">
    <button class="btn-print" onclick="window.print()">
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
      Imprimir / Salvar PDF
    </button>
  </div>

  <div class="header">
    <h1>ELITE SURFING</h1>
    <p><strong>Tabela de Preços</strong></p>
    <p>Distribuidor: ${nomeDistribuidor} | Atualizada em: ${dataFormatada}</p>
  </div>
`;

    // Adicionar categorias
    Object.entries(porCategoria).forEach(([categoria, produtosCategoria]) => {
      html += `
  <div class="categoria">
    <div class="categoria-titulo">${categoria.toUpperCase()}</div>
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Produto</th>
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
    Elite Surfing - Produtos de Qualidade para Surf
  </div>
</body>
</html>
`;

    // Enviar como HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);

  } catch (error) {
    console.error('Erro ao exportar:', error);
    return res.status(500).json({ message: 'Erro ao exportar: ' + error.message });
  }
}