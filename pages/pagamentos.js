// PAGES/PAGAMENTOS.JS - PÁGINA DE PAGAMENTOS DO DISTRIBUIDOR
// ===================================
// Distribuidor vê: status de pagamentos (royalties, etiquetas, embalagens)
// Atualizado pelo Admin

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Head from 'next/head';

export default function Pagamentos() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos'); // todos, pendente, pago
  const [user, setUser] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    verificarAuth();
  }, []);

  const verificarAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/');
        return;
      }
      const data = await response.json();
      
      // Admin usa página específica
      if (data.user.tipo === 'admin') {
        router.push('/admin/financeiro');
        return;
      }
      
      setUser(data.user);
      carregarPagamentos();
    } catch (error) {
      console.error('Erro ao verificar auth:', error);
      router.push('/');
    }
  };

  const carregarPagamentos = async () => {
    try {
      setLoading(true);
      setErro(null);
      
      const response = await fetch('/api/user/pagamentos');
      
      if (response.ok) {
        const data = await response.json();
        setPedidos(data.pedidos || []);
        setResumo(data.resumo || null);
      } else if (response.status === 401) {
        router.push('/');
      } else {
        const errorData = await response.json();
        setErro(errorData.message || 'Erro ao carregar pagamentos');
      }
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar pedidos
  const pedidosFiltrados = pedidos.filter(pedido => {
    if (filtro === 'todos') return true;
    
    const cf = pedido.controleFinanceiro || {};
    const temPendente = 
      cf?.royalties?.status === 'pendente' ||
      cf?.etiquetas?.status === 'pendente' ||
      cf?.embalagens?.status === 'pendente';
    
    if (filtro === 'pendente') return temPendente;
    if (filtro === 'pago') return !temPendente;
    return true;
  });

  const formatarData = (data) => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  // Formato brasileiro: R$ 1.346,38
  const formatarMoeda = (valor) => {
    return `R$ ${(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status) => {
    if (status === 'pago') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✓ Pago
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        ⏳ Pendente
      </span>
    );
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Pagamentos - Elite Surfing</title>
        </Head>
        <Layout>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando pagamentos...</p>
            </div>
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Pagamentos - Elite Surfing</title>
      </Head>
      <Layout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-6xl mx-auto px-4">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">💳 Meus Pagamentos</h1>
                  <p className="text-gray-600 mt-1">
                    Acompanhe o status dos pagamentos dos seus pedidos
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                  >
                    ← Dashboard
                  </button>
                  <button
                    onClick={() => router.push('/meus-pedidos')}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                  >
                    📋 Ver Pedidos
                  </button>
                </div>
              </div>
            </div>

            {/* Erro */}
            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <p className="text-red-600">{erro}</p>
                <button
                  onClick={carregarPagamentos}
                  className="mt-2 text-red-700 underline"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {/* Resumo Geral */}
            {resumo && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                  <p className="text-sm text-gray-600 mb-1">Total em Pedidos</p>
                  <p className="text-2xl font-bold text-blue-600">{formatarMoeda(resumo.totalPedidos)}</p>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-yellow-500">
                  <p className="text-sm text-gray-600 mb-1">Royalties Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-600">{formatarMoeda(resumo.royaltiesPendentes)}</p>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
                  <p className="text-sm text-gray-600 mb-1">Etiquetas Pendentes</p>
                  <p className="text-2xl font-bold text-orange-600">{formatarMoeda(resumo.etiquetasPendentes)}</p>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
                  <p className="text-sm text-gray-600 mb-1">Embalagens Pendentes</p>
                  <p className="text-2xl font-bold text-purple-600">{formatarMoeda(resumo.embalagensPendentes)}</p>
                </div>
              </div>
            )}

            {/* Royalties Pendentes Destacado - APENAS ROYALTIES */}
            {resumo && (resumo.royaltiesPendentes || 0) > 0 && (
              <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg p-6 mb-8 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 mb-1">Royalties Pendentes de Pagamento</p>
                    <p className="text-4xl font-bold">
                      {formatarMoeda(resumo.royaltiesPendentes)}
                    </p>
                  </div>
                 
                </div>
              </div>
            )}

            {/* Filtros */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <span className="text-gray-600 font-medium">Filtrar:</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'todos', label: 'Todos' },
                    { value: 'pendente', label: '⏳ Pendentes' },
                    { value: 'pago', label: '✓ Pagos' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setFiltro(value)}
                      className={`px-4 py-2 rounded-lg transition ${
                        filtro === value
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Lista de Pedidos com Status de Pagamento */}
            {pedidosFiltrados.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  Nenhum pagamento encontrado
                </h3>
                <p className="text-gray-500">
                  {filtro === 'todos' 
                    ? 'Você ainda não tem pedidos com pagamentos.'
                    : `Não há pagamentos com status "${filtro}".`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pedidosFiltrados.map((pedido) => {
                  const cf = pedido.controleFinanceiro || {};
                  
                  return (
                    <div key={pedido._id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                      {/* Header do Pedido */}
                      <div className="bg-gray-50 px-6 py-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-gray-900">
                            Pedido #{pedido._id?.slice(-8).toUpperCase()}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {formatarData(pedido.createdAt)} • {pedido.fornecedorId?.nome || 'Fornecedor'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Valor Total do Pedido</p>
                          <p className="text-xl font-bold text-gray-900">{formatarMoeda(pedido.total)}</p>
                        </div>
                      </div>

                      {/* Detalhes de Pagamento */}
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Royalties */}
                          <div className={`p-4 rounded-lg border-2 ${
                            cf.royalties?.status === 'pago' 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-yellow-50 border-yellow-200'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">Royalties (5%)</span>
                              {getStatusBadge(cf.royalties?.status)}
                            </div>
                            <p className="text-xl font-bold text-gray-900">
                              {formatarMoeda(pedido.royalties)}
                            </p>
                            {cf.royalties?.dataPagamento && (
                              <p className="text-xs text-gray-500 mt-1">
                                Pago em: {formatarData(cf.royalties.dataPagamento)}
                              </p>
                            )}
                          </div>

                          {/* Etiquetas */}
                          <div className={`p-4 rounded-lg border-2 ${
                            (pedido.totalEtiquetas || 0) === 0 
                              ? 'bg-gray-50 border-gray-200'
                              : cf.etiquetas?.status === 'pago' 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-yellow-50 border-yellow-200'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">Etiquetas</span>
                              {(pedido.totalEtiquetas || 0) > 0 
                                ? getStatusBadge(cf.etiquetas?.status)
                                : <span className="text-xs text-gray-400">N/A</span>
                              }
                            </div>
                            <p className="text-xl font-bold text-gray-900">
                              {formatarMoeda(pedido.totalEtiquetas)}
                            </p>
                            {cf.etiquetas?.dataPagamento && (
                              <p className="text-xs text-gray-500 mt-1">
                                Pago em: {formatarData(cf.etiquetas.dataPagamento)}
                              </p>
                            )}
                          </div>

                          {/* Embalagens */}
                          <div className={`p-4 rounded-lg border-2 ${
                            (pedido.totalEmbalagens || 0) === 0 
                              ? 'bg-gray-50 border-gray-200'
                              : cf.embalagens?.status === 'pago' 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-yellow-50 border-yellow-200'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">Embalagens</span>
                              {(pedido.totalEmbalagens || 0) > 0 
                                ? getStatusBadge(cf.embalagens?.status)
                                : <span className="text-xs text-gray-400">N/A</span>
                              }
                            </div>
                            <p className="text-xl font-bold text-gray-900">
                              {formatarMoeda(pedido.totalEmbalagens)}
                            </p>
                            {cf.embalagens?.dataPagamento && (
                              <p className="text-xs text-gray-500 mt-1">
                                Pago em: {formatarData(cf.embalagens.dataPagamento)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Resumo do Pedido */}
                        <div className="mt-4 pt-4 border-t">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Subtotal Produtos</p>
                              <p className="font-medium">{formatarMoeda(pedido.subtotal)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">+ Royalties</p>
                              <p className="font-medium">{formatarMoeda(pedido.royalties)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">+ Etiquetas</p>
                              <p className="font-medium">{formatarMoeda(pedido.totalEtiquetas)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">+ Embalagens</p>
                              <p className="font-medium">{formatarMoeda(pedido.totalEmbalagens)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Legenda */}
            <div className="mt-8 bg-blue-50 rounded-xl p-6">
              <h3 className="font-bold text-blue-900 mb-3">ℹ️ Informações sobre Pagamentos</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• <strong>Royalties (5%):</strong> Taxa calculada sobre o valor dos produtos</li>
                <li>• <strong>Etiquetas:</strong> Custo das etiquetas personalizadas dos produtos</li>
                <li>• <strong>Embalagens:</strong> Custo das embalagens especiais dos produtos</li>
                <li>• Os status são atualizados pelo administrador após confirmação dos pagamentos</li>
              </ul>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}