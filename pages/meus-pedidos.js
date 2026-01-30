// PAGES/MEUS-PEDIDOS.JS - HISTÓRICO DE PEDIDOS DO DISTRIBUIDOR
// ============================================================
// Exibe todos os pedidos de TODOS os fornecedores

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Head from 'next/head';

export default function MeusPedidos() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [resumoFinanceiro, setResumoFinanceiro] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    buscarPedidos();
  }, [filtroStatus]);

  const buscarPedidos = async () => {
    try {
      setLoading(true);
      setErro(null);
      
      const params = new URLSearchParams();
      if (filtroStatus !== 'todos') {
        params.append('status', filtroStatus);
      }
      params.append('limit', '50'); // Buscar mais pedidos

      const response = await fetch(`/api/user/pedidos?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setPedidos(data.pedidos || []);
        
        // Usar resumo financeiro da API se disponível
        if (data.resumoFinanceiro) {
          setResumoFinanceiro(data.resumoFinanceiro);
        } else {
          // Calcular localmente se necessário
          calcularResumoFinanceiro(data.pedidos || []);
        }
      } else if (response.status === 401) {
        router.push('/');
      } else {
        const errorData = await response.json();
        setErro(errorData.message || 'Erro ao buscar pedidos');
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      setErro('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Calcular resumo dos pagamentos pendentes
  const calcularResumoFinanceiro = (pedidosList) => {
    let totalPendente = 0;
    let pedidosComPendencia = 0;

    pedidosList.forEach(pedido => {
      const cf = pedido.controleFinanceiro || {};
      let pendentePedido = 0;

      if (cf.royalties?.status !== 'pago') {
        pendentePedido += pedido.royalties || 0;
      }
      if (cf.etiquetas?.status !== 'pago') {
        pendentePedido += pedido.totalEtiquetas || 0;
      }
      if (cf.embalagens?.status !== 'pago') {
        pendentePedido += pedido.totalEmbalagens || 0;
      }

      if (pendentePedido > 0) {
        totalPendente += pendentePedido;
        pedidosComPendencia++;
      }
    });

    setResumoFinanceiro({
      totalPendente,
      pedidosComPendencia,
    });
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

  // Verificar status geral de pagamento do pedido
  const getStatusPagamento = (pedido) => {
    const cf = pedido.controleFinanceiro || {};
    
    const royaltiesPago = cf.royalties?.status === 'pago';
    const etiquetasPago = cf.etiquetas?.status === 'pago' || (pedido.totalEtiquetas || 0) === 0;
    const embalagensPago = cf.embalagens?.status === 'pago' || (pedido.totalEmbalagens || 0) === 0;

    if (royaltiesPago && etiquetasPago && embalagensPago) {
      return { status: 'pago', label: 'Pago', color: 'bg-green-100 text-green-800', icon: '✓' };
    }
    
    const algumPago = royaltiesPago || etiquetasPago || embalagensPago;
    if (algumPago) {
      return { status: 'parcial', label: 'Parcial', color: 'bg-blue-100 text-blue-800', icon: '◐' };
    }
    
    return { status: 'pendente', label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' };
  };

  // Organizar itens por categoria
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
          <div className='mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div>
              <h1 className='text-3xl font-bold text-gray-800 mb-2'>
                📋 Meus Pedidos
              </h1>
              <p className='text-gray-600'>
                Acompanhe o histórico e status dos seus pedidos
              </p>
            </div>
            
            {/* Botões de Ação */}
            <div className='flex gap-2'>
              <button
                onClick={() => router.push('/dashboard')}
                className='inline-flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition'
              >
                ← Voltar
              </button>
              <button
                onClick={() => router.push('/pagamentos')}
                className='inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition shadow-md'
              >
                <span>💳</span>
                <span>Ver Pagamentos</span>
              </button>
            </div>
          </div>

          {/* Erro */}
          {erro && (
            <div className='bg-red-50 border border-red-200 rounded-xl p-4 mb-6'>
              <p className='text-red-600'>{erro}</p>
              <button
                onClick={buscarPedidos}
                className='mt-2 text-red-700 underline'
              >
                Tentar novamente
              </button>
            </div>
          )}

          {/* Alerta de Pagamentos Pendentes */}
          {resumoFinanceiro && resumoFinanceiro.totalPendente > 0 && (
            <div className='bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4 mb-6'>
              <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
                <div className='flex items-center gap-3'>
                  <div className='w-12 h-12 bg-red-100 rounded-full flex items-center justify-center'>
                    <span className='text-2xl'>💰</span>
                  </div>
                  <div>
                    <p className='font-medium text-red-800'>
                      Você tem pagamentos pendentes
                    </p>
                    <p className='text-sm text-red-600'>
                      {resumoFinanceiro.pedidosComPendencia} pedido(s) com valores a pagar
                    </p>
                  </div>
                </div>
                <div className='text-right'>
                  <p className='text-2xl font-bold text-red-600'>
                    R$ {resumoFinanceiro.totalPendente.toFixed(2)}
                  </p>
                  <button
                    onClick={() => router.push('/pagamentos')}
                    className='text-sm text-red-700 underline hover:text-red-900'
                  >
                    Ver detalhes →
                  </button>
                </div>
              </div>
            </div>
          )}

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
                const itensPorCategoria = organizarItensPorCategoria(pedido.itens || []);
                const statusPagamento = getStatusPagamento(pedido);

                return (
                  <div
                    key={pedido._id}
                    className='bg-white rounded-lg shadow-md p-6'
                  >
                    {/* Header do Pedido */}
                    <div className='flex justify-between items-start mb-4'>
                      <div>
                        <h3 className='text-lg font-semibold text-gray-900'>
                          Pedido #{pedido._id?.slice(-8).toUpperCase()}
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
                          Fornecedor: <span className='font-medium'>{pedido.fornecedorId?.nome || 'N/A'}</span>
                        </p>
                      </div>
                      <div className='text-right'>
                        {/* Status do Pedido */}
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            pedido.status
                          )}`}
                        >
                          <span>{getStatusIcon(pedido.status)}</span>
                          {pedido.status?.charAt(0).toUpperCase() +
                            pedido.status?.slice(1)}
                        </span>
                        
                        {/* Status de Pagamento */}
                        <div className='mt-2'>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusPagamento.color}`}
                          >
                            <span>{statusPagamento.icon}</span>
                            Pgto: {statusPagamento.label}
                          </span>
                        </div>
                        
                        <p className='text-lg font-bold text-green-600 mt-2'>
                          R$ {pedido.total?.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Itens organizados por categoria */}
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

                    {/* Resumo Financeiro do Pedido */}
                    <div className='border-t pt-4 mt-4'>
                      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        {/* Coluna Esquerda - Valores */}
                        <div className='space-y-2'>
                          <div className='flex justify-between items-center text-sm'>
                            <span className='text-gray-600'>Subtotal Produtos:</span>
                            <span>R$ {pedido.subtotal?.toFixed(2)}</span>
                          </div>
                          {(pedido.totalEtiquetas || 0) > 0 && (
                            <div className='flex justify-between items-center text-sm'>
                              <span className='text-gray-600'>Etiquetas:</span>
                              <span>R$ {pedido.totalEtiquetas?.toFixed(2)}</span>
                            </div>
                          )}
                          {(pedido.totalEmbalagens || 0) > 0 && (
                            <div className='flex justify-between items-center text-sm'>
                              <span className='text-gray-600'>Embalagens:</span>
                              <span>R$ {pedido.totalEmbalagens?.toFixed(2)}</span>
                            </div>
                          )}
                          <div className='flex justify-between items-center text-sm'>
                            <span className='text-gray-600'>Taxa de serviço (5%):</span>
                            <span>R$ {pedido.royalties?.toFixed(2)}</span>
                          </div>
                          <div className='flex justify-between items-center font-bold text-lg border-t pt-2 mt-2'>
                            <span>Total:</span>
                            <span className='text-green-600'>
                              R$ {pedido.total?.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Coluna Direita - Status de Pagamentos */}
                        <div className='bg-gray-50 rounded-lg p-3'>
                          <h5 className='font-medium text-gray-700 mb-2 text-sm'>
                            💳 Status dos Pagamentos
                          </h5>
                          <div className='space-y-1 text-xs'>
                            <div className='flex justify-between items-center'>
                              <span>Taxa de serviço:</span>
                              {pedido.controleFinanceiro?.royalties?.status === 'pago' ? (
                                <span className='text-green-600 font-medium'>✓ Pago</span>
                              ) : (
                                <span className='text-yellow-600 font-medium'>⏳ Pendente</span>
                              )}
                            </div>
                            {(pedido.totalEtiquetas || 0) > 0 && (
                              <div className='flex justify-between items-center'>
                                <span>Etiquetas:</span>
                                {pedido.controleFinanceiro?.etiquetas?.status === 'pago' ? (
                                  <span className='text-green-600 font-medium'>✓ Pago</span>
                                ) : (
                                  <span className='text-yellow-600 font-medium'>⏳ Pendente</span>
                                )}
                              </div>
                            )}
                            {(pedido.totalEmbalagens || 0) > 0 && (
                              <div className='flex justify-between items-center'>
                                <span>Embalagens:</span>
                                {pedido.controleFinanceiro?.embalagens?.status === 'pago' ? (
                                  <span className='text-green-600 font-medium'>✓ Pago</span>
                                ) : (
                                  <span className='text-yellow-600 font-medium'>⏳ Pendente</span>
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => router.push('/pagamentos')}
                            className='mt-2 text-xs text-blue-600 hover:text-blue-800 underline'
                          >
                            Ver detalhes →
                          </button>
                        </div>
                      </div>

                      {/* Forma de Pagamento */}
                      <div className='flex justify-between items-center text-sm mt-4 pt-2 border-t'>
                        <span className='text-gray-600'>Forma de Pagamento:</span>
                        <span className='font-medium'>
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