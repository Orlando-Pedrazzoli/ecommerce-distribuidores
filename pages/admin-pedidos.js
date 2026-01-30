// PAGES/ADMIN-PEDIDOS.JS - COM FILTRO POR DISTRIBUIDOR
// ===================================

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [todosPedidos, setTodosPedidos] = useState([]); // Guardar todos para extrair distribuidores
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroFornecedor, setFiltroFornecedor] = useState('todos');
  const [filtroDistribuidor, setFiltroDistribuidor] = useState('todos'); // ← NOVO
  const [filtroPagamento, setFiltroPagamento] = useState('todos');
  const [fornecedores, setFornecedores] = useState([]);
  const [distribuidores, setDistribuidores] = useState([]); // ← NOVO
  const [user, setUser] = useState(null);
  const [atualizandoStatus, setAtualizandoStatus] = useState({});
  const [atualizandoPagamento, setAtualizandoPagamento] = useState({});
  const router = useRouter();

  useEffect(() => {
    verificarAdmin();
  }, []);

  useEffect(() => {
    if (user?.tipo === 'admin') {
      buscarPedidos();
      buscarFornecedores();
    }
  }, [user]);

  // Aplicar filtros quando mudam
  useEffect(() => {
    aplicarFiltros();
  }, [filtroStatus, filtroFornecedor, filtroDistribuidor, filtroPagamento, todosPedidos]);

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
        const pedidosData = data.pedidos || [];
        setTodosPedidos(pedidosData);
        
        // ══════════════════════════════════════════════════════════════
        // EXTRAIR LISTA ÚNICA DE DISTRIBUIDORES DOS PEDIDOS
        // ══════════════════════════════════════════════════════════════
        const distribuidoresUnicos = [...new Set(pedidosData.map(p => p.userId))].filter(Boolean);
        setDistribuidores(distribuidoresUnicos.sort());
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let pedidosFiltrados = [...todosPedidos];

    // Filtro por status do pedido
    if (filtroStatus !== 'todos') {
      pedidosFiltrados = pedidosFiltrados.filter(p => p.status === filtroStatus);
    }

    // Filtro por fornecedor
    if (filtroFornecedor !== 'todos') {
      pedidosFiltrados = pedidosFiltrados.filter(
        p => p.fornecedorId?._id === filtroFornecedor
      );
    }

    // ══════════════════════════════════════════════════════════════
    // NOVO: Filtro por distribuidor
    // ══════════════════════════════════════════════════════════════
    if (filtroDistribuidor !== 'todos') {
      pedidosFiltrados = pedidosFiltrados.filter(
        p => p.userId === filtroDistribuidor
      );
    }

    // Filtro por status de pagamento
    if (filtroPagamento !== 'todos') {
      pedidosFiltrados = pedidosFiltrados.filter(p => {
        const cf = p.controleFinanceiro || {};
        const temPendente =
          cf.royalties?.status === 'pendente' ||
          cf.etiquetas?.status === 'pendente' ||
          cf.embalagens?.status === 'pendente';

        if (filtroPagamento === 'pendente') return temPendente;
        if (filtroPagamento === 'pago') return !temPendente;
        return true;
      });
    }

    setPedidos(pedidosFiltrados);
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
        // Atualizar em ambos os estados
        const atualizarPedido = p => p._id === pedidoId ? { ...p, status: novoStatus } : p;
        setTodosPedidos(prev => prev.map(atualizarPedido));
        setPedidos(prev => prev.map(atualizarPedido));
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

  const atualizarPagamento = async (pedidoId, tipo, novoStatus) => {
    const tipoLabel = tipo === 'todos' ? 'todos os pagamentos' : tipo;
    if (!confirm(`Confirma marcar ${tipoLabel} como "${novoStatus}"?`)) {
      return;
    }

    setAtualizandoPagamento(prev => ({ ...prev, [`${pedidoId}-${tipo}`]: true }));

    try {
      const response = await fetch('/api/admin/pagamentos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedidoId,
          tipo,
          status: novoStatus,
        }),
      });

      if (response.ok) {
        await buscarPedidos();
        alert('✅ Pagamento atualizado com sucesso!');
      } else {
        alert('❌ Erro ao atualizar pagamento');
      }
    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
      alert('❌ Erro ao atualizar pagamento');
    } finally {
      setAtualizandoPagamento(prev => ({ ...prev, [`${pedidoId}-${tipo}`]: false }));
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

  const getStatusPagamento = pedido => {
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

  // Calcular totais de pagamentos (baseado nos pedidos filtrados)
  const calcularTotaisPagamentos = () => {
    let royaltiesPendentes = 0;
    let etiquetasPendentes = 0;
    let embalagensPendentes = 0;

    pedidos.forEach(pedido => {
      const cf = pedido.controleFinanceiro || {};
      if (cf.royalties?.status !== 'pago') {
        royaltiesPendentes += pedido.royalties || 0;
      }
      if (cf.etiquetas?.status !== 'pago') {
        etiquetasPendentes += pedido.totalEtiquetas || 0;
      }
      if (cf.embalagens?.status !== 'pago') {
        embalagensPendentes += pedido.totalEmbalagens || 0;
      }
    });

    return { royaltiesPendentes, etiquetasPendentes, embalagensPendentes };
  };

  const totaisPagamentos = calcularTotaisPagamentos();

  // Limpar todos os filtros
  const limparFiltros = () => {
    setFiltroStatus('todos');
    setFiltroFornecedor('todos');
    setFiltroDistribuidor('todos');
    setFiltroPagamento('todos');
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
            <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
              <div>
                <h1 className='text-3xl font-bold flex items-center gap-3'>
                  <span>📦</span>
                  Gerenciamento de Pedidos
                </h1>
                <p className='mt-2 opacity-90'>
                  Visualize e atualize o status de todos os pedidos
                </p>
              </div>
              <div className='flex gap-2'>
                <button
                  onClick={() => router.push('/admin/financeiro')}
                  className='bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium'
                >
                  💰 Financeiro
                </button>
                <button
                  onClick={() => router.push('/admin')}
                  className='bg-white text-red-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition font-medium'
                >
                  ← Voltar
                </button>
              </div>
            </div>
          </div>

          {/* Estatísticas de Status */}
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
            {['pendente', 'confirmado', 'enviado', 'entregue'].map(status => {
              const count = pedidos.filter(p => p.status === status).length;
              return (
                <div
                  key={status}
                  className={`p-4 rounded-lg border-2 ${getStatusColor(status)}`}
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

          {/* Resumo de Pagamentos Pendentes */}
          <div className='bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 mb-6'>
            <h3 className='font-bold text-yellow-800 mb-3'>💰 Pagamentos Pendentes a Receber</h3>
            <div className='grid grid-cols-3 gap-4'>
              <div className='text-center'>
                <p className='text-xs text-gray-600'>Royalties</p>
                <p className='text-xl font-bold text-yellow-600'>
                  R$ {totaisPagamentos.royaltiesPendentes.toFixed(2)}
                </p>
              </div>
              <div className='text-center'>
                <p className='text-xs text-gray-600'>Etiquetas</p>
                <p className='text-xl font-bold text-orange-600'>
                  R$ {totaisPagamentos.etiquetasPendentes.toFixed(2)}
                </p>
              </div>
              <div className='text-center'>
                <p className='text-xs text-gray-600'>Embalagens</p>
                <p className='text-xl font-bold text-purple-600'>
                  R$ {totaisPagamentos.embalagensPendentes.toFixed(2)}
                </p>
              </div>
            </div>
            <div className='mt-3 pt-3 border-t border-yellow-200 text-center'>
              <p className='text-sm text-gray-600'>Total Pendente:</p>
              <p className='text-2xl font-bold text-red-600'>
                R$ {(
                  totaisPagamentos.royaltiesPendentes +
                  totaisPagamentos.etiquetasPendentes +
                  totaisPagamentos.embalagensPendentes
                ).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className='bg-white rounded-lg shadow-md p-6 mb-6'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-gray-800'>Filtros</h3>
              {(filtroStatus !== 'todos' || filtroFornecedor !== 'todos' || filtroDistribuidor !== 'todos' || filtroPagamento !== 'todos') && (
                <button
                  onClick={limparFiltros}
                  className='text-sm text-blue-600 hover:text-blue-800 underline'
                >
                  Limpar filtros
                </button>
              )}
            </div>

            <div className='grid md:grid-cols-4 gap-4'>
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

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* NOVO: Filtro por Distribuidor */}
              {/* ══════════════════════════════════════════════════════════════ */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Distribuidor
                </label>
                <select
                  value={filtroDistribuidor}
                  onChange={e => setFiltroDistribuidor(e.target.value)}
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500'
                >
                  <option value='todos'>Todos os Distribuidores</option>
                  {distribuidores.map(d => (
                    <option key={d} value={d}>
                      👤 {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Pagamento */}
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Status Pagamento
                </label>
                <select
                  value={filtroPagamento}
                  onChange={e => setFiltroPagamento(e.target.value)}
                  className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500'
                >
                  <option value='todos'>Todos</option>
                  <option value='pendente'>💰 Com Pendências</option>
                  <option value='pago'>✅ Totalmente Pago</option>
                </select>
              </div>
            </div>

            {/* Indicador de filtros ativos */}
            {(filtroStatus !== 'todos' || filtroFornecedor !== 'todos' || filtroDistribuidor !== 'todos' || filtroPagamento !== 'todos') && (
              <div className='mt-4 pt-4 border-t'>
                <p className='text-sm text-gray-600'>
                  Exibindo <span className='font-bold text-blue-600'>{pedidos.length}</span> de{' '}
                  <span className='font-bold'>{todosPedidos.length}</span> pedidos
                </p>
              </div>
            )}
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
                {filtroStatus !== 'todos' || filtroFornecedor !== 'todos' || filtroDistribuidor !== 'todos' || filtroPagamento !== 'todos'
                  ? 'Tente ajustar os filtros'
                  : 'Ainda não há pedidos no sistema'}
              </p>
            </div>
          ) : (
            <div className='space-y-4'>
              {pedidos.map(pedido => {
                const itensPorCategoria = organizarItensPorCategoria(pedido.itens || []);
                const statusPagamento = getStatusPagamento(pedido);
                const cf = pedido.controleFinanceiro || {};

                return (
                  <div key={pedido._id} className='bg-white rounded-lg shadow-md p-6'>
                    {/* Header do Pedido */}
                    <div className='flex flex-wrap justify-between items-start mb-4 gap-4'>
                      <div>
                        <h3 className='text-lg font-semibold text-gray-900'>
                          Pedido #{pedido._id.slice(-8).toUpperCase()}
                        </h3>
                        <p className='text-sm text-gray-600'>
                          {new Date(pedido.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className='text-sm text-gray-600'>
                          <strong>Cliente:</strong>{' '}
                          <span className='bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium'>
                            {pedido.userId}
                          </span>
                        </p>
                        <p className='text-sm text-gray-600'>
                          <strong>Fornecedor:</strong> {pedido.fornecedorId?.nome}
                        </p>
                      </div>

                      {/* Status e Total */}
                      <div className='flex flex-col items-end gap-2'>
                        <div className='flex items-center gap-2'>
                          <label className='text-sm font-medium text-gray-700'>Status:</label>
                          <select
                            value={pedido.status}
                            onChange={e => atualizarStatus(pedido._id, e.target.value)}
                            disabled={atualizandoStatus[pedido._id]}
                            className={`px-3 py-1 rounded-full text-sm font-medium border-2 cursor-pointer ${getStatusColor(pedido.status)} ${
                              atualizandoStatus[pedido._id] ? 'opacity-50 cursor-wait' : 'hover:opacity-80'
                            }`}
                          >
                            <option value='pendente'>⏳ Pendente</option>
                            <option value='confirmado'>✅ Confirmado</option>
                            <option value='enviado'>🚚 Enviado</option>
                            <option value='entregue'>📦 Entregue</option>
                          </select>
                        </div>

                        {/* Status de Pagamento */}
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusPagamento.color}`}>
                          {statusPagamento.icon} Pgto: {statusPagamento.label}
                        </span>

                        <p className='text-lg font-bold text-green-600'>
                          R$ {pedido.total?.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Endereço de Entrega */}
                    <div className='bg-gray-50 rounded-lg p-3 mb-4'>
                      <h4 className='font-medium text-gray-800 mb-2 text-sm'>📍 Endereço de Entrega</h4>
                      <p className='text-sm text-gray-600'>
                        {pedido.endereco.rua}, {pedido.endereco.numero}
                        {pedido.endereco.complemento && `, ${pedido.endereco.complemento}`}
                        <br />
                        {pedido.endereco.bairro} - {pedido.endereco.cidade} - {pedido.endereco.estado}
                        <br />
                        CEP: {pedido.endereco.cep}
                      </p>
                    </div>

                    {/* Itens Organizados por Categoria */}
                    <div className='border-t pt-4'>
                      <h4 className='font-medium text-gray-800 mb-3'>
                        Itens do Pedido ({pedido.itens?.length || 0})
                      </h4>

                      {Object.entries(itensPorCategoria).map(([categoria, catData]) => (
                        <div key={categoria} className='mb-3 border border-gray-200 rounded-lg overflow-hidden'>
                          <div className='bg-gray-100 px-3 py-2'>
                            <div className='flex justify-between items-center'>
                              <h5 className='font-semibold text-gray-700 text-sm'>📂 {categoria}</h5>
                              <span className='text-xs text-gray-600'>
                                {catData.itens.length} {catData.itens.length === 1 ? 'item' : 'itens'}
                              </span>
                            </div>
                          </div>

                          <div className='p-3 space-y-2'>
                            {catData.itens.map((item, index) => (
                              <div key={index} className='flex justify-between items-center text-sm'>
                                <div className='flex-1'>
                                  <p className='font-medium text-gray-900'>{item.nome}</p>
                                  <p className='text-xs text-gray-500'>
                                    Cód: {item.codigo} | Qtd: {item.quantidade} × R$ {item.precoUnitario?.toFixed(2)}
                                  </p>
                                </div>
                                <p className='font-medium text-gray-700'>
                                  R$ {((item.quantidade || 0) * (item.precoUnitario || 0)).toFixed(2)}
                                </p>
                              </div>
                            ))}
                          </div>

                          <div className='bg-gray-50 px-3 py-2'>
                            <div className='flex justify-between text-sm font-semibold'>
                              <span className='text-gray-700'>Subtotal:</span>
                              <span className='text-green-600'>R$ {catData.subtotal.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Resumo Financeiro + Controle de Pagamentos */}
                    <div className='border-t pt-4 mt-4 grid md:grid-cols-2 gap-4'>
                      {/* Coluna Esquerda - Valores */}
                      <div>
                        <h4 className='font-medium text-gray-700 mb-2 text-sm'>💰 Resumo Financeiro</h4>
                        <div className='space-y-1 text-sm'>
                          <div className='flex justify-between'>
                            <span>Subtotal (Fornecedor):</span>
                            <span>R$ {pedido.subtotal?.toFixed(2)}</span>
                          </div>
                          {(pedido.totalEtiquetas || 0) > 0 && (
                            <div className='flex justify-between text-orange-600'>
                              <span>+ Etiquetas:</span>
                              <span>R$ {pedido.totalEtiquetas?.toFixed(2)}</span>
                            </div>
                          )}
                          {(pedido.totalEmbalagens || 0) > 0 && (
                            <div className='flex justify-between text-purple-600'>
                              <span>+ Embalagens:</span>
                              <span>R$ {pedido.totalEmbalagens?.toFixed(2)}</span>
                            </div>
                          )}
                          <div className='flex justify-between text-yellow-600'>
                            <span>+ Royalties (5%):</span>
                            <span>R$ {pedido.royalties?.toFixed(2)}</span>
                          </div>
                          <div className='flex justify-between font-bold text-lg border-t pt-2 mt-2'>
                            <span>Total:</span>
                            <span className='text-green-600'>R$ {pedido.total?.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Coluna Direita - Controle de Pagamentos */}
                      <div className='bg-gray-50 rounded-lg p-3'>
                        <h4 className='font-medium text-gray-700 mb-3 text-sm'>💳 Controle de Pagamentos</h4>
                        <div className='space-y-2'>
                          {/* Royalties */}
                          <div className='flex items-center justify-between'>
                            <span className='text-sm'>Royalties (R$ {pedido.royalties?.toFixed(2)}):</span>
                            <button
                              onClick={() => atualizarPagamento(
                                pedido._id,
                                'royalties',
                                cf.royalties?.status === 'pago' ? 'pendente' : 'pago'
                              )}
                              disabled={atualizandoPagamento[`${pedido._id}-royalties`]}
                              className={`px-3 py-1 rounded text-xs font-medium transition ${
                                cf.royalties?.status === 'pago'
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              } ${atualizandoPagamento[`${pedido._id}-royalties`] ? 'opacity-50' : ''}`}
                            >
                              {cf.royalties?.status === 'pago' ? '✓ Pago' : '⏳ Pendente'}
                            </button>
                          </div>

                          {/* Etiquetas */}
                          {(pedido.totalEtiquetas || 0) > 0 && (
                            <div className='flex items-center justify-between'>
                              <span className='text-sm'>Etiquetas (R$ {pedido.totalEtiquetas?.toFixed(2)}):</span>
                              <button
                                onClick={() => atualizarPagamento(
                                  pedido._id,
                                  'etiquetas',
                                  cf.etiquetas?.status === 'pago' ? 'pendente' : 'pago'
                                )}
                                disabled={atualizandoPagamento[`${pedido._id}-etiquetas`]}
                                className={`px-3 py-1 rounded text-xs font-medium transition ${
                                  cf.etiquetas?.status === 'pago'
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                } ${atualizandoPagamento[`${pedido._id}-etiquetas`] ? 'opacity-50' : ''}`}
                              >
                                {cf.etiquetas?.status === 'pago' ? '✓ Pago' : '⏳ Pendente'}
                              </button>
                            </div>
                          )}

                          {/* Embalagens */}
                          {(pedido.totalEmbalagens || 0) > 0 && (
                            <div className='flex items-center justify-between'>
                              <span className='text-sm'>Embalagens (R$ {pedido.totalEmbalagens?.toFixed(2)}):</span>
                              <button
                                onClick={() => atualizarPagamento(
                                  pedido._id,
                                  'embalagens',
                                  cf.embalagens?.status === 'pago' ? 'pendente' : 'pago'
                                )}
                                disabled={atualizandoPagamento[`${pedido._id}-embalagens`]}
                                className={`px-3 py-1 rounded text-xs font-medium transition ${
                                  cf.embalagens?.status === 'pago'
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                } ${atualizandoPagamento[`${pedido._id}-embalagens`] ? 'opacity-50' : ''}`}
                              >
                                {cf.embalagens?.status === 'pago' ? '✓ Pago' : '⏳ Pendente'}
                              </button>
                            </div>
                          )}

                          {/* Marcar Todos */}
                          <div className='border-t pt-2 mt-2'>
                            <button
                              onClick={() => atualizarPagamento(pedido._id, 'todos', 'pago')}
                              disabled={statusPagamento.status === 'pago'}
                              className='w-full bg-green-500 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                              ✓ Marcar Todos como Pago
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Forma de Pagamento */}
                    <div className='mt-4 pt-2 border-t flex justify-between items-center text-sm'>
                      <span className='text-gray-600'>Forma de Pagamento:</span>
                      <span className='font-medium'>
                        {pedido.formaPagamento === 'boleto' ? '💳 Boleto' : '🏦 Transferência'}
                      </span>
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