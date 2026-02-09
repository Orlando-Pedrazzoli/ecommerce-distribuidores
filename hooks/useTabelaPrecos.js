// hooks/useTabelaPrecos.js
// Hook principal com estado e lógica de negócio da Tabela de Preços

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useToastContext } from '../pages/_app';
import { parsearMoeda, calcularMargem } from '../utils/formatters';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

export default function useTabelaPrecos() {
  const router = useRouter();
  const toast = useToastContext();

  // ══════════════════════════════════════════════════════════════
  // ESTADOS
  // ══════════════════════════════════════════════════════════════
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
  const [fornecedoresOcultos, setFornecedoresOcultos] = useState([]);
  const [mostrarOcultos, setMostrarOcultos] = useState(false);

  // Estado para email
  const [emailCliente, setEmailCliente] = useState('');

  // Estado para modo de reordenação
  const [modoReordenar, setModoReordenar] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [activeType, setActiveType] = useState(null);

  // Sensores para drag & drop
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

  // ══════════════════════════════════════════════════════════════
  // CARREGAR DADOS
  // ══════════════════════════════════════════════════════════════
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
      setFornecedoresOcultos(data.fornecedoresOcultos || []);

      // Carregar ordem das categorias
      const ordem = data.ordemCategorias || Object.keys(data.porCategoria || {});
      setOrdemCategorias(ordem);
      setOrdemCategoriasOriginal(ordem);

      // Carregar ordem dos produtos
      const ordemProds = data.ordemProdutos || {};
      setOrdemProdutos(ordemProds);
      setOrdemProdutosOriginal(ordemProds);

      // Inicializar preços
      const precosIniciais = {};
      (data.produtos || []).forEach((p) => {
        precosIniciais[p._id] = p.precoVenda;
      });
      setPrecos(precosIniciais);
      setPrecosOriginais(precosIniciais);

      // Expandir todas as categorias
      const expandidas = {};
      Object.keys(data.porCategoria || {}).forEach((cat) => {
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

  // ══════════════════════════════════════════════════════════════
  // DETECTAR MUDANÇAS
  // ══════════════════════════════════════════════════════════════
  useEffect(() => {
    const precosChanged = Object.keys(precos).some(
      (id) => precos[id] !== precosOriginais[id]
    );
    const ordemCatChanged =
      JSON.stringify(ordemCategorias) !== JSON.stringify(ordemCategoriasOriginal);
    const ordemProdChanged =
      JSON.stringify(ordemProdutos) !== JSON.stringify(ordemProdutosOriginal);
    setHasChanges(precosChanged || ordemCatChanged || ordemProdChanged);
  }, [precos, precosOriginais, ordemCategorias, ordemCategoriasOriginal, ordemProdutos, ordemProdutosOriginal]);

  // ══════════════════════════════════════════════════════════════
  // HANDLERS DE DRAG & DROP
  // ══════════════════════════════════════════════════════════════
  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
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

    // Arrastando categoria
    if (ordemCategorias.includes(active.id) && ordemCategorias.includes(over.id)) {
      const oldIndex = ordemCategorias.indexOf(active.id);
      const newIndex = ordemCategorias.indexOf(over.id);
      setOrdemCategorias(arrayMove(ordemCategorias, oldIndex, newIndex));
      return;
    }

    // Arrastando produto
    for (const [categoria, prods] of Object.entries(porCategoria)) {
      const prodIds = prods.map((p) => p._id);
      const activeIndex = prodIds.indexOf(active.id);
      const overIndex = prodIds.indexOf(over.id);

      if (activeIndex !== -1 && overIndex !== -1) {
        const novaOrdem = arrayMove(prodIds, activeIndex, overIndex);
        setOrdemProdutos((prev) => ({
          ...prev,
          [categoria]: novaOrdem,
        }));
        setPorCategoria((prev) => ({
          ...prev,
          [categoria]: novaOrdem.map((id) => prev[categoria].find((p) => p._id === id)),
        }));
        return;
      }
    }
  };

  // ══════════════════════════════════════════════════════════════
  // HANDLERS DE EDIÇÃO DE PREÇOS
  // ══════════════════════════════════════════════════════════════
  const handleFocus = (produtoId) => {
    const valorAtual = precos[produtoId];
    setInputEmEdicao(produtoId);
    setValorTemporario(
      valorAtual !== null && valorAtual !== undefined
        ? valorAtual.toString().replace('.', ',')
        : ''
    );
  };

  const handleBlur = (produtoId) => {
    const valorParseado = parsearMoeda(valorTemporario);
    setPrecos((prev) => ({
      ...prev,
      [produtoId]: valorParseado,
    }));
    setInputEmEdicao(null);
    setValorTemporario('');
  };

  const handleChangeTemporario = (valor) => {
    const valorLimpo = valor.replace(/[^0-9.,]/g, '');
    setValorTemporario(valorLimpo);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  // ══════════════════════════════════════════════════════════════
  // AÇÕES
  // ══════════════════════════════════════════════════════════════
  const toggleOculto = (produtoId) => {
    setProdutosOcultos((prev) => {
      if (prev.includes(produtoId)) {
        return prev.filter((id) => id !== produtoId);
      } else {
        return [...prev, produtoId];
      }
    });
    setHasChanges(true);
  };

  const toggleCategoria = (categoria) => {
    setCategoriasExpandidas((prev) => ({
      ...prev,
      [categoria]: !prev[categoria],
    }));
  };

  const aplicarMargemGlobal = () => {
    const margem = parseFloat(margemRapida) / 100;
    if (isNaN(margem) || margem < 0) {
      toast.warning('Margem inválida');
      return;
    }

    const novosPrecos = { ...precos };
    produtos.forEach((p) => {
      if (p.custoTotal > 0) {
        novosPrecos[p._id] = Math.round(p.custoTotal * (1 + margem) * 100) / 100;
      }
    });
    setPrecos(novosPrecos);
    toast.success(`Margem de ${margemRapida}% aplicada a todos os produtos`);
  };

  const salvarAlteracoes = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/user/tabela-precos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          precos,
          produtosOcultos,
          fornecedoresOcultos,
          ordemCategorias,
          ordemProdutos,
        }),
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
  // PRODUTOS FILTRADOS (memo)
  // ══════════════════════════════════════════════════════════════
  const produtosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    const filtrado = {};

    ordemCategorias.forEach((cat) => {
      const prods = porCategoria[cat];
      if (!prods) return;

      const prodsFiltrados = prods.filter((p) => {
        const passaBusca =
          !termo ||
          p.nome?.toLowerCase().includes(termo) ||
          p.codigo?.toLowerCase().includes(termo);
        const passaOculto = mostrarOcultos || !produtosOcultos.includes(p._id);
        const passaFornecedor = mostrarOcultos || !fornecedoresOcultos.includes(p.fornecedor);
        return passaBusca && passaOculto && passaFornecedor;
      });

      if (prodsFiltrados.length > 0) {
        filtrado[cat] = prodsFiltrados;
      }
    });

    return filtrado;
  }, [porCategoria, busca, mostrarOcultos, produtosOcultos, fornecedoresOcultos, ordemCategorias]);

  const totalOcultos = produtosOcultos.length;

  // Lista única de fornecedores extraída dos produtos
  const fornecedores = useMemo(() => {
    const set = new Set();
    produtos.forEach((p) => {
      if (p.fornecedor && p.fornecedor !== 'N/A') set.add(p.fornecedor);
    });
    return [...set].sort();
  }, [produtos]);

  // Toggle fornecedor oculto
  const toggleFornecedorOculto = (fornecedor) => {
    setFornecedoresOcultos((prev) => {
      if (prev.includes(fornecedor)) {
        return prev.filter((f) => f !== fornecedor);
      } else {
        return [...prev, fornecedor];
      }
    });
    setHasChanges(true);
  };

  // Desocultar todos (fornecedores + produtos individuais)
  const desocultarTodos = () => {
    setFornecedoresOcultos([]);
    setProdutosOcultos([]);
    setHasChanges(true);
  };

  // Contar produtos ocultos por fornecedor
  const totalOcultosGeral = produtosOcultos.length + 
    produtos.filter((p) => fornecedoresOcultos.includes(p.fornecedor) && !produtosOcultos.includes(p._id)).length;

  // ══════════════════════════════════════════════════════════════
  // RETORNO
  // ══════════════════════════════════════════════════════════════
  return {
    // Dados
    loading,
    saving,
    user,
    produtos,
    porCategoria,
    stats,
    ultimaAtualizacao,
    precos,
    hasChanges,
    ordemCategorias,
    ordemProdutos,
    produtosFiltrados,
    totalOcultos,
    totalOcultosGeral,
    produtosOcultos,
    fornecedores,
    fornecedoresOcultos,

    // UI State
    abaAtiva,
    setAbaAtiva,
    busca,
    setBusca,
    categoriasExpandidas,
    margemRapida,
    setMargemRapida,
    exportando,
    setExportando,
    jsPdfLoaded,
    setJsPdfLoaded,
    inputEmEdicao,
    valorTemporario,
    mostrarOcultos,
    setMostrarOcultos,
    emailCliente,
    setEmailCliente,
    modoReordenar,
    setModoReordenar,
    activeId,
    activeType,
    sensors,

    // Handlers
    handleDragStart,
    handleDragEnd,
    handleFocus,
    handleBlur,
    handleChangeTemporario,
    handleKeyDown,
    toggleOculto,
    toggleFornecedorOculto,
    desocultarTodos,
    toggleCategoria,
    aplicarMargemGlobal,
    salvarAlteracoes,
    carregarTabela,

    // Toast (for export hook)
    toast,
  };
}