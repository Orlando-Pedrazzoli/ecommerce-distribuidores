// pages/admin-pedidos.js - GERENCIAMENTO DE PEDIDOS PARA ADMIN
// ===================================

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroFornecedor, setFiltroFornecedor] = useState('todos');
  const [fornecedores, setFornecedores] = useState([]);
  const [user, setUser] = useState(null);
  const [atualizandoStatus, setAtualizandoStatus] = useState({});
  const router = useRouter();

  useEffect(() => {
    verificarAdmin();
  }, []);

  useEffect(() => {
    if (user?.tipo === 'admin') {
      buscarPedidos();
      buscarFornecedores();
    }
  }, [filtroStatus, filtroFornecedor, user]);

  const verificarAdmin = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        if (data.user.tipo !== 'admin') {
          router.push('/dashboard');
        } else {
          setUser(data.user);
        }
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
      router.push('/');
    }
  };

  const buscarPedidos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/pedidos/todos');
      const data = await response.json();

      if (response.ok) {
        // Filtrar por status
        let pedidosFiltrados = data.pedidos || [];

        if (filtroStatus !== 'todos') {
          pedidosFiltrados = pedidosFiltrados.filter(
            p => p.status === filtroStatus
          );
        }

        if (filtroFornecedor !== 'todos') {
          pedidosFiltrados = pedidosFiltrados.filter(
            p => p.fornecedorId?._id === filtroFornecedor
          );
        }

        setPedidos(pedidosFiltrados);
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const buscarFornecedores = async () => {
    try {
      const response = await fetch('/api/admin/fornecedores');
      if (response.ok) {
        const data = await response.json();
        setFornecedores(data);
      }
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
    }
  };

  const atualizarStatus = async (pedidoId, novoStatus) => {
    if (!confirm(`Confirma a alteração do status para "${novoStatus}"?`)) {
      return;
    }

    setAtualizandoStatus(prev => ({ ...prev, [pedidoId]: true }));

    try {
      const response = await fetch('/api/admin/pedidos/atualizar-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedidoId,
          status: novoStatus,
        }),
      });

      if (response.ok) {
        // Atualizar lista local
        setPedidos(prev =>
          prev.map(p => (p._id === pedidoId ? { ...p, status: novoStatus } : p))
        );
        alert('✅ Status atualizado com sucesso!');
      } else {
        alert('❌ Erro ao atualizar status');
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('❌ Erro ao atualizar status');
    } finally {
      setAtualizandoStatus(prev => ({ ...prev, [pedidoId]: false }));
    }
  };

  const getStatusColor = status => {
    const colors = {
      pendente: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      confirmado: 'bg-blue-100 text-blue-800 border-blue-300',
      enviado: 'bg-orange-100 text-orange-800 border-orange-300',
      entregue: 'bg-green-100 text-green-800 border-green-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = status => {
    const icons = {
      pendente: '⏳',
      confirmado: '✅',
      enviado: '🚚',
      entregue: '📦',
    };
    return icons[status] || '📋';
  };

  const organizarItensPorCategoria = itens => {
    const itensPorCategoria = {};

    itens.forEach(item => {
      const categoria = item.categoria || 'Sem categoria';
      if (!itensPorCategoria[categoria]) {
        itensPorCategoria[categoria] = {
          itens: [],
          subtotal: 0,
        };
      }
      itensPorCategoria[categoria].itens.push(item);
      itensPorCategoria[categoria].subtotal +=
        (item.quantidade || 0) * (item.precoUnitario || 0);
    });

    return itensPorCategoria;
  };

  if (!user || user.tipo !== 'admin') {
    return null;
  }

  return (
    <>
      <Head>
        <title>Gerenciar Pedidos - Admin</title>
      </Head>
      <Layout>
        <div className='max-w-7xl mx-auto px-4 py-8'>
          {/* Header */}
          <div className='bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-lg mb-8 shadow-lg'>
            <div className='flex justify-between items-center'>
              <div>
                <h1 className='text-3xl font-bold flex items-center gap-3'>
                  <span>📦</span>
                  Gerenciamento de Pedidos
                </h1>
                <p className='mt-2 opacity-90'>
                  Visualize e atualize o status de todos os pedidos
                </p>
              </div>
              <button
                onClick={() => router.push('/admin')}
                className='bg-white text-red-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition font-medium'
              >
                ← Voltar ao Admin
              </button>
            </div>
          </div>

          {/* Estatísticas */}
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
            {['pendente', 'confirmado', 'enviado', 'entregue'].map(status => {
              const count = pedidos.filter(p => p.status === status).length;
              return (
                <div
                  key={status}
                  className={`p-4 rounded-lg border-2 ${getStatusColor(
                    status
                  )}`}
                >
                  <div className='text-2xl font-bold'>{count}</div>
                  <div className='text-sm flex items-center gap-1'>
                    {getStatusIcon(status)}{' '}
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filtros */}
          <div className='bg-white rounded-lg shadow-md p-6 mb-6'>
            <h3 className='text-lg font-semibold text-gray-800 mb-4'>
              Filtros
            </h3>

            <div className='grid md:grid-cols-2 gap-4'>
              {/* Filtro por Status */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Status do Pedido
                </label>
                <select
                  value={filtroStatus}
                  onChange={e => setFiltroStatus(e.target.value)}
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500'
                >
                  <option value='todos'>Todos os Status</option>
                  <option value='pendente'>⏳ Pendente</option>
                  <option value='confirmado'>✅ Confirmado</option>
                  <option value='enviado'>🚚 Enviado</option>
                  <option value='entregue'>📦 Entregue</option>
                </select>
              </div>

              {/* Filtro por Fornecedor */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Fornecedor
                </label>
                <select
                  value={filtroFornecedor}
                  onChange={e => setFiltroFornecedor(e.target.value)}
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500'
                >
                  <option value='todos'>Todos os Fornecedores</option>
                  {fornecedores.map(f => (
                    <option key={f._id} value={f._id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Lista de Pedidos */}
          {loading ? (
            <div className='text-center py-12'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4'></div>
              <p className='text-gray-600'>Carregando pedidos...</p>
            </div>
          ) : pedidos.length === 0 ? (
            <div className='text-center py-12 bg-white rounded-lg shadow-md'>
              <div className='text-6xl mb-4'>📦</div>
              <h3 className='text-xl font-medium text-gray-900 mb-2'>
                Nenhum pedido encontrado
              </h3>
              <p className='text-gray-600'>
                {filtroStatus !== 'todos' || filtroFornecedor !== 'todos'
                  ? 'Tente ajustar os filtros'
                  : 'Ainda não há pedidos no sistema'}
              </p>
            </div>
          ) : (
            <div className='space-y-4'>
              {pedidos.map(pedido => {
                const itensPorCategoria = organizarItensPorCategoria(
                  pedido.itens || []
                );

                return (
                  <div
                    key={pedido._id}
                    className='bg-white rounded-lg shadow-md p-6'
                  >
                    {/* Header do Pedido */}
                    <div className='flex flex-wrap justify-between items-start mb-4 gap-4'>
                      <div>
                        <h3 className='text-lg font-semibold text-gray-900'>
                          Pedido #{pedido._id.slice(-8).toUpperCase()}
                        </h3>
                        <p className='text-sm text-gray-600'>
                          {new Date(pedido.createdAt).toLocaleDateString(
                            'pt-BR',
                            {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </p>
                        <p className='text-sm text-gray-600'>
                          <strong>Cliente:</strong> {pedido.userId}
                        </p>
                        <p className='text-sm text-gray-600'>
                          <strong>Fornecedor:</strong>{' '}
                          {pedido.fornecedorId?.nome}
                        </p>
                      </div>

                      {/* Seletor de Status */}
                      <div className='flex flex-col items-end gap-2'>
                        <div className='flex items-center gap-2'>
                          <label className='text-sm font-medium text-gray-700'>
                            Status:
                          </label>
                          <select
                            value={pedido.status}
                            onChange={e =>
                              atualizarStatus(pedido._id, e.target.value)
                            }
                            disabled={atualizandoStatus[pedido._id]}
                            className={`px-3 py-1 rounded-full text-sm font-medium border-2 cursor-pointer ${getStatusColor(
                              pedido.status
                            )} ${
                              atualizandoStatus[pedido._id]
                                ? 'opacity-50 cursor-wait'
                                : 'hover:opacity-80'
                            }`}
                          >
                            <option value='pendente'>⏳ Pendente</option>
                            <option value='confirmado'>✅ Confirmado</option>
                            <option value='enviado'>🚚 Enviado</option>
                            <option value='entregue'>📦 Entregue</option>
                          </select>
                        </div>
                        <p className='text-lg font-bold text-green-600'>
                          R$ {pedido.total?.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Endereço de Entrega */}
                    <div className='bg-gray-50 rounded-lg p-3 mb-4'>
                      <h4 className='font-medium text-gray-800 mb-2 text-sm'>
                        📍 Endereço de Entrega
                      </h4>
                      <p className='text-sm text-gray-600'>
                        {pedido.endereco.rua}, {pedido.endereco.numero}
                        {pedido.endereco.complemento &&
                          `, ${pedido.endereco.complemento}`}
                        <br />
                        {pedido.endereco.bairro} - {pedido.endereco.cidade} -{' '}
                        {pedido.endereco.estado}
                        <br />
                        CEP: {pedido.endereco.cep}
                      </p>
                    </div>

                    {/* Itens Organizados por Categoria */}
                    <div className='border-t pt-4'>
                      <h4 className='font-medium text-gray-800 mb-3'>
                        Itens do Pedido ({pedido.itens?.length || 0})
                      </h4>

                      {Object.entries(itensPorCategoria).map(
                        ([categoria, catData]) => (
                          <div
                            key={categoria}
                            className='mb-3 border border-gray-200 rounded-lg overflow-hidden'
                          >
                            <div className='bg-gray-100 px-3 py-2'>
                              <div className='flex justify-between items-center'>
                                <h5 className='font-semibold text-gray-700 text-sm'>
                                  📂 {categoria}
                                </h5>
                                <span className='text-xs text-gray-600'>
                                  {catData.itens.length}{' '}
                                  {catData.itens.length === 1
                                    ? 'item'
                                    : 'itens'}
                                </span>
                              </div>
                            </div>

                            <div className='p-3 space-y-2'>
                              {catData.itens.map((item, index) => (
                                <div
                                  key={index}
                                  className='flex justify-between items-center text-sm'
                                >
                                  <div className='flex-1'>
                                    <p className='font-medium text-gray-900'>
                                      {item.nome}
                                    </p>
                                    <p className='text-xs text-gray-500'>
                                      Cód: {item.codigo} | Qtd:{' '}
                                      {item.quantidade} × R${' '}
                                      {item.precoUnitario?.toFixed(2)}
                                    </p>
                                  </div>
                                  <p className='font-medium text-gray-700'>
                                    R${' '}
                                    {(
                                      (item.quantidade || 0) *
                                      (item.precoUnitario || 0)
                                    ).toFixed(2)}
                                  </p>
                                </div>
                              ))}
                            </div>

                            <div className='bg-gray-50 px-3 py-2'>
                              <div className='flex justify-between text-sm font-semibold'>
                                <span className='text-gray-700'>Subtotal:</span>
                                <span className='text-green-600'>
                                  R$ {catData.subtotal.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    {/* Resumo Financeiro */}
                    <div className='border-t pt-4 mt-4'>
                      <div className='flex justify-between items-center text-sm'>
                        <span>Subtotal:</span>
                        <span>R$ {pedido.subtotal?.toFixed(2)}</span>
                      </div>
                      <div className='flex justify-between items-center text-sm'>
                        <span>Royalties (5%):</span>
                        <span>R$ {pedido.royalties?.toFixed(2)}</span>
                      </div>
                      <div className='flex justify-between items-center font-bold text-lg border-t pt-2 mt-2'>
                        <span>Total:</span>
                        <span className='text-green-600'>
                          R$ {pedido.total?.toFixed(2)}
                        </span>
                      </div>
                      <div className='flex justify-between items-center text-sm mt-2'>
                        <span>Forma de Pagamento:</span>
                        <span className='capitalize'>
                          {pedido.formaPagamento === 'boleto'
                            ? '💳 Boleto'
                            : '🏦 Transferência'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}
