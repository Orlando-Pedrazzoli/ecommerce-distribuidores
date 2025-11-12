// PAGES/ADMIN.JS - DASHBOARD ADMIN ATUALIZADO
// ================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ProductForm from '../components/Admin/ProductForm';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    totalProdutos: 0,
    totalFornecedores: 0,
    totalPedidos: 0,
    pedidosPendentes: 0,
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    verificarAuth();
    buscarEstatisticas();
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
      
      // Verificar diferentes estruturas possíveis de resposta
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

      // Buscar estatísticas de pedidos
      const pedidosRes = await fetch('/api/admin/pedidos/todos');
      if (pedidosRes.ok) {
        const pedidosData = await pedidosRes.json();
        setStats(prev => ({ 
          ...prev, 
          totalPedidos: pedidosData.stats?.total || 0,
          pedidosPendentes: pedidosData.stats?.pendentes || 0
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    router.push('/');
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
      id: 'fornecedores',
      label: 'Fornecedores',
      icon: '🏢',
      color: 'orange',
      badge: stats.totalFornecedores,
    },
    {
      id: 'relatorios',
      label: 'Relatórios',
      icon: '📈',
      color: 'indigo',
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-800">
              🛠️ Painel Administrativo
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">👤 Admin</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cards de Estatísticas */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Total de Produtos</p>
                <p className="text-3xl font-bold">{stats.totalProdutos}</p>
              </div>
              <span className="text-4xl opacity-75">📦</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Fornecedores</p>
                <p className="text-3xl font-bold">{stats.totalFornecedores}</p>
              </div>
              <span className="text-4xl opacity-75">🏢</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Total de Pedidos</p>
                <p className="text-3xl font-bold">{stats.totalPedidos}</p>
              </div>
              <span className="text-4xl opacity-75">🛒</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100">Pendentes</p>
                <p className="text-3xl font-bold">{stats.pedidosPendentes}</p>
              </div>
              <span className="text-4xl opacity-75">⏳</span>
            </div>
          </div>
        </div>

        {/* Menu de Navegação */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Menu Principal</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={item.action || (() => setActiveTab(item.id))}
                className={`bg-${item.color}-50 hover:bg-${item.color}-100 border border-${item.color}-200 rounded-lg p-6 transition text-left relative group`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-3xl mb-2 block">{item.icon}</span>
                    <h3 className="font-semibold text-gray-800">{item.label}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {item.id === 'produtos' && 'Gerenciar catálogo completo'}
                      {item.id === 'pedidos' && 'Ver e processar pedidos'}
                      {item.id === 'fornecedores' && 'Cadastro de fornecedores'}
                      {item.id === 'relatorios' && 'Análises e métricas'}
                      {item.id === 'configuracoes' && 'Ajustes do sistema'}
                      {item.id === 'dashboard' && 'Visão geral do sistema'}
                    </p>
                  </div>
                  {item.badge && (
                    <span className={`bg-${item.badgeColor || item.color}-100 text-${item.badgeColor || item.color}-800 px-3 py-1 rounded-full text-sm font-semibold`}>
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.action && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 opacity-0 group-hover:opacity-100 transition rounded-lg pointer-events-none"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Seção de Conteúdo Baseada na Tab Ativa */}
        {activeTab === 'dashboard' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">📊 Resumo do Sistema</h2>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">Ações Rápidas</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push('/admin-produtos')}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                  >
                    + Novo Produto
                  </button>
                  <button
                    onClick={() => router.push('/admin-pedidos')}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
                  >
                    Ver Pedidos
                  </button>
                </div>
              </div>

              {stats.pedidosPendentes > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-medium text-yellow-800 mb-1">⚠️ Atenção Necessária</h3>
                  <p className="text-sm text-yellow-700">
                    Você tem {stats.pedidosPendentes} pedido(s) pendente(s) aguardando processamento.
                  </p>
                </div>
              )}

              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">✅ Status do Sistema</h3>
                <p className="text-sm text-green-700">
                  Todos os sistemas estão operacionais. Última sincronização: {new Date().toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'fornecedores' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">🏢 Gestão de Fornecedores</h2>
            <p className="text-gray-600">Funcionalidade em desenvolvimento...</p>
          </div>
        )}

        {activeTab === 'relatorios' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">📈 Relatórios</h2>
            <p className="text-gray-600">Funcionalidade em desenvolvimento...</p>
          </div>
        )}

        {activeTab === 'configuracoes' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">⚙️ Configurações</h2>
            <p className="text-gray-600">Funcionalidade em desenvolvimento...</p>
          </div>
        )}
      </div>
    </div>
  );
}