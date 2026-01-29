// PAGES/ADMIN/FINANCEIRO.JS - DASHBOARD DE CONTROLE FINANCEIRO
// ===================================
// Interface para o admin gerenciar pagamentos de royalties, etiquetas e embalagens

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../components/Layout';

export default function FinanceiroAdmin() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState(null);
  const [filtro, setFiltro] = useState('pendente');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [periodo, setPeriodo] = useState('30dias');
  const [updating, setUpdating] = useState(null);
  const [selectedPedidos, setSelectedPedidos] = useState([]);

  useEffect(() => {
    carregarDados();
  }, [periodo]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/financeiro?periodo=${periodo}`);
      if (response.ok) {
        const data = await response.json();
        setDados(data);
      } else if (response.status === 403) {
        router.push('/');
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const atualizarStatus = async (pedidoId, tipo, novoStatus) => {
    try {
      setUpdating(`${pedidoId}-${tipo}`);
      const response = await fetch('/api/admin/financeiro', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedidoId,
          tipo,
          status: novoStatus,
        }),
      });

      if (response.ok) {
        await carregarDados();
      }
    } catch (error) {
      console.error('Erro ao atualizar:', error);
    } finally {
      setUpdating(null);
    }
  };

  const atualizarMultiplos = async (tipo, status) => {
    if (selectedPedidos.length === 0) return;

    try {
      setUpdating('bulk');
      const response = await fetch('/api/admin/financeiro', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedidoIds: selectedPedidos,
          tipo,
          status,
        }),
      });

      if (response.ok) {
        setSelectedPedidos([]);
        await carregarDados();
      }
    } catch (error) {
      console.error('Erro ao atualizar múltiplos:', error);
    } finally {
      setUpdating(null);
    }
  };

  const toggleSelectPedido = pedidoId => {
    setSelectedPedidos(prev =>
      prev.includes(pedidoId)
        ? prev.filter(id => id !== pedidoId)
        : [...prev, pedidoId]
    );
  };

  const selectAll = pedidosFiltrados => {
    if (selectedPedidos.length === pedidosFiltrados.length) {
      setSelectedPedidos([]);
    } else {
      setSelectedPedidos(pedidosFiltrados.map(p => p._id));
    }
  };

  // Filtrar pedidos
  const getPedidosFiltrados = () => {
    if (!dados?.pedidos) return [];

    return dados.pedidos.filter(pedido => {
      // Verificar status
      let passaFiltroStatus = true;

      if (filtro === 'pendente') {
        if (tipoFiltro === 'todos') {
          passaFiltroStatus =
            pedido.controleFinanceiro?.royalties?.status === 'pendente' ||
            pedido.controleFinanceiro?.etiquetas?.status === 'pendente' ||
            pedido.controleFinanceiro?.embalagens?.status === 'pendente';
        } else {
          passaFiltroStatus =
            pedido.controleFinanceiro?.[tipoFiltro]?.status === 'pendente';
        }
      } else if (filtro === 'pago') {
        if (tipoFiltro === 'todos') {
          passaFiltroStatus =
            pedido.controleFinanceiro?.royalties?.status === 'pago' &&
            pedido.controleFinanceiro?.etiquetas?.status === 'pago' &&
            pedido.controleFinanceiro?.embalagens?.status === 'pago';
        } else {
          passaFiltroStatus =
            pedido.controleFinanceiro?.[tipoFiltro]?.status === 'pago';
        }
      }

      return passaFiltroStatus;
    });
  };

  const pedidosFiltrados = getPedidosFiltrados();

  if (loading) {
    return (
      <Layout>
        <div className='flex justify-center items-center h-64'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500'></div>
        </div>
      </Layout>
    );
  }

  const { stats } = dados || {};

  return (
    <>
      <Head>
        <title>Controle Financeiro - Admin</title>
      </Head>
      <Layout>
        <div className='max-w-7xl mx-auto px-4 py-4 sm:py-6'>
          {/* Header */}
          <div className='mb-4 sm:mb-6'>
            <h1 className='text-xl sm:text-2xl font-bold text-gray-800 mb-2'>
              💰 Controle Financeiro
            </h1>
            <p className='text-sm text-gray-600'>
              Gerencie pagamentos de royalties, etiquetas e embalagens
            </p>
          </div>

          {/* Cards de Resumo */}
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6'>
            {/* Total a Receber */}
            <div className='bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-3 sm:p-4 col-span-2 lg:col-span-1'>
              <div className='text-xs sm:text-sm opacity-80'>Total a Receber</div>
              <div className='text-xl sm:text-2xl font-bold mt-1'>
                R$ {(stats?.totalAReceber || 0).toFixed(2)}
              </div>
              <div className='text-xs opacity-70 mt-1'>
                {(stats?.royalties?.qtdPendente || 0) +
                  (stats?.etiquetas?.qtdPendente || 0) +
                  (stats?.embalagens?.qtdPendente || 0)}{' '}
                itens pendentes
              </div>
            </div>

            {/* Royalties */}
            <div className='bg-white rounded-lg shadow p-3 sm:p-4 border-l-4 border-blue-500'>
              <div className='text-xs sm:text-sm text-gray-500'>Royalties (5%)</div>
              <div className='text-lg sm:text-xl font-bold text-blue-600 mt-1'>
                R$ {(stats?.royalties?.pendente || 0).toFixed(2)}
              </div>
              <div className='text-xs text-gray-500 mt-1'>
                {stats?.royalties?.qtdPendente || 0} pendente
                {stats?.royalties?.qtdPendente !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Etiquetas */}
            <div className='bg-white rounded-lg shadow p-3 sm:p-4 border-l-4 border-green-500'>
              <div className='text-xs sm:text-sm text-gray-500'>Etiquetas</div>
              <div className='text-lg sm:text-xl font-bold text-green-600 mt-1'>
                R$ {(stats?.etiquetas?.pendente || 0).toFixed(2)}
              </div>
              <div className='text-xs text-gray-500 mt-1'>
                {stats?.etiquetas?.qtdPendente || 0} pendente
                {stats?.etiquetas?.qtdPendente !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Embalagens */}
            <div className='bg-white rounded-lg shadow p-3 sm:p-4 border-l-4 border-orange-500'>
              <div className='text-xs sm:text-sm text-gray-500'>Embalagens</div>
              <div className='text-lg sm:text-xl font-bold text-orange-600 mt-1'>
                R$ {(stats?.embalagens?.pendente || 0).toFixed(2)}
              </div>
              <div className='text-xs text-gray-500 mt-1'>
                {stats?.embalagens?.qtdPendente || 0} pendente
                {stats?.embalagens?.qtdPendente !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Já Recebido */}
          <div className='bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
              <div>
                <span className='text-green-800 font-medium text-sm'>✅ Já Recebido:</span>
                <span className='text-green-600 font-bold text-lg sm:text-xl ml-2'>
                  R$ {(stats?.totalRecebido || 0).toFixed(2)}
                </span>
              </div>
              <div className='text-xs sm:text-sm text-green-700'>
                Royalties: R$ {(stats?.royalties?.pago || 0).toFixed(2)} |
                Etiquetas: R$ {(stats?.etiquetas?.pago || 0).toFixed(2)} |
                Embalagens: R$ {(stats?.embalagens?.pago || 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className='bg-white rounded-lg shadow p-3 sm:p-4 mb-4 sm:mb-6'>
            <div className='flex flex-col sm:flex-row gap-3 sm:gap-4'>
              {/* Período */}
              <div className='flex-1'>
                <label className='block text-xs font-medium text-gray-700 mb-1'>
                  Período
                </label>
                <select
                  value={periodo}
                  onChange={e => setPeriodo(e.target.value)}
                  className='w-full border border-gray-300 rounded px-3 py-2 text-sm'
                >
                  <option value='7dias'>Últimos 7 dias</option>
                  <option value='30dias'>Últimos 30 dias</option>
                  <option value='90dias'>Últimos 90 dias</option>
                  <option value='todos'>Todos</option>
                </select>
              </div>

              {/* Status */}
              <div className='flex-1'>
                <label className='block text-xs font-medium text-gray-700 mb-1'>
                  Status
                </label>
                <select
                  value={filtro}
                  onChange={e => setFiltro(e.target.value)}
                  className='w-full border border-gray-300 rounded px-3 py-2 text-sm'
                >
                  <option value='pendente'>⏳ Pendentes</option>
                  <option value='pago'>✅ Pagos</option>
                  <option value='todos'>📋 Todos</option>
                </select>
              </div>

              {/* Tipo */}
              <div className='flex-1'>
                <label className='block text-xs font-medium text-gray-700 mb-1'>
                  Tipo
                </label>
                <select
                  value={tipoFiltro}
                  onChange={e => setTipoFiltro(e.target.value)}
                  className='w-full border border-gray-300 rounded px-3 py-2 text-sm'
                >
                  <option value='todos'>Todos os tipos</option>
                  <option value='royalties'>💰 Royalties</option>
                  <option value='etiquetas'>🏷️ Etiquetas</option>
                  <option value='embalagens'>📦 Embalagens</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ações em Lote */}
          {selectedPedidos.length > 0 && (
            <div className='bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3'>
              <span className='text-sm text-purple-800 font-medium'>
                {selectedPedidos.length} selecionado
                {selectedPedidos.length !== 1 ? 's' : ''}
              </span>
              <div className='flex flex-wrap gap-2'>
                <button
                  onClick={() => atualizarMultiplos('royalties', 'pago')}
                  disabled={updating === 'bulk'}
                  className='text-xs bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 disabled:opacity-50'
                >
                  ✅ Royalties Pagos
                </button>
                <button
                  onClick={() => atualizarMultiplos('etiquetas', 'pago')}
                  disabled={updating === 'bulk'}
                  className='text-xs bg-green-500 text-white px-3 py-1.5 rounded hover:bg-green-600 disabled:opacity-50'
                >
                  ✅ Etiquetas Pagas
                </button>
                <button
                  onClick={() => atualizarMultiplos('embalagens', 'pago')}
                  disabled={updating === 'bulk'}
                  className='text-xs bg-orange-500 text-white px-3 py-1.5 rounded hover:bg-orange-600 disabled:opacity-50'
                >
                  ✅ Embalagens Pagas
                </button>
              </div>
            </div>
          )}

          {/* Lista de Pedidos */}
          <div className='bg-white rounded-lg shadow overflow-hidden'>
            <div className='p-3 sm:p-4 border-b flex items-center justify-between'>
              <h2 className='font-bold text-gray-800 text-sm sm:text-base'>
                📋 Pedidos ({pedidosFiltrados.length})
              </h2>
              {pedidosFiltrados.length > 0 && (
                <button
                  onClick={() => selectAll(pedidosFiltrados)}
                  className='text-xs text-purple-600 hover:text-purple-800'
                >
                  {selectedPedidos.length === pedidosFiltrados.length
                    ? 'Desmarcar todos'
                    : 'Selecionar todos'}
                </button>
              )}
            </div>

            {pedidosFiltrados.length === 0 ? (
              <div className='p-8 text-center text-gray-500'>
                <div className='text-4xl mb-2'>📭</div>
                <p>Nenhum pedido encontrado com os filtros selecionados</p>
              </div>
            ) : (
              <div className='divide-y'>
                {pedidosFiltrados.map(pedido => {
                  const numeroPedido = pedido._id.toString().slice(-8).toUpperCase();
                  const isSelected = selectedPedidos.includes(pedido._id);

                  return (
                    <div
                      key={pedido._id}
                      className={`p-3 sm:p-4 hover:bg-gray-50 transition ${
                        isSelected ? 'bg-purple-50' : ''
                      }`}
                    >
                      {/* Header do Pedido */}
                      <div className='flex items-start gap-3 mb-3'>
                        <input
                          type='checkbox'
                          checked={isSelected}
                          onChange={() => toggleSelectPedido(pedido._id)}
                          className='mt-1 h-4 w-4 text-purple-600 rounded'
                        />
                        <div className='flex-1 min-w-0'>
                          <div className='flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3'>
                            <span className='font-bold text-gray-800'>
                              #{numeroPedido}
                            </span>
                            <span className='text-sm text-gray-600'>
                              {pedido.fornecedorId?.nome || 'Fornecedor'}
                            </span>
                            <span className='text-xs text-gray-400'>
                              {new Date(pedido.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <div className='text-sm text-gray-600 mt-1'>
                            👤 {pedido.userId}
                          </div>
                        </div>
                        <div className='text-right'>
                          <div className='text-xs text-gray-500'>Total Pedido</div>
                          <div className='font-bold text-gray-800'>
                            R$ {(pedido.total || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Status de Pagamentos */}
                      <div className='grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 ml-7'>
                        {/* Royalties */}
                        <div
                          className={`p-2 rounded border ${
                            pedido.controleFinanceiro?.royalties?.status === 'pago'
                              ? 'bg-green-50 border-green-200'
                              : 'bg-yellow-50 border-yellow-200'
                          }`}
                        >
                          <div className='flex items-center justify-between'>
                            <div>
                              <div className='text-xs text-gray-600'>Royalties</div>
                              <div className='font-bold text-sm'>
                                R$ {(pedido.royalties || 0).toFixed(2)}
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                atualizarStatus(
                                  pedido._id,
                                  'royalties',
                                  pedido.controleFinanceiro?.royalties?.status === 'pago'
                                    ? 'pendente'
                                    : 'pago'
                                )
                              }
                              disabled={updating === `${pedido._id}-royalties`}
                              className={`px-2 py-1 rounded text-xs font-medium transition ${
                                pedido.controleFinanceiro?.royalties?.status === 'pago'
                                  ? 'bg-green-500 text-white hover:bg-green-600'
                                  : 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500'
                              } disabled:opacity-50`}
                            >
                              {updating === `${pedido._id}-royalties`
                                ? '...'
                                : pedido.controleFinanceiro?.royalties?.status === 'pago'
                                ? '✅ Pago'
                                : '⏳ Pendente'}
                            </button>
                          </div>
                        </div>

                        {/* Etiquetas */}
                        <div
                          className={`p-2 rounded border ${
                            pedido.controleFinanceiro?.etiquetas?.status === 'pago'
                              ? 'bg-green-50 border-green-200'
                              : 'bg-yellow-50 border-yellow-200'
                          }`}
                        >
                          <div className='flex items-center justify-between'>
                            <div>
                              <div className='text-xs text-gray-600'>Etiquetas</div>
                              <div className='font-bold text-sm'>
                                R$ {(pedido.totalEtiquetas || 0).toFixed(2)}
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                atualizarStatus(
                                  pedido._id,
                                  'etiquetas',
                                  pedido.controleFinanceiro?.etiquetas?.status === 'pago'
                                    ? 'pendente'
                                    : 'pago'
                                )
                              }
                              disabled={updating === `${pedido._id}-etiquetas`}
                              className={`px-2 py-1 rounded text-xs font-medium transition ${
                                pedido.controleFinanceiro?.etiquetas?.status === 'pago'
                                  ? 'bg-green-500 text-white hover:bg-green-600'
                                  : 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500'
                              } disabled:opacity-50`}
                            >
                              {updating === `${pedido._id}-etiquetas`
                                ? '...'
                                : pedido.controleFinanceiro?.etiquetas?.status === 'pago'
                                ? '✅ Pago'
                                : '⏳ Pendente'}
                            </button>
                          </div>
                        </div>

                        {/* Embalagens */}
                        <div
                          className={`p-2 rounded border ${
                            pedido.controleFinanceiro?.embalagens?.status === 'pago'
                              ? 'bg-green-50 border-green-200'
                              : 'bg-yellow-50 border-yellow-200'
                          }`}
                        >
                          <div className='flex items-center justify-between'>
                            <div>
                              <div className='text-xs text-gray-600'>Embalagens</div>
                              <div className='font-bold text-sm'>
                                R$ {(pedido.totalEmbalagens || 0).toFixed(2)}
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                atualizarStatus(
                                  pedido._id,
                                  'embalagens',
                                  pedido.controleFinanceiro?.embalagens?.status === 'pago'
                                    ? 'pendente'
                                    : 'pago'
                                )
                              }
                              disabled={updating === `${pedido._id}-embalagens`}
                              className={`px-2 py-1 rounded text-xs font-medium transition ${
                                pedido.controleFinanceiro?.embalagens?.status === 'pago'
                                  ? 'bg-green-500 text-white hover:bg-green-600'
                                  : 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500'
                              } disabled:opacity-50`}
                            >
                              {updating === `${pedido._id}-embalagens`
                                ? '...'
                                : pedido.controleFinanceiro?.embalagens?.status === 'pago'
                                ? '✅ Pago'
                                : '⏳ Pendente'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}