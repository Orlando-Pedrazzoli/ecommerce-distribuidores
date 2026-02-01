// pages/tabela-precos.js
// ===================================
// Página de Tabela de Preços do Distribuidor
// 3 abas: Editar Preços | Compartilhar | Minhas Margens

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
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
  const [abaAtiva, setAbaAtiva] = useState('editar'); // editar | compartilhar | margens
  const [busca, setBusca] = useState('');
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({});
  const [margemRapida, setMargemRapida] = useState('30');
  const [exportando, setExportando] = useState(false);

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
        body: JSON.stringify({ precos })
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
      
      // Recarregar para atualizar stats
      carregarTabela();

    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error(error.message || 'Erro ao salvar tabela');
    } finally {
      setSaving(false);
    }
  };

  // Exportar Excel
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
      a.download = `Tabela_Precos_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Excel exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast.error(error.message || 'Erro ao exportar Excel');
    } finally {
      setExportando(false);
    }
  };

  // Exportar PDF
  const exportarPdf = async () => {
    try {
      setExportando(true);
      const response = await fetch('/api/user/exportar-pdf');
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tabela_Precos_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error(error.message || 'Erro ao exportar PDF');
    } finally {
      setExportando(false);
    }
  };

  // Filtrar produtos por busca
  const produtosFiltrados = useMemo(() => {
    if (!busca.trim()) return porCategoria;
    
    const termo = busca.toLowerCase();
    const filtrado = {};
    
    Object.entries(porCategoria).forEach(([cat, prods]) => {
      const prodsFiltrados = prods.filter(p => 
        p.nome?.toLowerCase().includes(termo) ||
        p.codigo?.toLowerCase().includes(termo)
      );
      if (prodsFiltrados.length > 0) {
        filtrado[cat] = prodsFiltrados;
      }
    });
    
    return filtrado;
  }, [porCategoria, busca]);

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
                          <div className='col-span-2'>Código</div>
                          <div className='col-span-4'>Produto</div>
                          <div className='col-span-2 text-right'>Custo</div>
                          <div className='col-span-2 text-center'>Preço Venda</div>
                          <div className='col-span-2 text-right'>Margem</div>
                        </div>

                        {produtosCategoria.map(produto => {
                          const margem = calcularMargem(produto._id);
                          
                          return (
                            <div
                              key={produto._id}
                              className='p-4 hover:bg-gray-50 transition'
                            >
                              {/* Mobile */}
                              <div className='lg:hidden space-y-2'>
                                <div className='flex justify-between items-start'>
                                  <div>
                                    <span className='text-xs text-gray-500'>{produto.codigo}</span>
                                    <p className='font-medium text-gray-800'>{produto.nome}</p>
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
                                      value={precos[produto._id] !== null ? formatarMoeda(precos[produto._id]) : ''}
                                      onChange={(e) => atualizarPreco(produto._id, e.target.value)}
                                      placeholder='0,00'
                                      className='w-24 border rounded px-2 py-1 text-sm text-right'
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Desktop */}
                              <div className='hidden lg:grid lg:grid-cols-12 gap-4 items-center'>
                                <div className='col-span-2 text-sm text-gray-600'>
                                  {produto.codigo}
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
                                      value={precos[produto._id] !== null ? formatarMoeda(precos[produto._id]) : ''}
                                      onChange={(e) => atualizarPreco(produto._id, e.target.value)}
                                      placeholder='0,00'
                                      className='w-24 border rounded px-2 py-1.5 text-sm text-right focus:border-blue-500 focus:outline-none'
                                    />
                                  </div>
                                </div>
                                <div className={`col-span-2 text-right font-medium ${corMargem(margem)}`}>
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
              <h2 className='text-lg font-bold text-gray-800 mb-4'>
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
                    Exporte sua tabela de preços para compartilhar com seus clientes.
                    <br />
                    <span className='text-sm text-gray-500'>
                      {stats?.comPreco} produtos com preço definido
                    </span>
                  </p>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    {/* Excel */}
                    <div className='border rounded-lg p-6 text-center hover:border-green-500 hover:bg-green-50 transition'>
                      <div className='text-5xl mb-4'>📥</div>
                      <h3 className='font-bold text-lg mb-2'>Excel (.xlsx)</h3>
                      <p className='text-sm text-gray-600 mb-4'>
                        Sem fotos, arquivo leve.<br />
                        Ideal para envio por WhatsApp.
                      </p>
                      <button
                        onClick={exportarExcel}
                        disabled={exportando}
                        className='bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-2 mx-auto'
                      >
                        {exportando ? (
                          <>
                            <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                            Gerando...
                          </>
                        ) : (
                          'Baixar Excel'
                        )}
                      </button>
                    </div>

                    {/* PDF */}
                    <div className='border rounded-lg p-6 text-center hover:border-red-500 hover:bg-red-50 transition'>
                      <div className='text-5xl mb-4'>📄</div>
                      <h3 className='font-bold text-lg mb-2'>PDF com Fotos</h3>
                      <p className='text-sm text-gray-600 mb-4'>
                        Visual rico com imagens.<br />
                        Ideal para impressão.
                      </p>
                      <button
                        onClick={exportarPdf}
                        disabled={exportando}
                        className='bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2 mx-auto'
                      >
                        {exportando ? (
                          <>
                            <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                            Gerando...
                          </>
                        ) : (
                          'Baixar PDF'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className='mt-8'>
                    <h3 className='font-bold text-gray-800 mb-4'>Preview da Tabela</h3>
                    <div className='border rounded-lg overflow-hidden max-h-96 overflow-y-auto'>
                      <div className='bg-gray-800 text-white p-4 text-center'>
                        <p className='font-bold text-lg'>ELITE SURFING</p>
                        <p className='text-sm opacity-80'>Tabela de Preços - {user?.nome}</p>
                      </div>

                      {Object.entries(porCategoria).map(([categoria, produtosCategoria]) => {
                        const produtosComPreco = produtosCategoria.filter(p => precos[p._id]);
                        if (produtosComPreco.length === 0) return null;

                        return (
                          <div key={categoria} className='border-b'>
                            <div className='bg-gray-100 px-4 py-2 font-bold text-gray-700'>
                              {categoria}
                            </div>
                            <div className='divide-y'>
                              {produtosComPreco.map(produto => (
                                <div key={produto._id} className='flex justify-between px-4 py-2 text-sm'>
                                  <div>
                                    <span className='text-gray-500 mr-2'>{produto.codigo}</span>
                                    <span>{produto.nome}</span>
                                  </div>
                                  <span className='font-bold text-green-600'>
                                    R$ {formatarMoeda(precos[produto._id])}
                                  </span>
                                </div>
                              ))}
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