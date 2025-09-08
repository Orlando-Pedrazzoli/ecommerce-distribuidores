// PAGES/MEUS-PEDIDOS.JS - ORGANIZADO POR CATEGORIA
// ================================================

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Head from 'next/head';

export default function MeusPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('todos');

  useEffect(() => {
    buscarPedidos();
  }, [filtroStatus]);

  const buscarPedidos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filtroStatus !== 'todos') {
        params.append('status', filtroStatus);
      }

      const response = await fetch(`/api/user/pedidos?${params}`);
      const data = await response.json();

      if (response.ok) {
        setPedidos(data.pedidos || []);
      } else {
        console.error('Erro ao buscar pedidos:', data.message);
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = status => {
    const colors = {
      pendente: 'bg-yellow-100 text-yellow-800',
      confirmado: 'bg-blue-100 text-blue-800',
      enviado: 'bg-orange-100 text-orange-800',
      entregue: 'bg-green-100 text-green-800',
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

  // 🆕 FUNÇÃO PARA ORGANIZAR ITENS POR CATEGORIA
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

  return (
    <>
      <Head>
        <title>Meus Pedidos - Elite Surfing</title>
      </Head>
      <Layout>
        <div className='max-w-6xl mx-auto px-4 py-8'>
          {/* Header */}
          <div className='mb-8'>
            <h1 className='text-3xl font-bold text-gray-800 mb-2'>
              📋 Meus Pedidos
            </h1>
            <p className='text-gray-600'>
              Acompanhe o histórico e status dos seus pedidos
            </p>
          </div>

          {/* Filtros */}
          <div className='bg-white rounded-lg shadow-md p-6 mb-6'>
            <h3 className='text-lg font-semibold text-gray-800 mb-4'>
              Filtrar por Status
            </h3>
            <div className='flex flex-wrap gap-2'>
              {[
                { value: 'todos', label: 'Todos os Pedidos', icon: '📋' },
                { value: 'pendente', label: 'Pendentes', icon: '⏳' },
                { value: 'confirmado', label: 'Confirmados', icon: '✅' },
                { value: 'enviado', label: 'Enviados', icon: '🚚' },
                { value: 'entregue', label: 'Entregues', icon: '📦' },
              ].map(status => (
                <button
                  key={status.value}
                  onClick={() => setFiltroStatus(status.value)}
                  className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                    filtroStatus === status.value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{status.icon}</span>
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Pedidos */}
          {loading ? (
            <div className='text-center py-12'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4'></div>
              <p className='text-gray-600'>Carregando pedidos...</p>
            </div>
          ) : pedidos.length === 0 ? (
            <div className='text-center py-12 bg-white rounded-lg shadow-md'>
              <div className='text-6xl mb-4'>📦</div>
              <h3 className='text-xl font-medium text-gray-900 mb-2'>
                Nenhum pedido encontrado
              </h3>
              <p className='text-gray-600 mb-6'>
                {filtroStatus === 'todos'
                  ? 'Você ainda não fez nenhum pedido.'
                  : `Nenhum pedido com status "${filtroStatus}".`}
              </p>
              <a
                href='/dashboard'
                className='inline-block bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition'
              >
                Fazer Primeiro Pedido
              </a>
            </div>
          ) : (
            <div className='space-y-4'>
              {pedidos.map(pedido => {
                // 🆕 Organizar itens por categoria
                const itensPorCategoria = organizarItensPorCategoria(
                  pedido.itens || []
                );

                return (
                  <div
                    key={pedido._id}
                    className='bg-white rounded-lg shadow-md p-6'
                  >
                    {/* Header do Pedido */}
                    <div className='flex justify-between items-start mb-4'>
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
                          Fornecedor: {pedido.fornecedorId?.nome}
                        </p>
                      </div>
                      <div className='text-right'>
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            pedido.status
                          )}`}
                        >
                          <span>{getStatusIcon(pedido.status)}</span>
                          {pedido.status.charAt(0).toUpperCase() +
                            pedido.status.slice(1)}
                        </span>
                        <p className='text-lg font-bold text-green-600 mt-2'>
                          R$ {pedido.total?.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* 🆕 ITENS ORGANIZADOS POR CATEGORIA */}
                    <div className='border-t pt-4'>
                      <h4 className='font-medium text-gray-800 mb-3'>
                        Itens ({pedido.itens?.length || 0}) - Organizados por
                        Categoria
                      </h4>

                      {Object.entries(itensPorCategoria).map(
                        ([categoria, catData]) => (
                          <div
                            key={categoria}
                            className='mb-4 border border-gray-200 rounded-lg overflow-hidden'
                          >
                            {/* Header da Categoria */}
                            <div className='bg-gray-100 px-4 py-2 border-b border-gray-200'>
                              <div className='flex justify-between items-center'>
                                <h5 className='font-semibold text-gray-700 flex items-center gap-2'>
                                  <span>📂</span>
                                  {categoria}
                                </h5>
                                <span className='text-sm text-gray-600'>
                                  {catData.itens.length}{' '}
                                  {catData.itens.length === 1
                                    ? 'item'
                                    : 'itens'}
                                </span>
                              </div>
                            </div>

                            {/* Itens da Categoria */}
                            <div className='p-3 space-y-2'>
                              {catData.itens.map((item, index) => (
                                <div key={index}>
                                  <div className='flex items-center gap-3 p-2 hover:bg-gray-50 rounded'>
                                    {item.produtoId?.imagem ? (
                                      <img
                                        src={item.produtoId.imagem}
                                        alt={item.nome}
                                        className='w-12 h-12 object-cover rounded'
                                      />
                                    ) : (
                                      <div className='w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs'>
                                        📦
                                      </div>
                                    )}
                                    <div className='flex-1'>
                                      <p className='font-medium text-gray-900'>
                                        {item.nome}
                                      </p>
                                      <p className='text-sm text-gray-600'>
                                        Código: {item.codigo}
                                      </p>
                                    </div>
                                    <div className='text-right'>
                                      <p className='font-medium'>
                                        {item.quantidade}x R${' '}
                                        {item.precoUnitario?.toFixed(2)}
                                      </p>
                                      <p className='text-sm text-gray-600'>
                                        Total: R${' '}
                                        {(
                                          (item.quantidade || 0) *
                                          (item.precoUnitario || 0)
                                        ).toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                  {/* Linha separadora entre itens da mesma categoria */}
                                  {index < catData.itens.length - 1 && (
                                    <hr className='mx-2 border-gray-100' />
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Subtotal da Categoria */}
                            <div className='bg-gray-50 px-4 py-2 border-t border-gray-200'>
                              <div className='flex justify-between items-center text-sm font-semibold'>
                                <span className='text-gray-700'>
                                  Subtotal {categoria}:
                                </span>
                                <span className='text-green-600'>
                                  R$ {catData.subtotal.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    {/* Resumo do Pedido */}
                    <div className='border-t pt-4 mt-4'>
                      <div className='flex justify-between items-center text-sm'>
                        <span>Subtotal Geral:</span>
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
                            ? '💳 Boleto Bancário'
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
