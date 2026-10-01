// PAGES/ADMIN/FINANCEIRO.JS - CONTROLE DOS ROYALTIES
// ===================================
// Interface para o admin acompanhar e dar baixa nos royalties de cada pedido
// + Chave Pix onde os distribuidores pagam os royalties
// + Conferência dos Pix de royalties (comprovante, confirmar / rejeitar)

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminShell from '../../components/Admin/AdminShell';
import {
  Card,
  Badge,
  Botao,
  Campo,
  Input,
  Select,
  Alerta,
  Modal,
  moeda,
  dataHora,
} from '../../components/Admin/ui';
import { LinkComprovante } from '../../components/Pix/PixPagamento';
import { royaltiesEmAberto, STATUS_PAGAMENTO_PIX } from '../../lib/financeiro';

const TIPOS_PIX = [
  { id: 'cnpj', label: 'CNPJ', exemplo: '00.000.000/0000-00' },
  { id: 'cpf', label: 'CPF', exemplo: '000.000.000-00' },
  { id: 'email', label: 'Email', exemplo: 'financeiro@empresa.com.br' },
  { id: 'telefone', label: 'Telefone', exemplo: '(11) 99999-9999' },
  { id: 'aleatoria', label: 'Chave aleatória', exemplo: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
];

export default function FinanceiroAdmin() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState(null);
  const [filtro, setFiltro] = useState('pendente');
  const [filtroDistribuidor, setFiltroDistribuidor] = useState('todos'); // ← NOVO
  const [distribuidores, setDistribuidores] = useState([]); // ← NOVO
  const [periodo, setPeriodo] = useState('30dias');
  const [updating, setUpdating] = useState(null);
  const [selectedPedidos, setSelectedPedidos] = useState([]);

  // ── Pix de royalties ──
  const [pix, setPix] = useState(null); // { pixRoyalties, pixConfigurado }
  const [pagamentosPix, setPagamentosPix] = useState({ resumo: null, pagamentos: [] });
  const [filtroPix, setFiltroPix] = useState('em_analise');
  const [conferindo, setConferindo] = useState(null);
  const [modalPix, setModalPix] = useState(false);
  const [modalRejeitar, setModalRejeitar] = useState(null); // pagamento
  const [erroPix, setErroPix] = useState('');

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo]);

  const carregarPix = useCallback(async () => {
    try {
      const [rConfig, rPagamentos] = await Promise.all([
        fetch('/api/admin/configuracoes'),
        fetch(`/api/admin/pagamentos-pix?status=${filtroPix}`),
      ]);
      if (rConfig.ok) setPix(await rConfig.json());
      if (rPagamentos.ok) setPagamentosPix(await rPagamentos.json());
    } catch (error) {
      console.error('Erro ao carregar Pix:', error);
    }
  }, [filtroPix]);

  useEffect(() => {
    carregarPix();
  }, [carregarPix]);

  const conferirPagamento = async (pagamento, acao, motivo = '') => {
    setConferindo(pagamento._id);
    setErroPix('');
    try {
      const response = await fetch('/api/admin/pagamentos-pix', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pagamento._id, acao, motivo }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErroPix(data.message || 'Erro ao conferir o pagamento');
        return false;
      }
      await Promise.all([carregarPix(), carregarDados()]);
      return true;
    } catch (error) {
      console.error('Erro ao conferir pagamento:', error);
      setErroPix('Erro de conexão');
      return false;
    } finally {
      setConferindo(null);
    }
  };

  const carregarDados = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/financeiro?periodo=${periodo}`);
      if (response.ok) {
        const data = await response.json();
        setDados(data);

        // ══════════════════════════════════════════════════════════════
        // EXTRAIR LISTA ÚNICA DE DISTRIBUIDORES DOS PEDIDOS
        // ══════════════════════════════════════════════════════════════
        if (data.pedidos) {
          const distribuidoresUnicos = [...new Set(data.pedidos.map(p => p.userId))].filter(
            Boolean,
          );
          setDistribuidores(distribuidoresUnicos.sort());
        }
      } else if (response.status === 403) {
        router.push('/');
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const atualizarStatus = async (pedidoId, novoStatus) => {
    try {
      setUpdating(pedidoId);
      const response = await fetch('/api/admin/financeiro', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidoId, status: novoStatus }),
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

  const atualizarMultiplos = async status => {
    if (selectedPedidos.length === 0) return;

    try {
      setUpdating('bulk');
      const response = await fetch('/api/admin/financeiro', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidoIds: selectedPedidos, status }),
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
      prev.includes(pedidoId) ? prev.filter(id => id !== pedidoId) : [...prev, pedidoId],
    );
  };

  const selectAll = pedidosFiltrados => {
    if (selectedPedidos.length === pedidosFiltrados.length) {
      setSelectedPedidos([]);
    } else {
      setSelectedPedidos(pedidosFiltrados.map(p => p._id));
    }
  };

  // Limpar filtros
  const limparFiltros = () => {
    setFiltro('pendente');
    setFiltroDistribuidor('todos');
  };

  // Filtrar pedidos: por distribuidor e por royalties em aberto / pagos
  const pedidosFiltrados = (dados?.pedidos || []).filter(pedido => {
    if (filtroDistribuidor !== 'todos' && pedido.userId !== filtroDistribuidor) return false;
    if (filtro === 'pendente') return royaltiesEmAberto(pedido) > 0;
    if (filtro === 'pago') return royaltiesEmAberto(pedido) <= 0;
    return true;
  });

  // Royalties em aberto nos pedidos filtrados (já desconta os Pix parciais)
  const totalPendenteFiltrado = pedidosFiltrados.reduce(
    (soma, pedido) => soma + royaltiesEmAberto(pedido),
    0,
  );
  const temFiltroAtivo = filtro !== 'pendente' || filtroDistribuidor !== 'todos';

  if (loading) {
    return (
      <AdminShell titulo='Controle financeiro'>
        <div className='flex justify-center items-center h-64'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800'></div>
        </div>
      </AdminShell>
    );
  }

  const { stats } = dados || {};

  return (
    <>
      <Head>
        <title>Controle Financeiro - Admin</title>
      </Head>
      <AdminShell
        titulo='Controle financeiro'
        subtitulo='Royalties a receber dos distribuidores'
      >
        <div>
          {/* ═══════════ PIX DE ROYALTIES ═══════════ */}
          <div className='grid lg:grid-cols-3 gap-4 mb-4 sm:mb-6'>
            {/* Chave Pix */}
            <Card
              titulo='Chave Pix dos royalties'
              descricao='Para onde os distribuidores pagam'
              acoes={
                <Botao variante='secundario' tamanho='sm' onClick={() => setModalPix(true)}>
                  {pix?.pixConfigurado ? 'Alterar' : 'Configurar'}
                </Botao>
              }
            >
              {!pix ? (
                <p className='text-sm text-gray-400'>Carregando…</p>
              ) : pix.pixConfigurado ? (
                <dl className='text-sm space-y-1'>
                  <div className='flex justify-between gap-3'>
                    <dt className='text-gray-500'>
                      {TIPOS_PIX.find(t => t.id === pix.pixRoyalties.tipo)?.label || 'Chave'}
                    </dt>
                    <dd className='font-mono font-medium text-gray-900 break-all text-right'>
                      {pix.pixRoyalties.chave}
                    </dd>
                  </div>
                  <div className='flex justify-between gap-3'>
                    <dt className='text-gray-500'>Titular</dt>
                    <dd className='font-medium text-gray-900 text-right'>
                      {pix.pixRoyalties.titular}
                    </dd>
                  </div>
                </dl>
              ) : (
                <Alerta tipo='aviso'>
                  Sem chave configurada: os distribuidores ainda não conseguem pagar os royalties
                  por Pix.
                </Alerta>
              )}
            </Card>

            {/* Pagamentos para conferir */}
            <Card
              className='lg:col-span-2'
              semPadding
              titulo='Pix de royalties recebidos'
              descricao='A baixa já foi feita. Confirme depois de ver o crédito no extrato, ou rejeite para a dívida voltar.'
              acoes={
                <Select
                  value={filtroPix}
                  onChange={e => setFiltroPix(e.target.value)}
                  className='!w-auto !py-1.5 text-xs'
                >
                  <option value='em_analise'>
                    A conferir ({pagamentosPix.resumo?.em_analise?.total || 0})
                  </option>
                  <option value='confirmado'>Confirmados</option>
                  <option value='rejeitado'>Rejeitados</option>
                  <option value='todos'>Todos</option>
                </Select>
              }
            >
              {erroPix && (
                <div className='px-5 pt-4'>
                  <Alerta tipo='erro'>{erroPix}</Alerta>
                </div>
              )}
              {pagamentosPix.pagamentos.length === 0 ? (
                <p className='px-5 py-8 text-center text-sm text-gray-400'>
                  {filtroPix === 'em_analise'
                    ? 'Nenhum Pix à espera de conferência.'
                    : 'Nenhum pagamento neste filtro.'}
                </p>
              ) : (
                <ul className='divide-y divide-gray-100 max-h-96 overflow-y-auto'>
                  {pagamentosPix.pagamentos.map(p => {
                    const st = STATUS_PAGAMENTO_PIX[p.status] || STATUS_PAGAMENTO_PIX.em_analise;
                    return (
                      <li key={p._id} className='px-5 py-3'>
                        <div className='flex flex-wrap items-start justify-between gap-3'>
                          <div className='min-w-0'>
                            <div className='flex flex-wrap items-center gap-2'>
                              <span className='font-bold text-gray-900 tabular-nums'>
                                {moeda(p.valor)}
                              </span>
                              <Badge cor={st.cor}>{st.label}</Badge>
                            </div>
                            <p className='text-sm text-gray-700'>
                              {p.userNome || p.userId}{' '}
                              <span className='text-gray-400'>({p.userId})</span>
                            </p>
                            <p className='text-xs text-gray-500'>
                              {dataHora(p.createdAt)} · ID do Pix{' '}
                              <span className='font-mono'>{p.txid}</span>
                            </p>
                            <p className='text-xs text-gray-500'>
                              Abatido em {p.alocacoes.map(a => `#${a.numero}`).join(', ') || '—'} ·
                              em aberto {moeda(p.saldoAntes)} → {moeda(p.saldoDepois)}
                            </p>
                            {p.status === 'rejeitado' && p.motivoRejeicao && (
                              <p className='text-xs text-red-700 mt-0.5'>
                                Motivo: {p.motivoRejeicao}
                              </p>
                            )}
                          </div>
                          <div className='flex flex-wrap items-center gap-2'>
                            <LinkComprovante id={p.comprovanteId} className='text-sm' />
                            {p.status === 'em_analise' && (
                              <Botao
                                tamanho='sm'
                                variante='azul'
                                loading={conferindo === p._id}
                                onClick={() => conferirPagamento(p, 'confirmar')}
                              >
                                Confirmar
                              </Botao>
                            )}
                            {p.status !== 'rejeitado' && (
                              <Botao
                                tamanho='sm'
                                variante='secundario'
                                className='!text-red-700 !border-red-300'
                                disabled={conferindo === p._id}
                                onClick={() => setModalRejeitar(p)}
                              >
                                Rejeitar
                              </Botao>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          {/* Cards de Resumo */}
          <div className='grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6'>
            <div className='bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-3 sm:p-4 col-span-2 lg:col-span-1'>
              <div className='text-xs sm:text-sm opacity-80'>Royalties a receber</div>
              <div className='text-xl sm:text-2xl font-bold mt-1'>
                {moeda(stats?.royalties?.pendente)}
              </div>
              <div className='text-xs opacity-70 mt-1'>
                {stats?.royalties?.qtdPendente || 0} pedido
                {stats?.royalties?.qtdPendente !== 1 ? 's' : ''} em aberto
              </div>
            </div>

            <div className='bg-white rounded-lg shadow p-3 sm:p-4 border-l-4 border-green-500'>
              <div className='text-xs sm:text-sm text-gray-500'>Já recebido</div>
              <div className='text-lg sm:text-xl font-bold text-green-600 mt-1'>
                {moeda(stats?.royalties?.pago)}
              </div>
              <div className='text-xs text-gray-500 mt-1'>
                {stats?.royalties?.qtdPago || 0} pedido
                {stats?.royalties?.qtdPago !== 1 ? 's' : ''} quitado
                {stats?.royalties?.qtdPago !== 1 ? 's' : ''}
              </div>
            </div>

            <div className='bg-white rounded-lg shadow p-3 sm:p-4 border-l-4 border-blue-500'>
              <div className='text-xs sm:text-sm text-gray-500'>Total de royalties</div>
              <div className='text-lg sm:text-xl font-bold text-blue-600 mt-1'>
                {moeda(stats?.royalties?.total)}
              </div>
              <div className='text-xs text-gray-500 mt-1'>
                {stats?.totalPedidos || 0} pedido{stats?.totalPedidos !== 1 ? 's' : ''} no período
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className='bg-white rounded-lg shadow p-3 sm:p-4 mb-4 sm:mb-6'>
            <div className='flex items-center justify-between mb-3'>
              <span className='text-sm font-medium text-gray-700'>Filtros</span>
              {temFiltroAtivo && (
                <button
                  onClick={limparFiltros}
                  className='text-xs text-blue-600 hover:text-blue-800 underline'
                >
                  Limpar filtros
                </button>
              )}
            </div>

            <div className='grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4'>
              {/* Período */}
              <div>
                <label className='block text-xs font-medium text-gray-700 mb-1'>Período</label>
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

              {/* Status dos royalties */}
              <div>
                <label className='block text-xs font-medium text-gray-700 mb-1'>Royalties</label>
                <select
                  value={filtro}
                  onChange={e => setFiltro(e.target.value)}
                  className='w-full border border-gray-300 rounded px-3 py-2 text-sm'
                >
                  <option value='pendente'>⏳ Em aberto</option>
                  <option value='pago'>✅ Pagos</option>
                  <option value='todos'>📋 Todos</option>
                </select>
              </div>

              {/* Distribuidor */}
              <div className='col-span-2 sm:col-span-1'>
                <label className='block text-xs font-medium text-gray-700 mb-1'>Distribuidor</label>
                <select
                  value={filtroDistribuidor}
                  onChange={e => setFiltroDistribuidor(e.target.value)}
                  className='w-full border border-gray-300 rounded px-3 py-2 text-sm'
                >
                  <option value='todos'>Todos os Distribuidores</option>
                  {distribuidores.map(d => (
                    <option key={d} value={d}>
                      👤 {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Indicador de filtro por distribuidor ativo */}
            {filtroDistribuidor !== 'todos' && (
              <div className='mt-3 pt-3 border-t bg-blue-50 -mx-3 sm:-mx-4 px-3 sm:px-4 pb-3 -mb-3 sm:-mb-4 rounded-b-lg'>
                <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
                  <p className='text-sm text-blue-800'>
                    Exibindo <span className='font-bold'>{pedidosFiltrados.length}</span> pedidos de{' '}
                    <span className='font-bold'>{filtroDistribuidor}</span>
                  </p>
                  <div className='text-sm text-blue-700'>
                    Em aberto: <span className='font-bold'>{moeda(totalPendenteFiltrado)}</span>
                  </div>
                </div>
              </div>
            )}
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
                  onClick={() => atualizarMultiplos('pago')}
                  disabled={updating === 'bulk'}
                  className='text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 disabled:opacity-50'
                >
                  ✅ Marcar royalties como pagos
                </button>
                <button
                  onClick={() => atualizarMultiplos('pendente')}
                  disabled={updating === 'bulk'}
                  className='text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50 disabled:opacity-50'
                >
                  Voltar a pendente
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
                  const royalties = pedido.controleFinanceiro?.royalties || {};
                  const pago = royalties.status === 'pago';
                  const abatido = !pago && (royalties.valorPago || 0) > 0.004;

                  return (
                    <div
                      key={pedido._id}
                      className={`p-3 sm:p-4 hover:bg-gray-50 transition ${
                        isSelected ? 'bg-purple-50' : ''
                      }`}
                    >
                      <div className='flex items-start gap-3'>
                        <input
                          type='checkbox'
                          checked={isSelected}
                          onChange={() => toggleSelectPedido(pedido._id)}
                          className='mt-1 h-4 w-4 text-purple-600 rounded'
                        />
                        <div className='flex-1 min-w-0'>
                          <div className='flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3'>
                            <span className='font-bold text-gray-800'>#{numeroPedido}</span>
                            <span className='text-sm text-gray-600'>
                              {pedido.fornecedorId?.nome || 'Fornecedor'}
                            </span>
                            <span className='text-xs text-gray-400'>
                              {new Date(pedido.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <div className='text-sm text-gray-600 mt-1 flex flex-wrap items-center gap-2'>
                            <span className='bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium'>
                              👤 {pedido.userId}
                            </span>
                            <span className='text-xs text-gray-500'>
                              Pedido: {moeda(pedido.total)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Royalties do pedido */}
                      <div
                        className={`mt-3 ml-7 p-2 rounded border flex items-center justify-between gap-3 ${
                          pago ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                        }`}
                      >
                        <div>
                          <div className='text-xs text-gray-600'>Royalties</div>
                          <div className='font-bold text-sm'>{moeda(pedido.royalties)}</div>
                          {abatido && (
                            <div className='text-[11px] text-blue-700'>
                              Pix abateu {moeda(royalties.valorPago)} · falta{' '}
                              {moeda(royaltiesEmAberto(pedido))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => atualizarStatus(pedido._id, pago ? 'pendente' : 'pago')}
                          disabled={updating === pedido._id}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                            pago
                              ? 'bg-green-500 text-white hover:bg-green-600'
                              : 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500'
                          } disabled:opacity-50`}
                        >
                          {updating === pedido._id ? '...' : pago ? '✅ Pago' : '⏳ Pendente'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {modalPix && pix && (
          <ModalChavePix
            inicial={pix.pixRoyalties}
            onFechar={() => setModalPix(false)}
            onGuardado={() => {
              setModalPix(false);
              carregarPix();
            }}
          />
        )}

        {modalRejeitar && (
          <ModalRejeitarPagamento
            pagamento={modalRejeitar}
            loading={conferindo === modalRejeitar._id}
            onFechar={() => setModalRejeitar(null)}
            onConfirmar={async motivo => {
              const ok = await conferirPagamento(modalRejeitar, 'rejeitar', motivo);
              if (ok) setModalRejeitar(null);
            }}
          />
        )}
      </AdminShell>
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL: CHAVE PIX DOS ROYALTIES
// ══════════════════════════════════════════════════════════════
function ModalChavePix({ inicial, onFechar, onGuardado }) {
  const [form, setForm] = useState({
    tipo: inicial?.tipo || 'cnpj',
    chave: inicial?.chave || '',
    titular: inicial?.titular || '',
    cidade: inicial?.cidade || '',
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const set = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

  const guardar = async () => {
    setSalvando(true);
    setErro('');
    try {
      const response = await fetch('/api/admin/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pixRoyalties: form }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return setErro(data.message || 'Erro ao salvar');
      onGuardado();
    } catch {
      setErro('Erro de conexão');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      titulo='Chave Pix dos royalties'
      subtitulo='Os distribuidores pagam os royalties para esta chave'
      onFechar={onFechar}
      bloqueado={salvando}
      largura='max-w-lg'
      rodape={
        <>
          <Botao variante='secundario' onClick={onFechar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao variante='azul' onClick={guardar} loading={salvando}>
            Salvar
          </Botao>
        </>
      }
    >
      <div className='space-y-4'>
        <Alerta tipo='erro'>{erro}</Alerta>
        <div className='grid sm:grid-cols-3 gap-4'>
          <Campo label='Tipo de chave'>
            <Select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              {TIPOS_PIX.map(t => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo label='Chave Pix' className='sm:col-span-2' dica='Vazio = desliga o pagamento por Pix'>
            <Input
              value={form.chave}
              onChange={e => set('chave', e.target.value)}
              placeholder={TIPOS_PIX.find(t => t.id === form.tipo)?.exemplo}
              className='font-mono'
              autoComplete='off'
            />
          </Campo>
          <Campo
            label='Titular da conta'
            obrigatorio
            className='sm:col-span-2'
            dica='Nome que o distribuidor vê ao pagar (máx. 25 caracteres)'
          >
            <Input
              value={form.titular}
              onChange={e => set('titular', e.target.value)}
              maxLength={25}
            />
          </Campo>
          <Campo label='Cidade'>
            <Input
              value={form.cidade}
              onChange={e => set('cidade', e.target.value)}
              maxLength={15}
            />
          </Campo>
        </div>
        <Alerta tipo='info'>
          Faça um Pix de teste de R$ 0,01 depois de salvar: o app do banco tem de mostrar o seu
          nome como recebedor.
        </Alerta>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL: REJEITAR PIX DE ROYALTIES
// ══════════════════════════════════════════════════════════════
function ModalRejeitarPagamento({ pagamento, loading, onFechar, onConfirmar }) {
  const [motivo, setMotivo] = useState('');
  return (
    <Modal
      titulo={`Rejeitar Pix de ${moeda(pagamento.valor)}`}
      subtitulo={`${pagamento.userNome || pagamento.userId} · ${dataHora(pagamento.createdAt)}`}
      onFechar={onFechar}
      bloqueado={loading}
      largura='max-w-md'
      rodape={
        <>
          <Botao variante='secundario' onClick={onFechar} disabled={loading}>
            Cancelar
          </Botao>
          <Botao
            variante='perigo'
            onClick={() => onConfirmar(motivo.trim())}
            loading={loading}
            disabled={!motivo.trim()}
          >
            Rejeitar e desfazer a baixa
          </Botao>
        </>
      }
    >
      <div className='space-y-4'>
        <Alerta tipo='aviso'>
          A baixa é desfeita: {moeda(pagamento.valor)} voltam a ficar em aberto nos pedidos do
          distribuidor, que é avisado por email.
        </Alerta>
        <Campo label='Motivo (o distribuidor vê este texto)' obrigatorio>
          <Input
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder='Ex.: o Pix não entrou na conta'
            maxLength={300}
            autoFocus
          />
        </Campo>
      </div>
    </Modal>
  );
}
