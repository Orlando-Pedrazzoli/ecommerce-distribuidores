// pages/api/user/exportar-pdf.js
// ===================================
// API para exportar tabela de preços em PDF com fotos
// Separado por categorias

import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import Produto from '../../../models/Produto';
import { verifyAuth } from '../../../utils/auth';
import PDFDocument from 'pdfkit';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  await dbConnect();

  // Verificar autenticação
  const authResult = verifyAuth(req);
  if (!authResult.success) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  const userId = authResult.userId;

  try {
    // Buscar usuário
    const user = await User.findById(userId).select('tabelaPrecos nome telefone');
    
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

    // Criar PDF
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 40,
      info: {
        Title: `Tabela de Preços - ${user.nome}`,
        Author: 'Elite Surfing',
      }
    });

    // Buffer para armazenar o PDF
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));

    // Formatar moeda
    const formatarMoeda = (valor) => {
      return `R$ ${(valor || 0).toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`;
    };

    // Data formatada
    const dataFormatada = new Date().toLocaleDateString('pt-BR');

    // Função para adicionar header em cada página
    const addHeader = () => {
      doc.fontSize(20).font('Helvetica-Bold').text('ELITE SURFING', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(14).font('Helvetica').text('Tabela de Preços', { align: 'center' });
      doc.moveDown(0.2);
      doc.fontSize(10).text(`Distribuidor: ${user.nome}`, { align: 'center' });
      doc.fontSize(9).fillColor('#666666').text(`Atualizada em: ${dataFormatada}`, { align: 'center' });
      doc.fillColor('#000000');
      doc.moveDown(1);
      
      // Linha separadora
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.5);
    };

    // Função para adicionar footer
    const addFooter = () => {
      const bottomY = doc.page.height - 50;
      doc.fontSize(8).fillColor('#666666');
      doc.text(
        user.telefone ? `Contato: ${user.telefone}` : 'Elite Surfing - Produtos de Qualidade',
        40,
        bottomY,
        { align: 'center', width: 515 }
      );
      doc.fillColor('#000000');
    };

    // Adicionar header inicial
    addHeader();

    // Iterar por categorias
    const categorias = Object.entries(porCategoria);
    
    for (let catIndex = 0; catIndex < categorias.length; catIndex++) {
      const [categoria, produtosCategoria] = categorias[catIndex];

      // Verificar se precisa nova página para categoria
      if (doc.y > 680 && catIndex > 0) {
        addFooter();
        doc.addPage();
        addHeader();
      }

      // Título da categoria
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a365d').text(categoria.toUpperCase());
      doc.moveTo(40, doc.y + 2).lineTo(200, doc.y + 2).strokeColor('#1a365d').stroke();
      doc.strokeColor('#000000').fillColor('#000000');
      doc.moveDown(0.8);

      // Produtos da categoria
      for (let i = 0; i < produtosCategoria.length; i++) {
        const produto = produtosCategoria[i];
        const preco = tabelaPrecos[produto._id.toString()];

        // Verificar se precisa nova página
        if (doc.y > 700) {
          addFooter();
          doc.addPage();
          addHeader();
          // Repetir título da categoria
          doc.fontSize(12).font('Helvetica-Bold').fillColor('#666666')
            .text(`${categoria.toUpperCase()} (continuação)`);
          doc.fillColor('#000000');
          doc.moveDown(0.5);
        }

        const startY = doc.y;
        const imgSize = 50;
        
        // Tentar adicionar imagem
        const imagem = produto.imagem || produto.imagens?.[0];
        if (imagem) {
          try {
            // Para URLs do Cloudinary, podemos tentar baixar
            const imgResponse = await fetch(imagem);
            if (imgResponse.ok) {
              const imgBuffer = await imgResponse.buffer();
              doc.image(imgBuffer, 40, startY, { 
                width: imgSize, 
                height: imgSize,
                fit: [imgSize, imgSize]
              });
            }
          } catch (imgError) {
            // Se falhar, adiciona placeholder
            doc.rect(40, startY, imgSize, imgSize).stroke();
            doc.fontSize(8).text('Sem', 52, startY + 18);
            doc.text('Imagem', 48, startY + 28);
          }
        } else {
          // Placeholder sem imagem
          doc.rect(40, startY, imgSize, imgSize).stroke();
          doc.fontSize(8).text('Sem', 52, startY + 18);
          doc.text('Imagem', 48, startY + 28);
        }

        // Informações do produto
        const textX = 100;
        doc.fontSize(9).font('Helvetica-Bold').text(produto.codigo || '', textX, startY);
        doc.fontSize(11).font('Helvetica').text(produto.nome || '', textX, startY + 12, {
          width: 350,
          ellipsis: true
        });
        
        // Preço (alinhado à direita)
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#16a34a')
          .text(formatarMoeda(preco), 450, startY + 15, { 
            width: 105, 
            align: 'right' 
          });
        doc.fillColor('#000000');

        // Mover para próximo produto
        doc.y = startY + imgSize + 10;

        // Linha separadora leve entre produtos
        if (i < produtosCategoria.length - 1) {
          doc.moveTo(40, doc.y - 5).lineTo(555, doc.y - 5).strokeColor('#e5e5e5').stroke();
          doc.strokeColor('#000000');
        }
      }

      doc.moveDown(1);
    }

    // Footer final
    addFooter();

    // Finalizar PDF
    doc.end();

    // Aguardar conclusão
    await new Promise(resolve => doc.on('end', resolve));

    // Concatenar chunks
    const pdfBuffer = Buffer.concat(chunks);

    // Data formatada para nome do arquivo
    const dataArquivo = new Date().toISOString().split('T')[0];
    const nomeArquivo = `Tabela_Precos_${user.nome.replace(/\s+/g, '_')}_${dataArquivo}.pdf`;

    // Enviar resposta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    return res.status(500).json({ message: 'Erro ao exportar PDF' });
  }
}