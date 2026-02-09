// hooks/useExportTabela.js
// Hook para exportação e compartilhamento (PDF, Excel, Email)

import { formatarMoeda } from '../utils/formatters';

export default function useExportTabela({
  user,
  stats,
  precos,
  produtosOcultos,
  fornecedoresOcultos,
  ordemCategorias,
  porCategoria,
  exportando,
  setExportando,
  toast,
}) {
  // ══════════════════════════════════════════════════════════════
  // EXPORTAR EXCEL
  // ══════════════════════════════════════════════════════════════
  const exportarExcel = async () => {
    try {
      setExportando(true);
      const response = await fetch('/api/user/exportar-excel');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tabela_Precos_${user?.nome?.replace(/\s+/g, '_') || 'Elite'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Excel baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast.error(error.message || 'Erro ao exportar Excel');
    } finally {
      setExportando(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // GERAR PDF
  // ══════════════════════════════════════════════════════════════
  const gerarPDF = async () => {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      toast.error('Carregando biblioteca PDF, aguarde...');
      return null;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const dataFormatada = new Date().toLocaleDateString('pt-BR');
    const nomeDistribuidor = user?.nome || 'Distribuidor';

    let yPos = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 54, 93);
    doc.text('ELITE SURFING', pageWidth / 2, yPos, { align: 'center' });

    yPos += 7;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Tabela de Preços', pageWidth / 2, yPos, { align: 'center' });

    yPos += 6;
    doc.setFontSize(10);
    doc.text(`Distribuidor: ${nomeDistribuidor}`, pageWidth / 2, yPos, { align: 'center' });

    yPos += 5;
    doc.setFontSize(9);
    doc.text(`Atualizada em: ${dataFormatada}`, pageWidth / 2, yPos, { align: 'center' });

    yPos += 8;
    doc.setDrawColor(26, 54, 93);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Iterar por categorias NA ORDEM PERSONALIZADA
    ordemCategorias.forEach((categoria) => {
      const produtosCategoria = porCategoria[categoria];
      if (!produtosCategoria) return;

      const produtosComPreco = produtosCategoria.filter(
        (p) => precos[p._id] && !produtosOcultos.includes(p._id) && !fornecedoresOcultos.includes(p.fornecedor)
      );
      if (produtosComPreco.length === 0) return;

      if (yPos > 270) {
        doc.addPage();
        yPos = 15;
      }

      // Categoria header
      doc.setFillColor(26, 54, 93);
      doc.rect(margin, yPos - 4, contentWidth, 7, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255);
      doc.text(categoria.toUpperCase(), margin + 3, yPos);
      yPos += 6;

      // Column headers
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPos - 3, contentWidth, 5, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100);
      doc.text('Código', margin + 2, yPos);
      doc.text('Produto', margin + 25, yPos);
      doc.text('Preço', pageWidth - margin - 2, yPos, { align: 'right' });
      yPos += 4;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50);

      produtosComPreco.forEach((produto, index) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 15;

          // Categoria continuação
          doc.setFillColor(26, 54, 93);
          doc.rect(margin, yPos - 4, contentWidth, 7, 'F');
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255);
          doc.text(`${categoria.toUpperCase()} (cont.)`, margin + 3, yPos);
          yPos += 6;

          doc.setFillColor(240, 240, 240);
          doc.rect(margin, yPos - 3, contentWidth, 5, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(100);
          doc.text('Código', margin + 2, yPos);
          doc.text('Produto', margin + 25, yPos);
          doc.text('Preço', pageWidth - margin - 2, yPos, { align: 'right' });
          yPos += 4;

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(50);
        }

        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, yPos - 3, contentWidth, 5, 'F');
        }

        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(produto.codigo || '', margin + 2, yPos);

        doc.setTextColor(50);
        doc.text(produto.nome || '', margin + 25, yPos);

        doc.setTextColor(22, 163, 74);
        doc.setFont('helvetica', 'bold');
        doc.text(`R$ ${formatarMoeda(precos[produto._id])}`, pageWidth - margin - 2, yPos, {
          align: 'right',
        });
        doc.setFont('helvetica', 'normal');

        yPos += 5;
      });

      yPos += 4;
    });

    // Footer em todas as páginas
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Elite Surfing - Produtos de Qualidade | Página ${i} de ${totalPages}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    return doc;
  };

  const baixarPDF = async () => {
    try {
      setExportando(true);
      const doc = await gerarPDF();
      if (doc) {
        const nomeArquivo = `Tabela_Precos_${user?.nome?.replace(/\s+/g, '_') || 'Elite'}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(nomeArquivo);
        toast.success('PDF baixado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setExportando(false);
    }
  };

  const visualizarPDF = async () => {
    try {
      setExportando(true);
      const doc = await gerarPDF();
      if (doc) {
        const pdfBlob = doc.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        window.open(url, '_blank');
        toast.success('PDF aberto! Use Ctrl+P para imprimir');
      }
    } catch (error) {
      console.error('Erro ao visualizar PDF:', error);
      toast.error('Erro ao visualizar PDF');
    } finally {
      setExportando(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // COMPARTILHAR
  // ══════════════════════════════════════════════════════════════
  const compartilharExcel = async () => {
    try {
      setExportando(true);
      const response = await fetch('/api/user/exportar-excel');
      if (!response.ok) throw new Error('Erro ao gerar Excel');

      const blob = await response.blob();
      const nomeArquivo = `Tabela_Precos_${user?.nome?.replace(/\s+/g, '_') || 'Elite'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      const file = new File([blob], nomeArquivo, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Tabela de Preços - Elite Surfing',
          text: 'Confira minha tabela de preços!',
        });
        toast.success('Compartilhado!');
      } else {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nomeArquivo;
        a.click();
        toast.info('Arquivo baixado. Compartilhe manualmente via WhatsApp ou Email.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Erro ao compartilhar:', error);
        toast.error('Erro ao compartilhar');
      }
    } finally {
      setExportando(false);
    }
  };

  const compartilharPDF = async () => {
    try {
      setExportando(true);
      const doc = await gerarPDF();
      if (!doc) return;

      const pdfBlob = doc.output('blob');
      const nomeArquivo = `Tabela_Precos_${user?.nome?.replace(/\s+/g, '_') || 'Elite'}_${new Date().toISOString().split('T')[0]}.pdf`;
      const file = new File([pdfBlob], nomeArquivo, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Tabela de Preços - Elite Surfing',
          text: 'Confira minha tabela de preços!',
        });
        toast.success('Compartilhado!');
      } else {
        doc.save(nomeArquivo);
        toast.info('PDF baixado. Compartilhe manualmente via WhatsApp ou Email.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Erro ao compartilhar:', error);
        toast.error('Erro ao compartilhar');
      }
    } finally {
      setExportando(false);
    }
  };

  const enviarPorEmail = (emailCliente) => {
    if (!emailCliente.trim()) {
      toast.warning('Digite o email do cliente');
      return;
    }

    const nomeDistribuidor = user?.nome || 'Distribuidor';
    const dataFormatada = new Date().toLocaleDateString('pt-BR');

    const assunto = encodeURIComponent(`Tabela de Preços - Elite Surfing`);
    const corpo = encodeURIComponent(
      `Olá!\n\nSegue em anexo minha tabela de preços atualizada.\n\n📋 Distribuidor: ${nomeDistribuidor}\n📅 Data: ${dataFormatada}\n📦 Produtos: ${stats?.comPreco || 0} itens\n\n⚠️ IMPORTANTE: Não esqueça de anexar o arquivo PDF ou Excel antes de enviar!\n\nQualquer dúvida, estou à disposição.\n\nAtenciosamente,\n${nomeDistribuidor}\nElite Surfing`
    );

    window.open(`mailto:${emailCliente}?subject=${assunto}&body=${corpo}`, '_blank');
    toast.success('Email aberto! Anexe o PDF ou Excel antes de enviar.');
  };

  return {
    exportarExcel,
    baixarPDF,
    visualizarPDF,
    compartilharExcel,
    compartilharPDF,
    enviarPorEmail,
  };
}