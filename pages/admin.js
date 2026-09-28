// PAGES/ADMIN.JS - DASHBOARD ADMIN COM CONTROLE FINANCEIRO
// ================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    totalProdutos: 0,
    totalFornecedores: 0,
    totalPedidos: 0,
    pedidosPendentes: 0,
  });
  const [financeiro, setFinanceiro] = useState({
    royaltiesPendentes: 0,
    etiquetasPendentes: 0,
    embalagensPendentes: 0,
    totalPendente: 0,
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    verificarAuth();
    buscarEstatisticas();
    buscarResumoFinanceiro();
  }, []);

  const verificarAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        console.log('❌ Não autenticado');
        router.push('/');
        return;
      }

      const data = await response.json();
      console.log('📦 Dados do usuário:', data);

      const isAdmin =
        data.isAdmin === true ||
        data.user?.isAdmin === true ||
        data.tipo === 'admin' ||
        data.user?.tipo === 'admin';

      if (!isAdmin) {
        console.log('❌ Usuário não é admin');
        router.push('/');
      } else {
        console.log('✅ Usuário admin verificado');
      }
    } catch (error) {
      console.error('❌ Erro ao verificar auth:', error);
      router.push('/');
    }
  };

  const buscarEstatisticas = async () => {
    setLoading(true);
    try {
      // Buscar estatísticas de produtos
      const produtosRes = await fetch('/api/admin/produtos');
      if (produtosRes.ok) {
        const produtosData = await produtosRes.json();
        setStats(prev => ({ ...prev, totalProdutos: produtosData.total || 0 }));
      }

      // Buscar estatísticas de fornecedores
      const fornecedoresRes = await fetch('/api/admin/fornecedores');
      if (fornecedoresRes.ok) {
        const fornecedoresData = await fornecedoresRes.json();
        setStats(prev => ({ ...prev, totalFornecedores: fornecedoresData.length || 0 }));
      }

      // Buscar estatísticas de distribuidores
      const distribuidoresRes = await fetch('/api/admin/distribuidores');
      if (distribuidoresRes.ok) {
        const distribuidoresData = await distribuidoresRes.json();
        setStats(prev => ({
          ...prev,
          totalDistribuidores: distribuidoresData.total || 0,
        }));
      }

      // Buscar estatísticas de pedidos
      const pedidosRes = await fetch('/api/admin/pedidos/todos');
      if (pedidosRes.ok) {
        const pedidosData = await pedidosRes.json();
        setStats(prev => ({
          ...prev,
          totalPedidos: pedidosData.stats?.total || 0,
          pedidosPendentes: pedidosData.stats?.pendentes || 0,
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const buscarResumoFinanceiro = async () => {
    try {
      const response = await fetch('/api/admin/pagamentos');
      if (response.ok) {
        const data = await response.json();
        setFinanceiro({
          royaltiesPendentes: data.resumo?.royaltiesPendentes || 0,
          etiquetasPendentes: data.resumo?.etiquetasPendentes || 0,
          embalagensPendentes: data.resumo?.embalagensPendentes || 0,
          totalPendente: data.resumo?.totalPendente || 0,
        });
      }
    } catch (error) {
      console.error('Erro ao buscar resumo financeiro:', error);
    }
  };

  const handleLogout = async () => {
    try {
      // Cookie HttpOnly: só o servidor consegue apagá-lo
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Erro ao encerrar sessão:', error);
    } finally {
      router.push('/');
    }
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      color: 'blue',
    },
    {
      id: 'produtos',
      label: 'Gestão de Produtos',
      icon: '📦',
      color: 'green',
      badge: stats.totalProdutos,
      action: () => router.push('/admin-produtos'),
    },
    {
      id: 'pedidos',
      label: 'Gestão de Pedidos',
      icon: '🛒',
      color: 'purple',
      badge: stats.pedidosPendentes > 0 ? stats.pedidosPendentes : null,
      badgeColor: 'red',
      action: () => router.push('/admin-pedidos'),
    },
    {
      id: 'financeiro',
      label: 'Controle Financeiro',
      icon: '💰',
      color: 'yellow',
      badge: financeiro.totalPendente > 0 ? `R$ ${financeiro.totalPendente.toFixed(0)}` : null,
      badgeColor: 'red',
      action: () => router.push('/admin/financeiro'),
    },
    {
      id: 'distribuidores',
      label: 'Distribuidores',
      icon: '👥',
      color: 'indigo',
      badge: stats.totalDistribuidores || null,
      action: () => router.push('/admin/distribuidores'),
    },
    {
      id: 'fornecedores',
      label: 'Fornecedores',
      icon: '🏢',
      color: 'orange',
      badge: stats.totalFornecedores,
    },
    {
      id: 'configuracoes',
      label: 'Configurações',
      icon: '⚙️',
      color: 'gray',
    },
  ];

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto'></div>
          <p className='mt-4 text-gray-600'>Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <div className='bg-white shadow-md'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            <h1 className='text-2xl font-bold text-gray-800'>🛠️ Painel Administrativo</h1>
            <div className='flex items-center gap-4'>
              <span className='text-sm text-gray-600'>👤 Admin</span>
              <button
                onClick={handleLogout}
                className='bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition'
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Cards de Estatísticas */}
        <div className='grid md:grid-cols-4 gap-6 mb-8'>
          <div className='bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-md'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-blue-100'>Total de Produtos</p>
                <p className='text-3xl font-bold'>{stats.totalProdutos}</p>
              </div>
              <span className='text-4xl opacity-75'>📦</span>
            </div>
          </div>

          <div className='bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg shadow-md'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-green-100'>Fornecedores</p>
                <p className='text-3xl font-bold'>{stats.totalFornecedores}</p>
              </div>
              <span className='text-4xl opacity-75'>🏢</span>
            </div>
          </div>

          <div className='bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-md'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-purple-100'>Total de Pedidos</p>
                <p className='text-3xl font-bold'>{stats.totalPedidos}</p>
              </div>
              <span className='text-4xl opacity-75'>🛒</span>
            </div>
          </div>

          <div className='bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-md'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-orange-100'>Pedidos Pendentes</p>
                <p className='text-3xl font-bold'>{stats.pedidosPendentes}</p>
              </div>
              <span className='text-4xl opacity-75'>⏳</span>
            </div>
          </div>
        </div>

        {/* Card de Pagamentos Pendentes */}
        {financeiro.totalPendente > 0 && (
          <div className='bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-lg shadow-lg mb-8'>
            <div className='flex flex-col md:flex-row items-center justify-between gap-4'>
              <div className='flex items-center gap-4'>
                <div className='w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center'>
                  <span className='text-4xl'>💰</span>
                </div>
                <div>
                  <p className='text-red-100 text-lg'>Pagamentos Pendentes a Receber</p>
                  <p className='text-4xl font-bold'>R$ {financeiro.totalPendente.toFixed(2)}</p>
                </div>
              </div>
              <div className='flex flex-col sm:flex-row gap-4 text-center'>
                <div className='bg-white bg-opacity-20 rounded-lg px-4 py-2'>
                  <p className='text-xs text-red-100'>Royalties</p>
                  <p className='text-lg font-bold'>R$ {financeiro.royaltiesPendentes.toFixed(2)}</p>
                </div>
                <div className='bg-white bg-opacity-20 rounded-lg px-4 py-2'>
                  <p className='text-xs text-red-100'>Etiquetas</p>
                  <p className='text-lg font-bold'>R$ {financeiro.etiquetasPendentes.toFixed(2)}</p>
                </div>
                <div className='bg-white bg-opacity-20 rounded-lg px-4 py-2'>
                  <p className='text-xs text-red-100'>Embalagens</p>
                  <p className='text-lg font-bold'>R$ {financeiro.embalagensPendentes.toFixed(2)}</p>
                </div>
              </div>
              <button
                onClick={() => router.push('/admin/financeiro')}
                className='bg-white text-red-600 px-6 py-3 rounded-lg font-bold hover:bg-red-50 transition shadow-md'
              >
                Ver Detalhes →
              </button>
            </div>
          </div>
        )}

        {/* Menu de Navegação */}
        <div className='bg-white rounded-lg shadow-md p-6 mb-8'>
          <h2 className='text-lg font-semibold text-gray-800 mb-4'>Menu Principal</h2>
          <div className='grid md:grid-cols-3 gap-4'>
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={item.action || (() => setActiveTab(item.id))}
                className={`bg-${item.color}-50 hover:bg-${item.color}-100 border border-${item.color}-200 rounded-lg p-6 transition text-left relative group`}
              >
                <div className='flex items-start justify-between'>
                  <div>
                    <span className='text-3xl mb-2 block'>{item.icon}</span>
                    <h3 className='font-semibold text-gray-800'>{item.label}</h3>
                    <p className='text-sm text-gray-600 mt-1'>
                      {item.id === 'produtos' && 'Gerenciar catálogo completo'}
                      {item.id === 'pedidos' && 'Ver e processar pedidos'}
                      {item.id === 'financeiro' && 'Controle de pagamentos'}
                      {item.id === 'distribuidores' && 'Contas, acessos e senhas'}
                      {item.id === 'fornecedores' && 'Cadastro de fornecedores'}
                      {item.id === 'configuracoes' && 'Ajustes do sistema'}
                      {item.id === 'dashboard' && 'Visão geral do sistema'}
                    </p>
                  </div>
                  {item.badge && (
                    <span
                      className={`bg-${item.badgeColor || item.color}-100 text-${item.badgeColor || item.color}-800 px-3 py-1 rounded-full text-sm font-semibold`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.action && (
                  <div className='absolute inset-0 bg-gradient-to-r from-transparent to-white/10 opacity-0 group-hover:opacity-100 transition rounded-lg pointer-events-none'></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Seção de Conteúdo Baseada na Tab Ativa */}
        {activeTab === 'dashboard' && (
          <div className='bg-white rounded-lg shadow-md p-6'>
            <h2 className='text-lg font-semibold text-gray-800 mb-4'>📊 Resumo do Sistema</h2>
            <div className='space-y-4'>
              <div className='p-4 bg-blue-50 rounded-lg'>
                <h3 className='font-medium text-blue-800 mb-2'>Ações Rápidas</h3>
                <div className='flex flex-wrap gap-3'>
                  <button
                    onClick={() => router.push('/admin-produtos')}
                    className='bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition'
                  >
                    + Novo Produto
                  </button>
                  <button
                    onClick={() => router.push('/admin-pedidos')}
                    className='bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition'
                  >
                    Ver Pedidos
                  </button>
                  <button
                    onClick={() => router.push('/admin/financeiro')}
                    className='bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition'
                  >
                    💰 Financeiro
                  </button>
                </div>
              </div>

              {stats.pedidosPendentes > 0 && (
                <div className='p-4 bg-yellow-50 border border-yellow-200 rounded-lg'>
                  <h3 className='font-medium text-yellow-800 mb-1'>⚠️ Atenção Necessária</h3>
                  <p className='text-sm text-yellow-700'>
                    Você tem {stats.pedidosPendentes} pedido(s) pendente(s) aguardando processamento.
                  </p>
                </div>
              )}

              {financeiro.totalPendente > 0 && (
                <div className='p-4 bg-red-50 border border-red-200 rounded-lg'>
                  <h3 className='font-medium text-red-800 mb-1'>💰 Pagamentos Pendentes</h3>
                  <p className='text-sm text-red-700'>
                    Você tem R$ {financeiro.totalPendente.toFixed(2)} em pagamentos pendentes para receber.
                  </p>
                  <button
                    onClick={() => router.push('/admin/financeiro')}
                    className='mt-2 text-red-700 underline text-sm hover:text-red-900'
                  >
                    Ver detalhes →
                  </button>
                </div>
              )}

              <div className='p-4 bg-green-50 rounded-lg'>
                <h3 className='font-medium text-green-800 mb-2'>✅ Status do Sistema</h3>
                <p className='text-sm text-green-700'>
                  Todos os sistemas estão operacionais. Última sincronização:{' '}
                  {new Date().toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'fornecedores' && (
          <div className='bg-white rounded-lg shadow-md p-6'>
            <h2 className='text-lg font-semibold text-gray-800 mb-4'>🏢 Gestão de Fornecedores</h2>
            <p className='text-gray-600'>Funcionalidade em desenvolvimento...</p>
          </div>
        )}

        {activeTab === 'configuracoes' && (
          <div className='bg-white rounded-lg shadow-md p-6'>
            <h2 className='text-lg font-semibold text-gray-800 mb-4'>⚙️ Configurações</h2>
            <p className='text-gray-600'>Funcionalidade em desenvolvimento...</p>
          </div>
        )}
      </div>
    </div>
  );
}