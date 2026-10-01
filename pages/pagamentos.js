// pages/pagamentos.js - PAGAMENTOS DO DISTRIBUIDOR (ROYALTIES POR PIX)
// ===================================
// O distribuidor vê os royalties em aberto e pode pagá-los por Pix:
// quita tudo ou escolhe um valor, anexa o comprovante e a baixa é feita na
// hora (pedidos mais antigos primeiro). O pagamento fica "em conferência"
// até o admin confirmar; se for rejeitado, o valor volta a ficar em aberto.
// Etiquetas e embalagens continuam a ser atualizadas pelo admin.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Head from 'next/head';
import PixPagamento, { LinkComprovante } from '../components/Pix/PixPagamento';
import { formatarMoeda, parsearValor, STATUS_PAGAMENTO_PIX } from '../lib/financeiro';

// Pix gerado e ainda não registrado: fica na sessão do navegador para o
// distribuidor poder ir ao app do banco e voltar sem perder o código
const CHAVE_PIX_PENDENTE = 'pix_royalties_pendente';
const VALIDADE_PIX_PENDENTE = 2 * 60 * 60 * 1000; // 2 h

const lerPixPendente = () => {
  try {
    const dados = JSON.parse(sessionStorage.getItem(CHAVE_PIX_PENDENTE) || 'null');
    if (dados?.cobranca && Date.now() - dados.criadoEm < VALIDADE_PIX_PENDENTE) return dados;
  } catch {}
  return null;
};

const gravarPixPendente = dados => {
  try {
    if (dados) sessionStorage.setItem(CHAVE_PIX_PENDENTE, JSON.stringify(dados));
    else sessionStorage.removeItem(CHAVE_PIX_PENDENTE);
  } catch {}
};

const CORES_STATUS = {
  orange: 'bg-amber-100 text-amber-800',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
};

export default function Pagamentos() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [pixDisponivel, setPixDisponivel] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos'); // todos, pendente, pago
  const [user, setUser] = useState(null);
  const [erro, setErro] = useState(null);
  const [pagando, setPagando] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    verificarAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setPagamentos(data.pagamentos || []);
        setResumo(data.resumo || null);
        setPixDisponivel(Boolean(data.pixDisponivel));

        // Voltou do app do banco com um Pix por registrar: reabre o pagamento
        const pendente = lerPixPendente();
        if (pendente && pendente.cobranca.valor <= (data.resumo?.royaltiesPendentes || 0)) {
          setPagando(true);
        } else if (pendente) {
          gravarPixPendente(null);
        }
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

  const royaltiesPendentesDe = pedido =>
    pedido.royaltiesEmAberto ??
    (pedido.controleFinanceiro?.royalties?.status === 'pago' ? 0 : pedido.royalties || 0);

  // Filtrar pedidos
  const pedidosFiltrados = pedidos.filter(pedido => {
    if (filtro === 'todos') return true;

    const cf = pedido.controleFinanceiro || {};
    const temPendente =
      royaltiesPendentesDe(pedido) > 0 ||
      ((pedido.totalEtiquetas || 0) > 0 && cf?.etiquetas?.status !== 'pago') ||
      ((pedido.totalEmbalagens || 0) > 0 && cf?.embalagens?.status !== 'pago');

    if (filtro === 'pendente') return temPendente;
    if (filtro === 'pago') return !temPendente;
    return true;
  });

  const formatarData = data => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = status => {
    if (status === 'pago') {
      return (
        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>
          ✓ Pago
        </span>
      );
    }
    if (status === 'parcial') {
      return (
        <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'>
          ◐ Parcial
        </span>
      );
    }
    return (
      <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800'>
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
          <div className='min-h-screen flex items-center justify-center'>
            <div className='text-center'>
              <div className='w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
              <p className='text-gray-600'>Carregando pagamentos...</p>
            </div>
          </div>
        </Layout>
      </>
    );
  }

  const emAberto = resumo?.royaltiesPendentes || 0;
  const emConferencia = resumo?.royaltiesEmConferencia || 0;

  return (
    <>
      <Head>
        <title>Pagamentos - Elite Surfing</title>
      </Head>
      <Layout>
        <div className='min-h-screen bg-gray-50 py-6 sm:py-8'>
          <div className='max-w-6xl mx-auto px-4'>
            {/* Header */}
            <div className='mb-6'>
              <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
                <div>
                  <h1 className='text-2xl sm:text-3xl font-bold text-gray-900'>💳 Meus Pagamentos</h1>
                  <p className='text-gray-600 mt-1 text-sm sm:text-base'>
                    Pague os royalties por Pix e acompanhe o status dos seus pedidos
                  </p>
                </div>
                <div className='flex gap-2'>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className='bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition text-sm'
                  >
                    ← Dashboard
                  </button>
                  <button
                    onClick={() => router.push('/meus-pedidos')}
                    className='bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition text-sm'
                  >
                    📋 Ver Pedidos
                  </button>
                </div>
              </div>
            </div>

            {/* Erro */}
            {erro && (
              <div className='bg-red-50 border border-red-200 rounded-xl p-4 mb-6'>
                <p className='text-red-600'>{erro}</p>
                <button onClick={carregarPagamentos} className='mt-2 text-red-700 underline'>
                  Tentar novamente
                </button>
              </div>
            )}

            {aviso && (
              <div className='bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start justify-between gap-3'>
                <p className='text-green-800 text-sm'>{aviso}</p>
                <button onClick={() => setAviso('')} className='text-green-700 text-lg leading-none'>
                  ×
                </button>
              </div>
            )}

            {/* Royalties em aberto + pagar por Pix */}
            {resumo && (
              <div
                className={`rounded-xl shadow-lg p-5 sm:p-6 mb-6 text-white ${
                  emAberto > 0
                    ? 'bg-gradient-to-r from-red-500 to-red-600'
                    : 'bg-gradient-to-r from-green-500 to-green-600'
                }`}
              >
                <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
                  <div>
                    <p className='text-white/80 mb-1 text-sm'>
                      {emAberto > 0 ? 'Royalties em aberto' : 'Royalties em dia'}
                    </p>
                    <p className='text-3xl sm:text-4xl font-bold tabular-nums'>
                      {formatarMoeda(emAberto)}
                    </p>
                    {emConferencia > 0 && (
                      <p className='text-white/90 text-xs mt-2'>
                        {formatarMoeda(emConferencia)} já pagos por Pix, em conferência
                      </p>
                    )}
                  </div>

                  {emAberto > 0 && (
                    <div className='sm:text-right'>
                      <button
                        onClick={() => setPagando(true)}
                        disabled={!pixDisponivel}
                        className='w-full sm:w-auto bg-white text-red-600 font-bold px-6 py-3 rounded-lg shadow hover:bg-red-50 transition disabled:opacity-60 disabled:cursor-not-allowed'
                      >
                        Pagar por Pix
                      </button>
                      <p className='text-white/80 text-xs mt-2'>
                        {pixDisponivel
                          ? 'Quite tudo ou pague só uma parte'
                          : 'Pagamento por Pix ainda não disponível. Fale com o administrador.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resumo Geral */}
            {resumo && (
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6'>
                <div className='bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500'>
                  <p className='text-sm text-gray-600 mb-1'>Total em Pedidos</p>
                  <p className='text-2xl font-bold text-blue-600'>
                    {formatarMoeda(resumo.totalPedidos)}
                  </p>
                </div>

                <div className='bg-white rounded-xl shadow-sm p-5 border-l-4 border-orange-500'>
                  <p className='text-sm text-gray-600 mb-1'>Etiquetas Pendentes</p>
                  <p className='text-2xl font-bold text-orange-600'>
                    {formatarMoeda(resumo.etiquetasPendentes)}
                  </p>
                </div>

                <div className='bg-white rounded-xl shadow-sm p-5 border-l-4 border-purple-500'>
                  <p className='text-sm text-gray-600 mb-1'>Embalagens Pendentes</p>
                  <p className='text-2xl font-bold text-purple-600'>
                    {formatarMoeda(resumo.embalagensPendentes)}
                  </p>
                </div>
              </div>
            )}

            {/* Histórico de pagamentos Pix */}
            {pagamentos.length > 0 && (
              <div className='bg-white rounded-xl shadow-sm mb-6 overflow-hidden'>
                <div className='px-5 py-4 border-b'>
                  <h2 className='font-bold text-gray-900'>Pagamentos por Pix</h2>
                  <p className='text-xs text-gray-500'>
                    Os royalties que pagou por Pix e os respectivos comprovantes
                  </p>
                </div>
                <ul className='divide-y'>
                  {pagamentos.map(p => {
                    const st = STATUS_PAGAMENTO_PIX[p.status] || STATUS_PAGAMENTO_PIX.em_analise;
                    return (
                      <li key={p._id} className='px-5 py-4'>
                        <div className='flex items-start justify-between gap-3'>
                          <div className='min-w-0'>
                            <p className='font-bold text-gray-900 tabular-nums'>
                              {formatarMoeda(p.valor)}
                            </p>
                            <p className='text-xs text-gray-500'>
                              {new Date(p.createdAt).toLocaleString('pt-BR', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                              {p.alocacoes.length > 0 && (
                                <>
                                  {' '}
                                  · abatido em{' '}
                                  {p.alocacoes.map(a => `#${a.numero}`).join(', ')}
                                </>
                              )}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CORES_STATUS[st.cor]}`}
                          >
                            {st.label}
                          </span>
                        </div>
                        <div className='mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs'>
                          <LinkComprovante id={p.comprovanteId} />
                          {p.status === 'rejeitado' && (
                            <span className='text-red-700'>
                              Baixa desfeita{p.motivoRejeicao ? `: ${p.motivoRejeicao}` : ''}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Filtros */}
            <div className='bg-white rounded-xl shadow-sm p-4 mb-6'>
              <div className='flex flex-col sm:flex-row items-start sm:items-center gap-3'>
                <span className='text-gray-600 font-medium text-sm'>Pedidos:</span>
                <div className='flex flex-wrap gap-2'>
                  {[
                    { value: 'todos', label: 'Todos' },
                    { value: 'pendente', label: '⏳ Pendentes' },
                    { value: 'pago', label: '✓ Pagos' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setFiltro(value)}
                      className={`px-4 py-2 rounded-lg transition text-sm ${
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
              <div className='bg-white rounded-xl shadow-sm p-12 text-center'>
                <div className='text-6xl mb-4'>📋</div>
                <h3 className='text-xl font-medium text-gray-900 mb-2'>
                  Nenhum pagamento encontrado
                </h3>
                <p className='text-gray-500'>
                  {filtro === 'todos'
                    ? 'Você ainda não tem pedidos com pagamentos.'
                    : `Não há pagamentos com status "${filtro}".`}
                </p>
              </div>
            ) : (
              <div className='space-y-4'>
                {pedidosFiltrados.map(pedido => {
                  const cf = pedido.controleFinanceiro || {};
                  const falta = royaltiesPendentesDe(pedido);
                  const abatido = Math.max(0, (pedido.royalties || 0) - falta);
                  const statusRoyalties =
                    falta <= 0 ? 'pago' : abatido > 0.004 ? 'parcial' : 'pendente';

                  return (
                    <div key={pedido._id} className='bg-white rounded-xl shadow-sm overflow-hidden'>
                      {/* Header do Pedido */}
                      <div className='bg-gray-50 px-5 py-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2'>
                        <div>
                          <h3 className='font-bold text-gray-900'>
                            Pedido #{pedido._id?.slice(-8).toUpperCase()}
                          </h3>
                          <p className='text-sm text-gray-500'>
                            {formatarData(pedido.createdAt)} •{' '}
                            {pedido.fornecedorId?.nome || 'Fornecedor'}
                          </p>
                        </div>
                        <div className='sm:text-right'>
                          <p className='text-sm text-gray-500'>Valor Total do Pedido</p>
                          <p className='text-xl font-bold text-gray-900'>
                            {formatarMoeda(pedido.total)}
                          </p>
                        </div>
                      </div>

                      {/* Detalhes de Pagamento */}
                      <div className='p-5'>
                        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                          {/* Royalties */}
                          <div
                            className={`p-4 rounded-lg border-2 ${
                              statusRoyalties === 'pago'
                                ? 'bg-green-50 border-green-200'
                                : statusRoyalties === 'parcial'
                                  ? 'bg-blue-50 border-blue-200'
                                  : 'bg-yellow-50 border-yellow-200'
                            }`}
                          >
                            <div className='flex items-center justify-between mb-2'>
                              <span className='text-sm font-medium text-gray-700'>
                                Royalties (5%)
                              </span>
                              {getStatusBadge(statusRoyalties)}
                            </div>
                            <p className='text-xl font-bold text-gray-900'>
                              {formatarMoeda(pedido.royalties)}
                            </p>
                            {statusRoyalties === 'parcial' && (
                              <p className='text-xs text-blue-800 mt-1'>
                                Pago {formatarMoeda(abatido)} · falta{' '}
                                <strong>{formatarMoeda(falta)}</strong>
                              </p>
                            )}
                            {statusRoyalties === 'pago' && cf.royalties?.dataPagamento && (
                              <p className='text-xs text-gray-500 mt-1'>
                                Pago em: {formatarData(cf.royalties.dataPagamento)}
                              </p>
                            )}
                          </div>

                          {/* Etiquetas */}
                          <div
                            className={`p-4 rounded-lg border-2 ${
                              (pedido.totalEtiquetas || 0) === 0
                                ? 'bg-gray-50 border-gray-200'
                                : cf.etiquetas?.status === 'pago'
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-yellow-50 border-yellow-200'
                            }`}
                          >
                            <div className='flex items-center justify-between mb-2'>
                              <span className='text-sm font-medium text-gray-700'>Etiquetas</span>
                              {(pedido.totalEtiquetas || 0) > 0 ? (
                                getStatusBadge(cf.etiquetas?.status)
                              ) : (
                                <span className='text-xs text-gray-400'>N/A</span>
                              )}
                            </div>
                            <p className='text-xl font-bold text-gray-900'>
                              {formatarMoeda(pedido.totalEtiquetas)}
                            </p>
                            {cf.etiquetas?.dataPagamento && (
                              <p className='text-xs text-gray-500 mt-1'>
                                Pago em: {formatarData(cf.etiquetas.dataPagamento)}
                              </p>
                            )}
                          </div>

                          {/* Embalagens */}
                          <div
                            className={`p-4 rounded-lg border-2 ${
                              (pedido.totalEmbalagens || 0) === 0
                                ? 'bg-gray-50 border-gray-200'
                                : cf.embalagens?.status === 'pago'
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-yellow-50 border-yellow-200'
                            }`}
                          >
                            <div className='flex items-center justify-between mb-2'>
                              <span className='text-sm font-medium text-gray-700'>Embalagens</span>
                              {(pedido.totalEmbalagens || 0) > 0 ? (
                                getStatusBadge(cf.embalagens?.status)
                              ) : (
                                <span className='text-xs text-gray-400'>N/A</span>
                              )}
                            </div>
                            <p className='text-xl font-bold text-gray-900'>
                              {formatarMoeda(pedido.totalEmbalagens)}
                            </p>
                            {cf.embalagens?.dataPagamento && (
                              <p className='text-xs text-gray-500 mt-1'>
                                Pago em: {formatarData(cf.embalagens.dataPagamento)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Resumo do Pedido */}
                        <div className='mt-4 pt-4 border-t'>
                          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                            <div>
                              <p className='text-gray-500'>Subtotal Produtos</p>
                              <p className='font-medium'>{formatarMoeda(pedido.subtotal)}</p>
                            </div>
                            <div>
                              <p className='text-gray-500'>+ Royalties</p>
                              <p className='font-medium'>{formatarMoeda(pedido.royalties)}</p>
                            </div>
                            <div>
                              <p className='text-gray-500'>+ Etiquetas</p>
                              <p className='font-medium'>{formatarMoeda(pedido.totalEtiquetas)}</p>
                            </div>
                            <div>
                              <p className='text-gray-500'>+ Embalagens</p>
                              <p className='font-medium'>
                                {formatarMoeda(pedido.totalEmbalagens)}
                              </p>
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
            <div className='mt-8 bg-blue-50 rounded-xl p-5 sm:p-6'>
              <h3 className='font-bold text-blue-900 mb-3'>ℹ️ Informações sobre Pagamentos</h3>
              <ul className='text-sm text-blue-800 space-y-2'>
                <li>
                  • <strong>Royalties (5%):</strong> taxa calculada sobre o valor dos produtos. Pode
                  pagar por Pix aqui, o total ou uma parte; o valor é abatido dos pedidos mais
                  antigos primeiro.
                </li>
                <li>
                  • <strong>Em conferência:</strong> a baixa é feita assim que envia o comprovante e
                  fica definitiva depois de o administrador conferir o Pix.
                </li>
                <li>
                  • <strong>Etiquetas e Embalagens:</strong> custos dos produtos, atualizados pelo
                  administrador após confirmação do pagamento.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {pagando && (
          <ModalPagarRoyalties
            emAberto={emAberto}
            onFechar={() => {
              gravarPixPendente(null);
              setPagando(false);
            }}
            onConcluido={mensagem => {
              gravarPixPendente(null);
              setPagando(false);
              setAviso(mensagem);
              carregarPagamentos();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </Layout>
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// MODAL: PAGAR ROYALTIES POR PIX
// Passo 1: escolher o valor (tudo ou outro valor)
// Passo 2: pagar (copia e cola / QR) e anexar o comprovante
// ══════════════════════════════════════════════════════════════
function ModalPagarRoyalties({ emAberto, onFechar, onConcluido }) {
  const [modo, setModo] = useState('total'); // total | parcial
  const [valorTexto, setValorTexto] = useState('');
  const [cobranca, setCobranca] = useState(() => lerPixPendente()?.cobranca || null);
  const [comprovante, setComprovante] = useState(() => lerPixPendente()?.comprovante || null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Mantém o Pix gerado (e o comprovante já anexado) enquanto não é registrado
  useEffect(() => {
    if (!cobranca) return gravarPixPendente(null);
    const anterior = lerPixPendente();
    gravarPixPendente({
      cobranca,
      comprovante,
      criadoEm: anterior?.cobranca?.txid === cobranca.txid ? anterior.criadoEm : Date.now(),
    });
  }, [cobranca, comprovante]);

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
      const r = await fetch('/api/user/pix-royalties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor: valorEscolhido }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message || 'Não foi possível gerar o Pix');
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
      const r = await fetch('/api/user/pagamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valor: cobranca.valor,
          txid: cobranca.txid,
          comprovanteId: comprovante.id,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message || 'Não foi possível registrar o pagamento');
      onConcluido(
        `${data.message} Valor: ${formatarMoeda(cobranca.valor)}. Em aberto agora: ${formatarMoeda(data.saldo)}.`,
      );
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
            <h2 className='text-base font-bold text-gray-900'>Pagar royalties por Pix</h2>
            <p className='text-xs text-gray-500 mt-0.5'>
              Em aberto: <strong>{formatarMoeda(emAberto)}</strong>
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
              <p className='text-sm font-semibold text-gray-800'>Quanto quer pagar?</p>

              <label
                className={`flex items-center gap-3 border-2 rounded-xl p-4 cursor-pointer transition ${
                  modo === 'total' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <input
                  type='radio'
                  name='modo'
                  checked={modo === 'total'}
                  onChange={() => setModo('total')}
                  className='h-4 w-4'
                />
                <div className='flex-1'>
                  <p className='text-sm font-semibold text-gray-900'>Quitar tudo</p>
                  <p className='text-xs text-gray-500'>Zera os royalties em aberto</p>
                </div>
                <span className='font-bold text-gray-900 tabular-nums'>
                  {formatarMoeda(emAberto)}
                </span>
              </label>

              <label
                className={`block border-2 rounded-xl p-4 cursor-pointer transition ${
                  modo === 'parcial' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className='flex items-center gap-3'>
                  <input
                    type='radio'
                    name='modo'
                    checked={modo === 'parcial'}
                    onChange={() => setModo('parcial')}
                    className='h-4 w-4'
                  />
                  <div className='flex-1'>
                    <p className='text-sm font-semibold text-gray-900'>Outro valor</p>
                    <p className='text-xs text-gray-500'>
                      Abate uma parte; o restante continua em aberto
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
                finalidade='royalties'
                rotuloValor='Royalties a pagar'
                comprovante={comprovante}
                onComprovante={setComprovante}
                desativado={carregando}
              />
              <p className='text-xs text-gray-500'>
                Ao confirmar, {formatarMoeda(cobranca.valor)} são abatidos dos seus royalties em
                aberto. O administrador confere o Pix a seguir.
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
                {carregando ? 'Registrando…' : 'Confirmar pagamento'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
