// pages/tabela-precos.js
// ===================================
// Página de Tabela de Preços do Distribuidor
// 3 abas: Editar Preços | Compartilhar | Minhas Margens
// Com geração de PDF real e compartilhamento

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Script from 'next/script';
import Layout from '../components/Layout';
import { useToastContext } from '../pages/_app';

export default function TabelaPrecos() {
  const router = useRouter();
  const toast = useToastContext();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [porCategoria, setPorCategoria] = useState({});
  const [stats, setStats] = useState(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);

  // Estados de edição
  const [precos, setPrecos] = useState({});
  const [precosOriginais, setPrecosOriginais] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Estados de UI
  const [abaAtiva, setAbaAtiva] = useState('editar');
  const [busca, setBusca] = useState('');
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({});
  const [margemRapida, setMargemRapida] = useState('30');
  const [exportando, setExportando] = useState(false);
  const [jsPdfLoaded, setJsPdfLoaded] = useState(false);
  const [inputEmEdicao, setInputEmEdicao] = useState(null);
  const [valorTemporario, setValorTemporario] = useState('');
  
  // Estados para produtos ocultos
  const [produtosOcultos, setProdutosOcultos] = useState([]);
  const [mostrarOcultos, setMostrarOcultos] = useState(false);
  
  // Estado para email
  const [emailCliente, setEmailCliente] = useState('');

  // Formatar moeda
  const formatarMoeda = (valor) => {
    if (valor === null || valor === undefined || valor === '') return '';
    return (parseFloat(valor) || 0).toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  // Parsear valor monetário
  const parsearMoeda = (valor) => {
    if (!valor) return null;
    const num = parseFloat(valor.toString().replace(/\./g, '').replace(',', '.'));
    return isNaN(num) ? null : num;
  };

  // Carregar dados
  useEffect(() => {
    verificarUsuario();
  }, []);

  const verificarUsuario = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/');
        return;
      }
      const data = await response.json();
      if (data.user?.tipo !== 'distribuidor') {
        router.push('/dashboard');
        return;
      }
      setUser(data.user);
      carregarTabela();
    } catch (error) {
      console.error('Erro:', error);
      router.push('/');
    }
  };

  const carregarTabela = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/tabela-precos');
      if (!response.ok) throw new Error('Erro ao carregar');
      
      const data = await response.json();
      setProdutos(data.produtos || []);
      setPorCategoria(data.porCategoria || {});
      setStats(data.stats || null);
      setUltimaAtualizacao(data.ultimaAtualizacao);
      setProdutosOcultos(data.produtosOcultos || []);

      // Inicializar preços
      const precosIniciais = {};
      (data.produtos || []).forEach(p => {
        precosIniciais[p._id] = p.precoVenda;
      });
      setPrecos(precosIniciais);
      setPrecosOriginais(precosIniciais);

      // Expandir todas as categorias por padrão
      const expandidas = {};
      Object.keys(data.porCategoria || {}).forEach(cat => {
        expandidas[cat] = true;
      });
      setCategoriasExpandidas(expandidas);

    } catch (error) {
      console.error('Erro ao carregar tabela:', error);
      toast.error('Erro ao carregar tabela de preços');
    } finally {
      setLoading(false);
    }
  };

  // Detectar mudanças
  useEffect(() => {
    const changed = Object.keys(precos).some(
      id => precos[id] !== precosOriginais[id]
    );
    setHasChanges(changed);
  }, [precos, precosOriginais]);

  // Atualizar preço de um produto
  const atualizarPreco = (produtoId, valor) => {
    setPrecos(prev => ({
      ...prev,
      [produtoId]: valor === '' ? null : parsearMoeda(valor)
    }));
  };

  // Quando o input recebe foco - mostra valor simples para edição
  const handleFocus = (produtoId) => {
    const valorAtual = precos[produtoId];
    setInputEmEdicao(produtoId);
    // Mostra o valor como número simples (ex: 65.01 ou vazio)
    setValorTemporario(valorAtual !== null && valorAtual !== undefined ? valorAtual.toString().replace('.', ',') : '');
  };

  // Quando o input perde foco - salva o valor
  const handleBlur = (produtoId) => {
    // Parsear o valor temporário e salvar
    const valorParseado = parsearMoeda(valorTemporario);
    setPrecos(prev => ({
      ...prev,
      [produtoId]: valorParseado
    }));
    setInputEmEdicao(null);
    setValorTemporario('');
  };

  // Quando digita no input durante edição
  const handleChangeTemporario = (valor) => {
    // Permite apenas números, vírgula e ponto
    const valorLimpo = valor.replace(/[^0-9.,]/g, '');
    setValorTemporario(valorLimpo);
  };

  // Quando pressiona Enter - salva e sai do campo
  const handleKeyDown = (e, produtoId) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  // Toggle produto oculto
  const toggleOculto = (produtoId) => {
    setProdutosOcultos(prev => {
      if (prev.includes(produtoId)) {
        return prev.filter(id => id !== produtoId);
      } else {
        return [...prev, produtoId];
      }
    });
    setHasChanges(true);
  };

  // Aplicar margem global
  const aplicarMargemGlobal = () => {
    const margem = parseFloat(margemRapida) / 100;
    if (isNaN(margem) || margem < 0) {
      toast.warning('Margem inválida');
      return;
    }

    const novosPrecos = { ...precos };
    produtos.forEach(p => {
      if (p.custoTotal > 0) {
        novosPrecos[p._id] = Math.round(p.custoTotal * (1 + margem) * 100) / 100;
      }
    });
    setPrecos(novosPrecos);
    toast.success(`Margem de ${margemRapida}% aplicada a todos os produtos`);
  };

  // Salvar alterações
  const salvarAlteracoes = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/user/tabela-precos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ precos, produtosOcultos })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const data = await response.json();
      setPrecosOriginais({ ...precos });
      setHasChanges(false);
      setUltimaAtualizacao(data.ultimaAtualizacao);
      toast.success('Tabela de preços salva com sucesso!');
      
      carregarTabela();

    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error(error.message || 'Erro ao salvar tabela');
    } finally {
      setSaving(false);
    }
  };

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
  // GERAR PDF REAL (usando jsPDF)
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
    const contentWidth = pageWidth - (margin * 2);

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 54, 93); // Azul escuro
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

    // Iterar por categorias
    Object.entries(porCategoria).forEach(([categoria, produtosCategoria]) => {
      // Filtrar produtos com preço E não ocultos
      const produtosComPreco = produtosCategoria.filter(p => 
        precos[p._id] && !produtosOcultos.includes(p._id)
      );
      if (produtosComPreco.length === 0) return;

      // Verificar se precisa de nova página
      if (yPos > 270) {
        doc.addPage();
        yPos = 15;
      }

      // Título da categoria
      doc.setFillColor(26, 54, 93);
      doc.rect(margin, yPos - 4, contentWidth, 7, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255);
      doc.text(categoria.toUpperCase(), margin + 3, yPos);
      yPos += 6;

      // Header da tabela
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPos - 3, contentWidth, 5, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100);
      doc.text('Código', margin + 2, yPos);
      doc.text('Produto', margin + 25, yPos);
      doc.text('Preço', pageWidth - margin - 2, yPos, { align: 'right' });
      yPos += 4;

      // Produtos
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50);
      
      produtosComPreco.forEach((produto, index) => {
        // Verificar se precisa de nova página
        if (yPos > 280) {
          doc.addPage();
          yPos = 15;
          
          // Repetir header da categoria na nova página
          doc.setFillColor(26, 54, 93);
          doc.rect(margin, yPos - 4, contentWidth, 7, 'F');
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255);
          doc.text(`${categoria.toUpperCase()} (cont.)`, margin + 3, yPos);
          yPos += 6;
          
          // Header
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

        // Linha zebrada
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, yPos - 3, contentWidth, 5, 'F');
        }

        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(produto.codigo || '', margin + 2, yPos);
        
        doc.setTextColor(50);
        // Truncar nome se muito longo
        let nomeProduto = produto.nome || '';
        if (nomeProduto.length > 55) {
          nomeProduto = nomeProduto.substring(0, 52) + '...';
        }
        doc.text(nomeProduto, margin + 25, yPos);
        
        // Preço em verde
        doc.setTextColor(22, 163, 74);
        doc.setFont('helvetica', 'bold');
        doc.text(`R$ ${formatarMoeda(precos[produto._id])}`, pageWidth - margin - 2, yPos, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        
        yPos += 5;
      });

      yPos += 4; // Espaço entre categorias
    });

    // Footer
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

  // Baixar PDF
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

  // Abrir PDF para visualização
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
  // COMPARTILHAMENTO
  // ══════════════════════════════════════════════════════════════
  const compartilharExcel = async () => {
    try {
      setExportando(true);
      const response = await fetch('/api/user/exportar-excel');
      if (!response.ok) throw new Error('Erro ao gerar Excel');
      
      const blob = await response.blob();
      const nomeArquivo = `Tabela_Precos_${user?.nome?.replace(/\s+/g, '_') || 'Elite'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      const file = new File([blob], nomeArquivo, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Tabela de Preços - Elite Surfing',
          text: 'Confira minha tabela de preços!'
        });
        toast.success('Compartilhado!');
      } else {
        // Fallback: baixar o arquivo
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
          text: 'Confira minha tabela de preços!'
        });
        toast.success('Compartilhado!');
      } else {
        // Fallback: baixar o arquivo
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

  // ══════════════════════════════════════════════════════════════
  // ENVIAR POR EMAIL (mailto)
  // ══════════════════════════════════════════════════════════════
  const enviarPorEmail = () => {
    if (!emailCliente.trim()) {
      toast.warning('Digite o email do cliente');
      return;
    }

    const nomeDistribuidor = user?.nome || 'Distribuidor';
    const dataFormatada = new Date().toLocaleDateString('pt-BR');
    
    const assunto = encodeURIComponent(`Tabela de Preços - Elite Surfing`);
    const corpo = encodeURIComponent(
`Olá!

Segue em anexo minha tabela de preços atualizada.

📋 Distribuidor: ${nomeDistribuidor}
📅 Data: ${dataFormatada}
📦 Produtos: ${stats?.comPreco || 0} itens

⚠️ IMPORTANTE: Não esqueça de anexar o arquivo PDF ou Excel antes de enviar!

Qualquer dúvida, estou à disposição.

Atenciosamente,
${nomeDistribuidor}
Elite Surfing`
    );

    // Abrir cliente de email
    window.open(`mailto:${emailCliente}?subject=${assunto}&body=${corpo}`, '_blank');
    
    toast.success('Email aberto! Anexe o PDF ou Excel antes de enviar.');
  };

  // Filtrar produtos por busca e ocultos
  const produtosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    const filtrado = {};
    
    Object.entries(porCategoria).forEach(([cat, prods]) => {
      const prodsFiltrados = prods.filter(p => {
        // Filtrar por busca
        const passaBusca = !termo || 
          p.nome?.toLowerCase().includes(termo) ||
          p.codigo?.toLowerCase().includes(termo);
        
        // Filtrar ocultos (se não estiver mostrando ocultos)
        const passaOculto = mostrarOcultos || !produtosOcultos.includes(p._id);
        
        return passaBusca && passaOculto;
      });
      
      if (prodsFiltrados.length > 0) {
        filtrado[cat] = prodsFiltrados;
      }
    });
    
    return filtrado;
  }, [porCategoria, busca, mostrarOcultos, produtosOcultos]);

  // Contar produtos ocultos
  const totalOcultos = produtosOcultos.length;

  // Calcular margem em tempo real
  const calcularMargem = (produtoId) => {
    const produto = produtos.find(p => p._id === produtoId);
    if (!produto) return null;
    
    const preco = precos[produtoId];
    if (!preco || produto.custoTotal <= 0) return null;
    
    return ((preco - produto.custoTotal) / produto.custoTotal) * 100;
  };

  // Cor da margem
  const corMargem = (margem) => {
    if (margem === null) return 'text-gray-400';
    if (margem >= 30) return 'text-green-600';
    if (margem >= 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Badge da margem
  const badgeMargem = (margem) => {
    if (margem === null) return null;
    if (margem >= 30) return '🟢';
    if (margem >= 15) return '🟡';
    return '🔴';
  };

  // Toggle categoria expandida
  const toggleCategoria = (categoria) => {
    setCategoriasExpandidas(prev => ({
      ...prev,
      [categoria]: !prev[categoria]
    }));
  };

  // Ícones SVG
  const IconDownload = () => (
    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' />
    </svg>
  );

  const IconShare = () => (
    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z' />
    </svg>
  );

  const IconPrint = () => (
    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z' />
    </svg>
  );

  if (loading) {
    return (
      <Layout>
        <div className='flex justify-center items-center h-64'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4'></div>
            <p className='text-gray-600'>Carregando tabela de preços...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>Tabela de Preços - Elite Surfing</title>
      </Head>
      
      {/* Carregar jsPDF via CDN */}
      <Script 
        src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
        onLoad={() => setJsPdfLoaded(true)}
      />

      <Layout>
        <div className='max-w-7xl mx-auto px-4 py-4 lg:py-6'>
          {/* Header */}
          <div className='mb-4'>
            <h1 className='text-xl lg:text-2xl font-bold text-gray-800'>
              Tabela de Preços
            </h1>
            {ultimaAtualizacao && (
              <p className='text-sm text-gray-500'>
                Última atualização: {new Date(ultimaAtualizacao).toLocaleString('pt-BR')}
              </p>
            )}
          </div>

          {/* Abas */}
          <div className='border-b border-gray-200 mb-4'>
            <nav className='flex space-x-4 overflow-x-auto'>
              <button
                onClick={() => setAbaAtiva('editar')}
                className={`py-3 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  abaAtiva === 'editar'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Editar Preços
              </button>
              <button
                onClick={() => setAbaAtiva('compartilhar')}
                className={`py-3 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  abaAtiva === 'compartilhar'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Compartilhar
              </button>
              <button
                onClick={() => setAbaAtiva('margens')}
                className={`py-3 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  abaAtiva === 'margens'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Minhas Margens
              </button>
            </nav>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* ABA: EDITAR PREÇOS */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {abaAtiva === 'editar' && (
            <div>
              {/* Toolbar */}
              <div className='bg-white rounded-lg shadow-md p-4 mb-4'>
                <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
                  {/* Margem rápida */}
                  <div className='flex items-center gap-2'>
                    <label className='text-sm text-gray-600'>Margem rápida:</label>
                    <input
                      type='number'
                      value={margemRapida}
                      onChange={(e) => setMargemRapida(e.target.value)}
                      className='w-20 border rounded px-2 py-1 text-sm'
                      min='0'
                      max='200'
                    />
                    <span className='text-sm text-gray-500'>%</span>
                    <button
                      onClick={aplicarMargemGlobal}
                      className='bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm transition'
                    >
                      Aplicar a todos
                    </button>
                  </div>

                  {/* Busca */}
                  <div className='flex items-center gap-2'>
                    <input
                      type='text'
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder='Buscar produto ou código...'
                      className='border rounded px-3 py-1.5 text-sm w-full lg:w-64'
                    />
                  </div>

                  {/* Toggle mostrar ocultos */}
                  {totalOcultos > 0 && (
                    <button
                      onClick={() => setMostrarOcultos(!mostrarOcultos)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition ${
                        mostrarOcultos 
                          ? 'bg-gray-200 text-gray-700' 
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        {mostrarOcultos ? (
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                        ) : (
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' />
                        )}
                      </svg>
                      <span>{mostrarOcultos ? 'Mostrando' : 'Mostrar'} ocultos ({totalOcultos})</span>
                    </button>
                  )}

                  {/* Salvar */}
                  <button
                    onClick={salvarAlteracoes}
                    disabled={saving || !hasChanges}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 ${
                      hasChanges
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {saving ? (
                      <>
                        <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                        </svg>
                        Salvar Alterações
                      </>
                    )}
                  </button>
                </div>

                {hasChanges && (
                  <p className='text-sm text-yellow-600 mt-2'>
                    Você tem alterações não salvas
                  </p>
                )}
              </div>

              {/* Lista de produtos por categoria */}
              <div className='space-y-4'>
                {Object.entries(produtosFiltrados).map(([categoria, produtosCategoria]) => (
                  <div key={categoria} className='bg-white rounded-lg shadow-md overflow-hidden'>
                    {/* Header da categoria */}
                    <button
                      onClick={() => toggleCategoria(categoria)}
                      className='w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition'
                    >
                      <div className='flex items-center gap-2'>
                        <span className='font-bold text-gray-800'>{categoria}</span>
                        <span className='text-sm text-gray-500'>
                          ({produtosCategoria.length} produtos)
                        </span>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform ${
                          categoriasExpandidas[categoria] ? 'rotate-180' : ''
                        }`}
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                      </svg>
                    </button>

                    {/* Produtos */}
                    {categoriasExpandidas[categoria] && (
                      <div className='divide-y'>
                        {/* Header da tabela - Desktop */}
                        <div className='hidden lg:grid lg:grid-cols-12 gap-4 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase'>
                          <div className='col-span-1'>Código</div>
                          <div className='col-span-4'>Produto</div>
                          <div className='col-span-2 text-right'>Custo</div>
                          <div className='col-span-2 text-center'>Preço Venda</div>
                          <div className='col-span-3 text-right'>Margem</div>
                        </div>

                        {produtosCategoria.map(produto => {
                          const margem = calcularMargem(produto._id);
                          const isOculto = produtosOcultos.includes(produto._id);
                          
                          return (
                            <div
                              key={produto._id}
                              className={`p-4 hover:bg-gray-50 transition ${isOculto ? 'opacity-50 bg-gray-100' : ''}`}
                            >
                              {/* Mobile */}
                              <div className='lg:hidden space-y-2'>
                                <div className='flex justify-between items-start'>
                                  <div className='flex items-start gap-2'>
                                    {/* Botão ocultar - Mobile */}
                                    <button
                                      onClick={() => toggleOculto(produto._id)}
                                      className={`p-1 rounded transition ${isOculto ? 'text-gray-400' : 'text-gray-300 hover:text-gray-500'}`}
                                      title={isOculto ? 'Mostrar produto' : 'Ocultar produto'}
                                    >
                                      <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                        {isOculto ? (
                                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' />
                                        ) : (
                                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                                        )}
                                      </svg>
                                    </button>
                                    <div>
                                      <span className='text-xs text-gray-500'>{produto.codigo}</span>
                                      <p className='font-medium text-gray-800'>{produto.nome}</p>
                                    </div>
                                  </div>
                                  <span className={`text-sm font-bold ${corMargem(margem)}`}>
                                    {margem !== null ? `${margem.toFixed(1)}% ${badgeMargem(margem)}` : '-'}
                                  </span>
                                </div>
                                <div className='flex items-center justify-between'>
                                  <span className='text-sm text-gray-500'>
                                    Custo: R$ {formatarMoeda(produto.custoTotal)}
                                  </span>
                                  <div className='flex items-center gap-1'>
                                    <span className='text-sm'>R$</span>
                                    <input
                                      type='text'
                                      inputMode='decimal'
                                      value={inputEmEdicao === produto._id 
                                        ? valorTemporario 
                                        : (precos[produto._id] !== null ? formatarMoeda(precos[produto._id]) : '')}
                                      onChange={(e) => handleChangeTemporario(e.target.value)}
                                      onFocus={() => handleFocus(produto._id)}
                                      onBlur={() => handleBlur(produto._id)}
                                      onKeyDown={(e) => handleKeyDown(e, produto._id)}
                                      placeholder='0,00'
                                      className='w-24 border rounded px-2 py-1 text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none'
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Desktop */}
                              <div className='hidden lg:grid lg:grid-cols-12 gap-4 items-center'>
                                {/* Botão ocultar - Desktop */}
                                <div className='col-span-1 flex items-center'>
                                  <button
                                    onClick={() => toggleOculto(produto._id)}
                                    className={`p-1 rounded transition ${isOculto ? 'text-gray-400' : 'text-gray-300 hover:text-gray-500'}`}
                                    title={isOculto ? 'Mostrar produto' : 'Ocultar produto'}
                                  >
                                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                      {isOculto ? (
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' />
                                      ) : (
                                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                                      )}
                                    </svg>
                                  </button>
                                  <span className='text-sm text-gray-600 ml-1'>{produto.codigo}</span>
                                </div>
                                <div className='col-span-4'>
                                  <p className='font-medium text-gray-800 truncate' title={produto.nome}>
                                    {produto.nome}
                                  </p>
                                </div>
                                <div className='col-span-2 text-right text-sm text-gray-600'>
                                  R$ {formatarMoeda(produto.custoTotal)}
                                </div>
                                <div className='col-span-2 flex justify-center'>
                                  <div className='flex items-center gap-1'>
                                    <span className='text-sm text-gray-500'>R$</span>
                                    <input
                                      type='text'
                                      inputMode='decimal'
                                      value={inputEmEdicao === produto._id 
                                        ? valorTemporario 
                                        : (precos[produto._id] !== null ? formatarMoeda(precos[produto._id]) : '')}
                                      onChange={(e) => handleChangeTemporario(e.target.value)}
                                      onFocus={() => handleFocus(produto._id)}
                                      onBlur={() => handleBlur(produto._id)}
                                      onKeyDown={(e) => handleKeyDown(e, produto._id)}
                                      placeholder='0,00'
                                      className='w-24 border rounded px-2 py-1.5 text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none'
                                    />
                                  </div>
                                </div>
                                <div className={`col-span-3 text-right font-medium ${corMargem(margem)}`}>
                                  {margem !== null ? (
                                    <span>{margem.toFixed(1)}% {badgeMargem(margem)}</span>
                                  ) : (
                                    <span className='text-gray-400'>-</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* ABA: COMPARTILHAR */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {abaAtiva === 'compartilhar' && (
            <div className='bg-white rounded-lg shadow-md p-6'>
              <h2 className='text-lg font-bold text-gray-800 mb-2'>
                Compartilhar Tabela de Preços
              </h2>

              {stats?.comPreco === 0 ? (
                <div className='text-center py-8'>
                  <div className='text-5xl mb-4'>📋</div>
                  <p className='text-gray-600 mb-4'>
                    Você ainda não definiu preços de venda.
                  </p>
                  <button
                    onClick={() => setAbaAtiva('editar')}
                    className='bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition'
                  >
                    Definir Preços
                  </button>
                </div>
              ) : (
                <>
                  <p className='text-gray-600 mb-6'>
                    Exporte sua tabela para compartilhar com seus clientes.
                    <span className='text-sm text-gray-500 ml-2'>
                      ({stats?.comPreco} produtos com preço)
                    </span>
                  </p>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    {/* Excel */}
                    <div className='border-2 border-gray-200 rounded-xl p-6 hover:border-green-500 hover:shadow-lg transition'>
                      <div className='flex items-center gap-3 mb-4'>
                        <div className='w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center'>
                          <svg className='w-6 h-6 text-green-600' fill='currentColor' viewBox='0 0 24 24'>
                            <path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8 17l2-3-2-3h1.5l1.25 2 1.25-2H14l-2 3 2 3h-1.5l-1.25-2-1.25 2H8z'/>
                          </svg>
                        </div>
                        <div>
                          <h3 className='font-bold text-lg'>Excel (.xlsx)</h3>
                          <p className='text-sm text-gray-500'>Arquivo leve e editável</p>
                        </div>
                      </div>
                      
                      <div className='space-y-3'>
                        <button
                          onClick={exportarExcel}
                          disabled={exportando}
                          className='w-full bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium'
                        >
                          <IconDownload />
                          Baixar Excel
                        </button>
                        
                        <button
                          onClick={compartilharExcel}
                          disabled={exportando}
                          className='w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium'
                        >
                          <IconShare />
                          Compartilhar
                        </button>
                      </div>
                    </div>

                    {/* PDF */}
                    <div className='border-2 border-gray-200 rounded-xl p-6 hover:border-red-500 hover:shadow-lg transition'>
                      <div className='flex items-center gap-3 mb-4'>
                        <div className='w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center'>
                          <svg className='w-6 h-6 text-red-600' fill='currentColor' viewBox='0 0 24 24'>
                            <path d='M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM9 13h2v5H9v-5zm4 0h2v5h-2v-5z'/>
                          </svg>
                        </div>
                        <div>
                          <h3 className='font-bold text-lg'>PDF</h3>
                          <p className='text-sm text-gray-500'>Visual formatado para impressão</p>
                        </div>
                      </div>
                      
                      <div className='space-y-3'>
                        <button
                          onClick={baixarPDF}
                          disabled={exportando || !jsPdfLoaded}
                          className='w-full bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium'
                        >
                          <IconDownload />
                          Baixar PDF
                        </button>
                        
                        <button
                          onClick={compartilharPDF}
                          disabled={exportando || !jsPdfLoaded}
                          className='w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium'
                        >
                          <IconShare />
                          Compartilhar
                        </button>
                        
                        <button
                          onClick={visualizarPDF}
                          disabled={exportando || !jsPdfLoaded}
                          className='w-full bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm'
                        >
                          <IconPrint />
                          Visualizar / Imprimir
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div className='mt-6 border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg transition'>
                    <div className='flex items-center gap-3 mb-4'>
                      <div className='w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center'>
                        <svg className='w-6 h-6 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
                        </svg>
                      </div>
                      <div>
                        <h3 className='font-bold text-lg'>Enviar por Email</h3>
                        <p className='text-sm text-gray-500'>Baixe o arquivo e envie para seu cliente</p>
                      </div>
                    </div>
                    
                    <div className='space-y-3'>
                      <div>
                        <label className='block text-sm text-gray-600 mb-1'>Email do cliente:</label>
                        <input
                          type='email'
                          value={emailCliente}
                          onChange={(e) => setEmailCliente(e.target.value)}
                          placeholder='cliente@email.com'
                          className='w-full border rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none'
                        />
                      </div>
                      
                      <button
                        onClick={enviarPorEmail}
                        disabled={!emailCliente.trim()}
                        className='w-full bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium'
                      >
                        <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 19l9 2-9-18-9 18 9-2zm0 0v-8' />
                        </svg>
                        Abrir Email para Enviar
                      </button>
                      
                      <p className='text-xs text-gray-500 text-center'>
                        Abre seu aplicativo de email com a mensagem pronta. Anexe o PDF ou Excel antes de enviar.
                      </p>
                    </div>
                  </div>

                  {/* Dica */}
                  <div className='mt-6 p-4 bg-blue-50 rounded-lg'>
                    <p className='text-sm text-blue-800'>
                      <strong>💡 Dica:</strong> No celular, o botão "Compartilhar" abre diretamente o WhatsApp, Email e outros apps. 
                      No computador, o arquivo será baixado para você enviar manualmente.
                    </p>
                  </div>

                  {/* Preview compacto */}
                  <div className='mt-6'>
                    <h3 className='font-bold text-gray-800 mb-4'>Preview da Tabela</h3>
                    <div className='border rounded-lg overflow-hidden max-h-64 overflow-y-auto text-sm'>
                      <div className='bg-gray-800 text-white p-2 text-center'>
                        <p className='font-bold text-sm'>ELITE SURFING - Tabela de Preços</p>
                        <p className='text-xs opacity-80'>{user?.nome}</p>
                      </div>

                      {Object.entries(porCategoria).map(([categoria, produtosCategoria]) => {
                        // Filtrar produtos com preço E não ocultos
                        const produtosComPreco = produtosCategoria.filter(p => 
                          precos[p._id] && !produtosOcultos.includes(p._id)
                        );
                        if (produtosComPreco.length === 0) return null;

                        return (
                          <div key={categoria}>
                            <div className='bg-gray-700 text-white px-3 py-1 text-xs font-bold'>
                              {categoria}
                            </div>
                            <div className='divide-y'>
                              {produtosComPreco.slice(0, 2).map(produto => (
                                <div key={produto._id} className='flex justify-between px-3 py-1 text-xs'>
                                  <div className='flex gap-2'>
                                    <span className='text-gray-400'>{produto.codigo}</span>
                                    <span className='truncate max-w-[200px]'>{produto.nome}</span>
                                  </div>
                                  <span className='font-bold text-green-600 whitespace-nowrap'>
                                    R$ {formatarMoeda(precos[produto._id])}
                                  </span>
                                </div>
                              ))}
                              {produtosComPreco.length > 2 && (
                                <div className='px-3 py-0.5 text-xs text-gray-400 text-center'>
                                  + {produtosComPreco.length - 2} produtos
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* ABA: MINHAS MARGENS */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {abaAtiva === 'margens' && (
            <div>
              {/* Aviso de confidencialidade */}
              <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4'>
                <div className='flex items-center gap-2'>
                  <span className='text-xl'>🔒</span>
                  <p className='text-yellow-800 font-medium'>
                    Informação Confidencial
                  </p>
                </div>
                <p className='text-sm text-yellow-700 mt-1'>
                  Esta análise é privada e não será incluída nos arquivos compartilhados.
                </p>
              </div>

              {/* Resumo */}
              {stats && (
                <div className='bg-white rounded-lg shadow-md p-4 mb-4'>
                  <h3 className='font-bold text-gray-800 mb-4'>Resumo Geral</h3>
                  <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'>
                    <div className='text-center p-3 bg-gray-50 rounded-lg'>
                      <p className='text-2xl font-bold text-gray-800'>{stats.totalProdutos}</p>
                      <p className='text-xs text-gray-500'>Total Produtos</p>
                    </div>
                    <div className='text-center p-3 bg-blue-50 rounded-lg'>
                      <p className='text-2xl font-bold text-blue-600'>{stats.comPreco}</p>
                      <p className='text-xs text-gray-500'>Com Preço</p>
                    </div>
                    <div className='text-center p-3 bg-gray-50 rounded-lg'>
                      <p className='text-2xl font-bold text-gray-600'>{stats.semPreco}</p>
                      <p className='text-xs text-gray-500'>Sem Preço</p>
                    </div>
                    <div className='text-center p-3 bg-purple-50 rounded-lg'>
                      <p className='text-2xl font-bold text-purple-600'>{stats.margemMedia.toFixed(1)}%</p>
                      <p className='text-xs text-gray-500'>Margem Média</p>
                    </div>
                    <div className='text-center p-3 bg-green-50 rounded-lg'>
                      <p className='text-2xl font-bold text-green-600'>{stats.margemVerde}</p>
                      <p className='text-xs text-gray-500'>🟢 ≥30%</p>
                    </div>
                    <div className='text-center p-3 bg-yellow-50 rounded-lg'>
                      <p className='text-2xl font-bold text-yellow-600'>{stats.margemAmarela}</p>
                      <p className='text-xs text-gray-500'>🟡 15-29%</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabela de margens por categoria */}
              <div className='space-y-4'>
                {Object.entries(porCategoria).map(([categoria, produtosCategoria]) => {
                  const produtosComMargem = produtosCategoria.filter(p => precos[p._id]);
                  if (produtosComMargem.length === 0) return null;

                  const margemCategoria = produtosComMargem.reduce((sum, p) => {
                    const m = calcularMargem(p._id);
                    return sum + (m || 0);
                  }, 0) / produtosComMargem.length;

                  return (
                    <div key={categoria} className='bg-white rounded-lg shadow-md overflow-hidden'>
                      <button
                        onClick={() => toggleCategoria(categoria)}
                        className='w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition'
                      >
                        <div className='flex items-center gap-3'>
                          <span className='font-bold text-gray-800'>{categoria}</span>
                          <span className={`text-sm font-medium ${corMargem(margemCategoria)}`}>
                            Margem média: {margemCategoria.toFixed(1)}%
                          </span>
                        </div>
                        <svg
                          className={`w-5 h-5 text-gray-500 transition-transform ${
                            categoriasExpandidas[categoria] ? 'rotate-180' : ''
                          }`}
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                        </svg>
                      </button>

                      {categoriasExpandidas[categoria] && (
                        <div className='divide-y'>
                          {/* Header - Desktop */}
                          <div className='hidden lg:grid lg:grid-cols-12 gap-4 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase'>
                            <div className='col-span-1'>Código</div>
                            <div className='col-span-4'>Produto</div>
                            <div className='col-span-2 text-right'>Custo</div>
                            <div className='col-span-2 text-right'>Venda</div>
                            <div className='col-span-2 text-right'>Lucro</div>
                            <div className='col-span-1 text-right'>Margem</div>
                          </div>

                          {produtosCategoria.map(produto => {
                            const preco = precos[produto._id];
                            const margem = calcularMargem(produto._id);
                            const lucro = preco ? preco - produto.custoTotal : null;

                            return (
                              <div key={produto._id} className='p-4 hover:bg-gray-50'>
                                {/* Mobile */}
                                <div className='lg:hidden space-y-2'>
                                  <div className='flex justify-between'>
                                    <div>
                                      <span className='text-xs text-gray-500'>{produto.codigo}</span>
                                      <p className='font-medium'>{produto.nome}</p>
                                    </div>
                                    <span className={`font-bold ${corMargem(margem)}`}>
                                      {margem !== null ? `${margem.toFixed(1)}% ${badgeMargem(margem)}` : '-'}
                                    </span>
                                  </div>
                                  <div className='flex justify-between text-sm'>
                                    <span className='text-gray-500'>Custo: R$ {formatarMoeda(produto.custoTotal)}</span>
                                    <span className='text-gray-500'>Venda: R$ {formatarMoeda(preco)}</span>
                                    <span className={lucro && lucro > 0 ? 'text-green-600 font-medium' : 'text-red-600'}>
                                      {lucro !== null ? `${lucro > 0 ? '+' : ''}R$ ${formatarMoeda(lucro)}` : '-'}
                                    </span>
                                  </div>
                                </div>

                                {/* Desktop */}
                                <div className='hidden lg:grid lg:grid-cols-12 gap-4 items-center'>
                                  <div className='col-span-1 text-sm text-gray-600'>{produto.codigo}</div>
                                  <div className='col-span-4 font-medium truncate'>{produto.nome}</div>
                                  <div className='col-span-2 text-right text-sm text-gray-600'>
                                    R$ {formatarMoeda(produto.custoTotal)}
                                  </div>
                                  <div className='col-span-2 text-right text-sm'>
                                    {preco ? `R$ ${formatarMoeda(preco)}` : <span className='text-gray-400'>-</span>}
                                  </div>
                                  <div className='col-span-2 text-right'>
                                    {lucro !== null ? (
                                      <span className={lucro > 0 ? 'text-green-600 font-medium' : 'text-red-600'}>
                                        {lucro > 0 ? '+' : ''}R$ {formatarMoeda(lucro)}
                                      </span>
                                    ) : (
                                      <span className='text-gray-400'>-</span>
                                    )}
                                  </div>
                                  <div className={`col-span-1 text-right font-bold ${corMargem(margem)}`}>
                                    {margem !== null ? `${margem.toFixed(1)}%` : '-'}
                                    {' '}{badgeMargem(margem)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}