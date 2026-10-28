// PAGES/MEUS-PEDIDOS.JS - HISTÓRICO DE PEDIDOS DO DISTRIBUIDOR
// ============================================================
// Exibe todos os pedidos de TODOS os fornecedores
// Mostra o sinal por Pix (total, pago, em aberto, lista de pagamentos). O
// sinal pode ser pago aqui, inteiro ou em partes (ex.: 30% agora, 10% na
// semana seguinte), cada pagamento com o seu comprovante. Um pagamento
// rejeitado volta ao em aberto e pode ser pago de novo.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Head from 'next/head';
import PixPagamento, { LinkComprovante } from '../components/Pix/PixPagamento';
import {
  formatarMoeda,
  parsearValor,
  royaltiesEmAberto,
  resumoSinal,
  STATUS_SINAL,
  STATUS_PAGAMENTO_PIX,
} from '../lib/financeiro';
import { normalizarStatus, STATUS_PEDIDO_INFO } from '../lib/statusPedido';

const ESTILO_SINAL = {
  pendente: 'bg-blue-50 border-blue-200 text-blue-900',
  parcial: 'bg-blue-50 border-blue-200 text-blue-900',
  em_analise: 'bg-amber-50 border-amber-200 text-amber-900',
  confirmado: 'bg-green-50 border-green-200 text-green-900',
  rejeitado: 'bg-red-50 border-red-300 text-red-900',
};
const BADGE_PAGAMENTO = {
  em_analise: 'bg-amber-100 text-amber-800',
  confirmado: 'bg-green-100 text-green-800',
  rejeitado: 'bg-red-100 text-red-800',
};

export default function MeusPedidos() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('todos');

  // Filtro inicial vindo do dashboard (/meus-pedidos?status=pendente)
  useEffect(() => {
    if (router.isReady && router.query.status)
      setFiltroStatus(normalizarStatus(String(router.query.status)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);
  const [resumoFinanceiro, setResumoFinanceiro] = useState(null);
  const [erro, setErro] = useState(null);
  const [pagandoSinal, setPagandoSinal] = useState(null); // pedido com sinal em aberto

  useEffect(() => {
    buscarPedidos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const calcularResumoFinanceiro = pedidosList => {
    let totalPendente = 0;
    let pedidosComPendencia = 0;

    pedidosList.forEach(pedido => {
      const pendentePedido = royaltiesEmAberto(pedido);

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
      confirmado: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Status do pagamento dos royalties do pedido (conta as baixas parciais por Pix)
  const getStatusPagamento = pedido => {
    const falta = royaltiesEmAberto(pedido);

    if (falta <= 0) {
      return { status: 'pago', label: 'Pago', color: 'bg-green-100 text-green-800', icon: '✓' };
    }
    if (falta < (pedido.royalties || 0) - 0.004) {
      return { status: 'parcial', label: 'Parcial', color: 'bg-blue-100 text-blue-800', icon: '◐' };
    }
    return {
      status: 'pendente',
      label: 'Pendente',
      color: 'bg-yellow-100 text-yellow-800',
      icon: '⏳',
    };
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
      itensPorCategoria[categoria].subtotal += (item.quantidade || 0) * (item.precoUnitario || 0);
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
              <h1 className='text-3xl font-bold text-gray-800 mb-2'>📋 Meus Pedidos</h1>
              <p className='text-gray-600'>Acompanhe o histórico e status dos seus pedidos</p>
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
              <button onClick={buscarPedidos} className='mt-2 text-red-700 underline'>
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
                    <p className='font-medium text-red-800'>Você tem pagamentos pendentes</p>
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
            <h3 className='text-lg font-semibold text-gray-800 mb-4'>Filtrar por Status</h3>
            <div className='flex flex-wrap gap-2'>
              {[
                { value: 'todos', label: 'Todos os Pedidos', icon: '📋' },
                { value: 'pendente', label: 'Pendentes', icon: '⏳' },
                { value: 'confirmado', label: 'Confirmados', icon: '✅' },
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
              <h3 className='text-xl font-medium text-gray-900 mb-2'>Nenhum pedido encontrado</h3>
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
                // pedidos antigos "enviado"/"entregue" aparecem como confirmados
                const statusPedido = normalizarStatus(pedido.status);

                return (
                  <div key={pedido._id} className='bg-white rounded-lg shadow-md p-6'>
                    {/* Header do Pedido */}
                    <div className='flex justify-between items-start mb-4'>
                      <div>
                        <h3 className='text-lg font-semibold text-gray-900'>
                          Pedido #{pedido._id?.slice(-8).toUpperCase()}
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
                          Fornecedor:{' '}
                          <span className='font-medium'>{pedido.fornecedorId?.nome || 'N/A'}</span>
                        </p>
                      </div>
                      <div className='text-right'>
                        {/* Status do Pedido */}
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            statusPedido,
                          )}`}
                        >
                          <span>{STATUS_PEDIDO_INFO[statusPedido]?.icone || '📋'}</span>
                          {STATUS_PEDIDO_INFO[statusPedido]?.label || statusPedido}
                        </span>

                        {/* Status de Pagamento */}
                        <div className='mt-2'>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${statusPagamento.color}`}
                          >
                            <span>{statusPagamento.icon}</span>
                            Royalties: {statusPagamento.label}
                          </span>
                        </div>

                        <p className='text-lg font-bold text-green-600 mt-2'>
                          R$ {pedido.total?.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Sinal por Pix ao fornecedor (pode ser pago em partes) */}
                    {pedido.sinal && ESTILO_SINAL[pedido.sinal.status] && (() => {
                      const r = resumoSinal(pedido);
                      return (
                        <div
                          className={`rounded-lg border p-3 mb-4 ${ESTILO_SINAL[pedido.sinal.status]}`}
                        >
                          <div className='flex flex-wrap items-start justify-between gap-3'>
                            <div className='min-w-0'>
                              <p className='text-sm font-semibold'>
                                {STATUS_SINAL[pedido.sinal.status].label} · sinal de {r.percentual}%
                                = {formatarMoeda(r.total)}
                              </p>
                              <p className='text-xs opacity-80'>
                                {pedido.sinal.status === 'pendente' &&
                                  'A pagar por Pix ao fornecedor, tudo ou em partes — pague quando o pedido estiver fechado'}
                                {pedido.sinal.status === 'em_analise' &&
                                  'Comprovante enviado — aguardando a conferência do crédito'}
                                {pedido.sinal.status === 'parcial' &&
                                  'Parte do sinal confirmada; o restante continua em aberto'}
                                {pedido.sinal.status === 'confirmado' && 'Sinal pago e confirmado'}
                                {pedido.sinal.status === 'rejeitado' &&
                                  'O pagamento não foi confirmado — pague de novo e envie outro comprovante'}
                              </p>
                            </div>
                            <div className='text-xs text-right shrink-0 tabular-nums'>
                              <div>
                                Confirmado: <strong>{formatarMoeda(r.confirmado)}</strong>
                              </div>
                              {r.emConferencia > 0 && (
                                <div>
                                  Em conferência: <strong>{formatarMoeda(r.emConferencia)}</strong>
                                </div>
                              )}
                              <div className={r.emAberto > 0 ? 'font-bold' : ''}>
                                Falta: <strong>{formatarMoeda(r.emAberto)}</strong>
                              </div>
                            </div>
                          </div>

                          {r.pagamentos.length > 0 && (
                            <ul className='mt-3 space-y-1 border-t border-black/10 pt-2'>
                              {r.pagamentos.map((p, i) => (
                                <li
                                  key={p._id || i}
                                  className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs'
                                >
                                  <span className='font-semibold tabular-nums'>
                                    {formatarMoeda(p.valor)}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full font-medium ${BADGE_PAGAMENTO[p.status]}`}
                                  >
                                    {STATUS_PAGAMENTO_PIX[p.status]?.label || p.status}
                                  </span>
                                  {p.enviadoEm && (
                                    <span className='opacity-70'>
                                      {new Date(p.enviadoEm).toLocaleDateString('pt-BR')}
                                    </span>
                                  )}
                                  <LinkComprovante id={p.comprovanteId} className='text-xs'>
                                    Comprovante
                                  </LinkComprovante>
                                  {p.status === 'rejeitado' && p.motivoRejeicao && (
                                    <span className='w-full text-red-800'>
                                      <strong>Motivo:</strong> {p.motivoRejeicao}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}

                          {r.emAberto >= 0.01 && (
                            <button
                              onClick={() => setPagandoSinal(pedido)}
                              className={`mt-3 w-full sm:w-auto text-white px-4 py-2 rounded-lg text-sm font-semibold transition ${
                                pedido.sinal.status === 'rejeitado'
                                  ? 'bg-red-600 hover:bg-red-700'
                                  : 'bg-blue-600 hover:bg-blue-700'
                              }`}
                            >
                              {r.confirmado + r.emConferencia > 0
                                ? `Pagar o restante (${formatarMoeda(r.emAberto)}) por Pix`
                                : 'Pagar sinal por Pix'}
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* Itens organizados por categoria */}
                    <div className='border-t pt-4'>
                      <h4 className='font-medium text-gray-800 mb-3'>
                        Itens ({pedido.itens?.length || 0}) - Organizados por Categoria
                      </h4>

                      {Object.entries(itensPorCategoria).map(([categoria, catData]) => (
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
                                {catData.itens.length === 1 ? 'item' : 'itens'}
                              </span>
                            </div>
                          </div>

                          {/* Itens da Categoria */}
                          <div className='p-3 space-y-2'>
                            {catData.itens.map((item, index) => (
                              <div key={index}>
                                <div className='flex items-center gap-3 p-2 hover:bg-gray-50 rounded'>
                                  {item.imagem || item.produtoId?.imagem ? (
                                    <img
                                      src={item.imagem || item.produtoId.imagem}
                                      alt={item.nome}
                                      className='w-12 h-12 object-cover rounded'
                                    />
                                  ) : (
                                    <div className='w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs'>
                                      📦
                                    </div>
                                  )}
                                  <div className='flex-1'>
                                    <p className='font-medium text-gray-900'>{item.nome}</p>
                                    <p className='text-sm text-gray-600'>Código: {item.codigo}</p>
                                  </div>
                                  <div className='text-right'>
                                    <p className='font-medium'>
                                      {item.quantidade}x R$ {item.precoUnitario?.toFixed(2)}
                                    </p>
                                    <p className='text-sm text-gray-600'>
                                      Total: R${' '}
                                      {((item.quantidade || 0) * (item.precoUnitario || 0)).toFixed(
                                        2,
                                      )}
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
                              <span className='text-gray-700'>Subtotal {categoria}:</span>
                              <span className='text-green-600'>
                                R$ {catData.subtotal.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
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
                          <div className='flex justify-between items-center text-sm'>
                            <span className='text-gray-600'>Royalties (5%):</span>
                            <span>R$ {pedido.royalties?.toFixed(2)}</span>
                          </div>
                          <div className='flex justify-between items-center font-bold text-lg border-t pt-2 mt-2'>
                            <span>Total:</span>
                            <span className='text-green-600'>R$ {pedido.total?.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Coluna Direita - Status de Pagamentos */}
                        <div className='bg-gray-50 rounded-lg p-3'>
                          <h5 className='font-medium text-gray-700 mb-2 text-sm'>
                            💳 Pagamento dos royalties
                          </h5>
                          <div className='space-y-1 text-xs'>
                            <div className='flex justify-between items-center'>
                              <span>Royalties:</span>
                              {royaltiesEmAberto(pedido) <= 0 ? (
                                <span className='text-green-600 font-medium'>✓ Pago</span>
                              ) : royaltiesEmAberto(pedido) < (pedido.royalties || 0) - 0.004 ? (
                                <span className='text-blue-600 font-medium'>
                                  ◐ Falta {formatarMoeda(royaltiesEmAberto(pedido))}
                                </span>
                              ) : (
                                <span className='text-yellow-600 font-medium'>⏳ Pendente</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => router.push('/pagamentos')}
                            className='mt-2 text-xs text-blue-600 hover:text-blue-800 underline'
                          >
                            {royaltiesEmAberto(pedido) > 0 ? 'Pagar por Pix →' : 'Ver detalhes →'}
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

        {pagandoSinal && (
          <ModalPagarSinal
            pedido={pagandoSinal}
            onFechar={() => setPagandoSinal(null)}
            onConcluido={() => {
              setPagandoSinal(null);
              buscarPedidos();
            }}
          />
        )}
      </Layout>
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL: PAGAR O SINAL POR PIX (TUDO O QUE FALTA OU UMA PARTE)
// Passo 1: escolher o valor · Passo 2: Pix + comprovante
// ══════════════════════════════════════════════════════════════
function ModalPagarSinal({ pedido, onFechar, onConcluido }) {
  const emAberto = resumoSinal(pedido).emAberto;
  const [modo, setModo] = useState('total'); // total | parcial
  const [valorTexto, setValorTexto] = useState('');
  const [cobranca, setCobranca] = useState(null);
  const [comprovante, setComprovante] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const valorEscolhido = modo === 'total' ? emAberto : parsearValor(valorTexto);
  const valorValido =
    Number.isFinite(valorEscolhido) && valorEscolhido >= 0.01 && valorEscolhido <= emAberto;

  const gerarPix = async () => {
    setErro('');
    if (!valorValido) {
      setErro(
        valorEscolhido > emAberto
          ? `O valor não pode ser maior do que ${formatarMoeda(emAberto)}.`
          : 'Informe um valor válido. Ex.: 150,00',
      );
      return;
    }
    setCarregando(true);
    try {
      const r = await fetch(
        `/api/user/sinal?pedidoId=${pedido._id}&valor=${encodeURIComponent(valorEscolhido)}`,
      );
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message || 'Não foi possível gerar o Pix do sinal');
      setCobranca(data.pix);
      setComprovante(null);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  };

  const registrar = async () => {
    setErro('');
    setCarregando(true);
    try {
      const r = await fetch('/api/user/sinal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedidoId: pedido._id,
          valor: cobranca.valor,
          txid: cobranca.txid,
          comprovanteId: comprovante.id,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message || 'Não foi possível registrar o pagamento');
      onConcluido();
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4'
      onClick={() => !carregando && onFechar()}
    >
      <div
        className='bg-white w-full sm:max-w-lg max-h-[92vh] rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col'
        onClick={e => e.stopPropagation()}
      >
        <div className='px-5 py-4 border-b flex items-start justify-between gap-3'>
          <div>
            <h2 className='text-base font-bold text-gray-900'>
              Sinal do pedido #{pedido._id?.slice(-8).toUpperCase()}
            </h2>
            <p className='text-xs text-gray-500 mt-0.5'>
              {pedido.fornecedorId?.nome} · falta <strong>{formatarMoeda(emAberto)}</strong> de{' '}
              {formatarMoeda(pedido.sinal?.valor)}
            </p>
          </div>
          <button
            type='button'
            onClick={onFechar}
            disabled={carregando}
            className='text-gray-400 hover:text-gray-600 text-2xl leading-none -mt-1'
            aria-label='Fechar'
          >
            ×
          </button>
        </div>

        <div className='px-5 py-5 overflow-y-auto flex-1 space-y-4'>
          {!cobranca ? (
            <>
              <p className='text-sm font-semibold text-gray-800'>Quanto quer pagar agora?</p>

              <label
                className={`flex items-center gap-3 border-2 rounded-xl p-4 cursor-pointer transition ${
                  modo === 'total' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <input
                  type='radio'
                  name='modoSinal'
                  checked={modo === 'total'}
                  onChange={() => setModo('total')}
                  className='h-4 w-4'
                />
                <div className='flex-1'>
                  <p className='text-sm font-semibold text-gray-900'>Tudo o que falta</p>
                  <p className='text-xs text-gray-500'>Completa o sinal deste pedido</p>
                </div>
                <span className='font-bold text-gray-900 tabular-nums'>{formatarMoeda(emAberto)}</span>
              </label>

              <label
                className={`block border-2 rounded-xl p-4 cursor-pointer transition ${
                  modo === 'parcial' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className='flex items-center gap-3'>
                  <input
                    type='radio'
                    name='modoSinal'
                    checked={modo === 'parcial'}
                    onChange={() => setModo('parcial')}
                    className='h-4 w-4'
                  />
                  <div className='flex-1'>
                    <p className='text-sm font-semibold text-gray-900'>Outro valor</p>
                    <p className='text-xs text-gray-500'>
                      Paga uma parte agora; o restante fica em aberto
                    </p>
                  </div>
                </div>
                {modo === 'parcial' && (
                  <div className='mt-3 flex items-center gap-2'>
                    <span className='text-sm font-semibold text-gray-600'>R$</span>
                    <input
                      type='text'
                      inputMode='decimal'
                      autoFocus
                      value={valorTexto}
                      onChange={e => setValorTexto(e.target.value.replace(/[^\d.,]/g, ''))}
                      onKeyDown={e => e.key === 'Enter' && gerarPix()}
                      placeholder='0,00'
                      className='flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-lg font-semibold tabular-nums focus:outline-none focus:border-blue-500'
                    />
                  </div>
                )}
              </label>
            </>
          ) : (
            <>
              <PixPagamento
                cobranca={cobranca}
                finalidade='sinal'
                rotuloValor='Sinal a pagar agora'
                comprovante={comprovante}
                onComprovante={setComprovante}
                desativado={carregando}
              />
              <p className='text-xs text-gray-500'>
                Pague por Pix ao fornecedor e anexe o comprovante. O administrador confere o
                crédito a seguir
                {cobranca.valor < emAberto - 0.004 &&
                  `; ficam ${formatarMoeda(emAberto - cobranca.valor)} em aberto para pagar depois`}
                .
              </p>
            </>
          )}

          {erro && (
            <p className='text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2'>
              {erro}
            </p>
          )}
        </div>

        <div className='px-5 py-4 border-t bg-gray-50 rounded-b-2xl sm:rounded-b-xl flex gap-3'>
          {!cobranca ? (
            <>
              <button
                type='button'
                onClick={onFechar}
                className='flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium'
              >
                Cancelar
              </button>
              <button
                type='button'
                onClick={gerarPix}
                disabled={carregando || (modo === 'parcial' && !valorTexto)}
                className='flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50'
              >
                {carregando ? 'Gerando…' : 'Gerar Pix'}
              </button>
            </>
          ) : (
            <>
              <button
                type='button'
                onClick={() => {
                  setCobranca(null);
                  setErro('');
                }}
                disabled={carregando}
                className='flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50'
              >
                ← Alterar valor
              </button>
              <button
                type='button'
                onClick={registrar}
                disabled={carregando || !comprovante?.id}
                className='flex-1 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {carregando ? 'Enviando…' : 'Confirmar pagamento'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
