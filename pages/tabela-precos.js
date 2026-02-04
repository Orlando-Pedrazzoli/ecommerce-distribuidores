// pages/tabela-precos.js
// ===================================
// Página de Tabela de Preços do Distribuidor
// 🆕 COM DRAG & DROP PARA CATEGORIAS E PRODUTOS

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Script from 'next/script';
import Layout from '../components/Layout';
import { useToastContext } from '../pages/_app';

// 🆕 Imports do dnd-kit
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ══════════════════════════════════════════════════════════════
// 🆕 COMPONENTE: Item Arrastável de Categoria
// ══════════════════════════════════════════════════════════════
function SortableCategory({ id, children, disabled }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* Tornar TODA a header da categoria arrastável */}
      <div className="category-drag-area" {...listeners}>
        {children({ isDragging })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 🆕 COMPONENTE: Item Arrastável de Produto
// ══════════════════════════════════════════════════════════════
function SortableProduct({ id, children, disabled }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children({ listeners, isDragging })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════
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

  // Estados de ordenação
  const [ordemCategorias, setOrdemCategorias] = useState([]);
  const [ordemCategoriasOriginal, setOrdemCategoriasOriginal] = useState([]);
  const [ordemProdutos, setOrdemProdutos] = useState({});
  const [ordemProdutosOriginal, setOrdemProdutosOriginal] = useState({});

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

  // 🆕 Estado para modo de reordenação
  const [modoReordenar, setModoReordenar] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [activeType, setActiveType] = useState(null); // 'category' ou 'product'

  // 🆕 Sensores para drag & drop (mouse, touch, teclado)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
      
      // Carregar ordem das categorias
      const ordem = data.ordemCategorias || Object.keys(data.porCategoria || {});
      setOrdemCategorias(ordem);
      setOrdemCategoriasOriginal(ordem);

      // 🆕 Carregar ordem dos produtos
      const ordemProds = data.ordemProdutos || {};
      setOrdemProdutos(ordemProds);
      setOrdemProdutosOriginal(ordemProds);

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
    const precosChanged = Object.keys(precos).some(
      id => precos[id] !== precosOriginais[id]
    );
    const ordemCatChanged = JSON.stringify(ordemCategorias) !== JSON.stringify(ordemCategoriasOriginal);
    const ordemProdChanged = JSON.stringify(ordemProdutos) !== JSON.stringify(ordemProdutosOriginal);
    setHasChanges(precosChanged || ordemCatChanged || ordemProdChanged);
  }, [precos, precosOriginais, ordemCategorias, ordemCategoriasOriginal, ordemProdutos, ordemProdutosOriginal]);

  // ══════════════════════════════════════════════════════════════
  // 🆕 HANDLERS DE DRAG & DROP
  // ══════════════════════════════════════════════════════════════
  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
    
    // Determinar se é categoria ou produto
    if (ordemCategorias.includes(active.id)) {
      setActiveType('category');
    } else {
      setActiveType('product');
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveType(null);

    if (!over || active.id === over.id) return;

    // Se está arrastando uma categoria
    if (ordemCategorias.includes(active.id) && ordemCategorias.includes(over.id)) {
      const oldIndex = ordemCategorias.indexOf(active.id);
      const newIndex = ordemCategorias.indexOf(over.id);
      setOrdemCategorias(arrayMove(ordemCategorias, oldIndex, newIndex));
      return;
    }

    // Se está arrastando um produto
    // Encontrar a categoria do produto
    for (const [categoria, prods] of Object.entries(porCategoria)) {
      const prodIds = prods.map(p => p._id);
      const activeIndex = prodIds.indexOf(active.id);
      const overIndex = prodIds.indexOf(over.id);

      if (activeIndex !== -1 && overIndex !== -1) {
        // Ambos estão na mesma categoria
        const novaOrdem = arrayMove(prodIds, activeIndex, overIndex);
        setOrdemProdutos(prev => ({
          ...prev,
          [categoria]: novaOrdem
        }));
        
        // Atualizar porCategoria para refletir a nova ordem
        setPorCategoria(prev => ({
          ...prev,
          [categoria]: novaOrdem.map(id => prev[categoria].find(p => p._id === id))
        }));
        return;
      }
    }
  };

  // Handlers de edição de preços
  const handleFocus = (produtoId) => {
    const valorAtual = precos[produtoId];
    setInputEmEdicao(produtoId);
    setValorTemporario(valorAtual !== null && valorAtual !== undefined ? valorAtual.toString().replace('.', ',') : '');
  };

  const handleBlur = (produtoId) => {
    const valorParseado = parsearMoeda(valorTemporario);
    setPrecos(prev => ({
      ...prev,
      [produtoId]: valorParseado
    }));
    setInputEmEdicao(null);
    setValorTemporario('');
  };

  const handleChangeTemporario = (valor) => {
    const valorLimpo = valor.replace(/[^0-9.,]/g, '');
    setValorTemporario(valorLimpo);
  };

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
        body: JSON.stringify({ 
          precos, 
          produtosOcultos,
          ordemCategorias,
          ordemProdutos
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const data = await response.json();
      setPrecosOriginais({ ...precos });
      setOrdemCategoriasOriginal([...ordemCategorias]);
      setOrdemProdutosOriginal({ ...ordemProdutos });
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
    const contentWidth = pageWidth - (margin * 2);

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

      const produtosComPreco = produtosCategoria.filter(p => 
        precos[p._id] && !produtosOcultos.includes(p._id)
      );
      if (produtosComPreco.length === 0) return;

      if (yPos > 270) {
        doc.addPage();
        yPos = 15;
      }

      doc.setFillColor(26, 54, 93);
      doc.rect(margin, yPos - 4, contentWidth, 7, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255);
      doc.text(categoria.toUpperCase(), margin + 3, yPos);
      yPos += 6;

      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPos - 3, contentWidth, 5, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100);
      doc.text('Código', margin + 2, yPos);
      
      // Mostrar nome do produto completo no PDF
      doc.text('Produto', margin + 25, yPos);
      doc.text('Preço', pageWidth - margin - 2, yPos, { align: 'right' });
      yPos += 4;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50);
      
      produtosComPreco.forEach((produto, index) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 15;
          
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
        let nomeProduto = produto.nome || '';
        // Mostrar nome completo no PDF
        doc.text(nomeProduto, margin + 25, yPos);
        
        doc.setTextColor(22, 163, 74);
        doc.setFont('helvetica', 'bold');
        doc.text(`R$ ${formatarMoeda(precos[produto._id])}`, pageWidth - margin - 2, yPos, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        
        yPos += 5;
      });

      yPos += 4;
    });

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

    window.open(`mailto:${emailCliente}?subject=${assunto}&body=${corpo}`, '_blank');
    toast.success('Email aberto! Anexe o PDF ou Excel antes de enviar.');
  };

  // Filtrar produtos
  const produtosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    const filtrado = {};
    
    ordemCategorias.forEach((cat) => {
      const prods = porCategoria[cat];
      if (!prods) return;
      
      const prodsFiltrados = prods.filter(p => {
        const passaBusca = !termo || 
          p.nome?.toLowerCase().includes(termo) ||
          p.codigo?.toLowerCase().includes(termo);
        const passaOculto = mostrarOcultos || !produtosOcultos.includes(p._id);
        return passaBusca && passaOculto;
      });
      
      if (prodsFiltrados.length > 0) {
        filtrado[cat] = prodsFiltrados;
      }
    });
    
    return filtrado;
  }, [porCategoria, busca, mostrarOcultos, produtosOcultos, ordemCategorias]);

  const totalOcultos = produtosOcultos.length;

  const calcularMargem = (produtoId) => {
    const produto = produtos.find(p => p._id === produtoId);
    if (!produto) return null;
    
    const preco = precos[produtoId];
    if (!preco || produto.custoTotal <= 0) return null;
    
    return ((preco - produto.custoTotal) / produto.custoTotal) * 100;
  };

  const corMargem = (margem) => {
    if (margem === null) return 'text-gray-400';
    if (margem >= 30) return 'text-green-600';
    if (margem >= 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  const badgeMargem = (margem) => {
    if (margem === null) return null;
    if (margem >= 30) return '🟢';
    if (margem >= 15) return '🟡';
    return '🔴';
  };

  const toggleCategoria = (categoria) => {
    setCategoriasExpandidas(prev => ({
      ...prev,
      [categoria]: !prev[categoria]
    }));
  };

  // Ícones
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

  // 🆕 Ícone de arrastar
  const IconDrag = () => (
    <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 8h16M4 16h16' />
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

                  {/* Botões de controle */}
                  <div className='flex items-center gap-2 flex-wrap'>
                    {/* Toggle modo reordenar */}
                    <button
                      onClick={() => setModoReordenar(!modoReordenar)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition ${
                        modoReordenar 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      }`}
                    >
                      <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4' />
                      </svg>
                      <span>{modoReordenar ? 'Sair Ordenação' : 'Ordenar'}</span>
                    </button>

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
                        <span>Ocultos ({totalOcultos})</span>
                      </button>
                    )}
                  </div>

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
                    ⚠️ Você tem alterações não salvas
                  </p>
                )}

                {/* Dica do modo reordenar */}
                {modoReordenar && (
                  <div className='mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg'>
                    <p className='text-sm text-purple-800'>
                      <strong>📋 Modo Ordenação:</strong> Arraste as categorias ou produtos usando o ícone ≡ para reordenar. 
                      A nova ordem será aplicada na tabela, PDF e Excel após salvar.
                    </p>
                  </div>
                )}
              </div>

              {/* 🆕 Lista com Drag & Drop */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={ordemCategorias}
                  strategy={verticalListSortingStrategy}
                  disabled={!modoReordenar}
                >
                  <div className='space-y-4'>
                    {ordemCategorias.map((categoria) => {
                      const produtosCategoria = produtosFiltrados[categoria];
                      if (!produtosCategoria) return null;

                      return (
                        <SortableCategory 
                          key={categoria} 
                          id={categoria}
                          disabled={!modoReordenar}
                        >
                          {({ isDragging: catIsDragging }) => (
                            <div 
                              className={`bg-white rounded-lg shadow-md overflow-hidden ${catIsDragging ? 'ring-2 ring-purple-500 shadow-lg' : ''} ${modoReordenar ? 'cursor-move' : ''}`}
                              data-id={categoria}
                            >
                              {/* Header da categoria - Toda área é arrastável quando modoReordenar está ativo */}
                              <div 
                                className={`flex items-center bg-gray-50 ${modoReordenar ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                onClick={(e) => {
                                  // Impede o toggle da categoria quando arrastando
                                  if (modoReordenar) {
                                    e.stopPropagation();
                                  }
                                }}
                              >
                                {/* Indicador visual de arraste */}
                                {modoReordenar && (
                                  <div className='p-3 text-purple-500'>
                                    <IconDrag />
                                  </div>
                                )}

                                <button
                                  onClick={(e) => {
                                    if (modoReordenar) {
                                      e.stopPropagation(); // Evita clique durante arraste
                                    } else {
                                      toggleCategoria(categoria);
                                    }
                                  }}
                                  className='flex-1 flex items-center justify-between p-4 hover:bg-gray-100 transition text-left'
                                >
                                  <div className='flex items-center gap-2'>
                                    {modoReordenar && (
                                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                        Arraste
                                      </span>
                                    )}
                                    <span className='font-bold text-gray-800'>{categoria}</span>
                                    <span className='text-sm text-gray-500'>
                                      ({produtosCategoria.length} produtos)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {catIsDragging && (
                                      <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded-full animate-pulse">
                                        Solte para reposicionar
                                      </span>
                                    )}
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
                                  </div>
                                </button>
                              </div>

                              {/* Produtos */}
                              {categoriasExpandidas[categoria] && (
                                <div className='divide-y'>
                                  {/* Header da tabela - Desktop */}
                                  <div className='hidden lg:grid lg:grid-cols-12 gap-4 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase'>
                                    {modoReordenar && <div className='col-span-1'></div>}
                                    <div className={modoReordenar ? 'col-span-1' : 'col-span-1'}>Código</div>
                                    <div className={modoReordenar ? 'col-span-3' : 'col-span-4'}>Produto</div>
                                    <div className='col-span-2 text-right'>Custo</div>
                                    <div className='col-span-2 text-center'>Preço Venda</div>
                                    <div className='col-span-3 text-right'>Margem</div>
                                  </div>

                                  <SortableContext
                                    items={produtosCategoria.map(p => p._id)}
                                    strategy={verticalListSortingStrategy}
                                    disabled={!modoReordenar}
                                  >
                                    {produtosCategoria.map(produto => {
                                      const margem = calcularMargem(produto._id);
                                      const isOculto = produtosOcultos.includes(produto._id);
                                      
                                      return (
                                        <SortableProduct
                                          key={produto._id}
                                          id={produto._id}
                                          disabled={!modoReordenar}
                                        >
                                          {({ listeners: prodListeners, isDragging: prodIsDragging }) => (
                                            <div
                                              className={`p-4 hover:bg-gray-50 transition ${isOculto ? 'opacity-50 bg-gray-100' : ''} ${prodIsDragging ? 'bg-purple-50 ring-2 ring-purple-300' : ''}`}
                                            >
                                              {/* Mobile */}
                                              <div className='lg:hidden space-y-2'>
                                                <div className='flex justify-between items-start'>
                                                  <div className='flex items-start gap-2'>
                                                    {/* Handle para arrastar produto - Mobile */}
                                                    {modoReordenar && (
                                                      <div 
                                                        {...prodListeners}
                                                        className='p-1 cursor-grab active:cursor-grabbing text-purple-400'
                                                      >
                                                        <IconDrag />
                                                      </div>
                                                    )}
                                                    {/* Botão ocultar */}
                                                    {!modoReordenar && (
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
                                                    )}
                                                    <div>
                                                      <span className='text-xs text-gray-500'>{produto.codigo}</span>
                                                      <p className='font-medium text-gray-800 whitespace-normal break-words'>{produto.nome}</p>
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
                                                      disabled={modoReordenar}
                                                      className='w-24 border rounded px-2 py-1 text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100'
                                                    />
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Desktop */}
                                              <div className='hidden lg:grid lg:grid-cols-12 gap-4 items-center'>
                                                {/* Handle para arrastar produto - Desktop */}
                                                {modoReordenar && (
                                                  <div 
                                                    {...prodListeners}
                                                    className='col-span-1 flex justify-center cursor-grab active:cursor-grabbing text-purple-400 hover:text-purple-600'
                                                  >
                                                    <IconDrag />
                                                  </div>
                                                )}
                                                {/* Botão ocultar + Código */}
                                                <div className={`${modoReordenar ? 'col-span-1' : 'col-span-1'} flex items-center`}>
                                                  {!modoReordenar && (
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
                                                  )}
                                                  <span className='text-sm text-gray-600 ml-1'>{produto.codigo}</span>
                                                </div>
                                                <div className={modoReordenar ? 'col-span-3' : 'col-span-4'}>
                                                  <p className='font-medium text-gray-800 whitespace-normal break-words' title={produto.nome}>
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
                                                      disabled={modoReordenar}
                                                      className='w-24 border rounded px-2 py-1.5 text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100'
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
                                          )}
                                        </SortableProduct>
                                      );
                                    })}
                                  </SortableContext>
                                </div>
                              )}
                            </div>
                          )}
                        </SortableCategory>
                      );
                    })}
                  </div>
                </SortableContext>

                {/* Overlay durante arraste */}
                <DragOverlay>
                  {activeId && activeType === 'category' ? (
                    <div className='bg-purple-100 border-2 border-purple-500 rounded-lg p-4 shadow-xl transform rotate-2'>
                      <div className='flex items-center gap-2'>
                        <IconDrag />
                        <span className='font-bold text-purple-800'>{activeId}</span>
                        <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded-full">
                          Arrastando
                        </span>
                      </div>
                    </div>
                  ) : activeId && activeType === 'product' ? (
                    <div className='bg-purple-50 border-2 border-purple-400 rounded p-3 shadow-lg'>
                      <span className='text-purple-700'>
                        {produtos.find(p => p._id === activeId)?.nome || activeId}
                      </span>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
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

                  <div className='mt-6 p-4 bg-blue-50 rounded-lg'>
                    <p className='text-sm text-blue-800'>
                      <strong>💡 Dica:</strong> No celular, o botão "Compartilhar" abre diretamente o WhatsApp, Email e outros apps. 
                      No computador, o arquivo será baixado para você enviar manualmente.
                    </p>
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

              <div className='space-y-4'>
                {ordemCategorias.map((categoria) => {
                  const produtosCategoria = porCategoria[categoria];
                  if (!produtosCategoria) return null;

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
                                <div className='lg:hidden space-y-2'>
                                  <div className='flex justify-between'>
                                    <div>
                                      <span className='text-xs text-gray-500'>{produto.codigo}</span>
                                      <p className='font-medium whitespace-normal break-words'>{produto.nome}</p>
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

                                <div className='hidden lg:grid lg:grid-cols-12 gap-4 items-center'>
                                  <div className='col-span-1 text-sm text-gray-600'>{produto.codigo}</div>
                                  <div className='col-span-4 font-medium whitespace-normal break-words'>{produto.nome}</div>
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