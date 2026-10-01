// pages/dashboard.js - PAINEL PRINCIPAL DO DISTRIBUIDOR (MOBILE-FIRST)
// ===================================
// O distribuidor faz pedidos sobretudo pelo telemóvel: fornecedores em
// destaque com alvos grandes, atenção a pagamentos/entregas, pedidos
// recentes e resumo. Tudo vem de /api/user/dashboard numa chamada.

import Layout from '../components/Layout';
import Link from 'next/link';
import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

const moeda = v =>
  `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const relativo = d => {
  if (!d) return '—';
  const min = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.round(h / 24);
  if (dias < 30) return `há ${dias} d`;
  return new Date(d).toLocaleDateString('pt-BR');
};

const STATUS = {
  pendente: { label: 'Pendente', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  confirmado: { label: 'Confirmado', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
};

const saudacao = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 19) return 'Boa tarde';
  return 'Boa noite';
};

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      const me = await fetch('/api/auth/me');
      if (!me.ok) return router.replace('/');
      const { user: u } = await me.json();
      if (u?.tipo === 'admin') return router.replace('/admin');
      setUser(u);

      const r = await fetch('/api/user/dashboard');
      if (!r.ok) throw new Error('Não foi possível carregar os seus dados');
      setDados(await r.json());
    } catch (e) {
      setErro(e.message);
    }
  }, [router]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const primeiroNome = (user?.nome || '').split(' ')[0];

  return (
    <>
      <Head>
        <title>Início - Elite Surfing Portal</title>
        <meta
          name='description'
          content='Painel do distribuidor: fornecedores, pedidos e pagamentos'
        />
      </Head>

      <Layout>
        <div className='max-w-6xl mx-auto px-4 py-4 sm:py-6'>
          {/* ── Cabeçalho ── */}
          <header className='mb-4 sm:mb-6'>
            <p className='text-sm text-gray-500'>{saudacao()},</p>
            <h1 className='text-2xl sm:text-3xl font-bold text-gray-900 leading-tight'>
              {primeiroNome || 'distribuidor'}
            </h1>
          </header>

          {erro && (
            <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4'>
              {erro}{' '}
              <button onClick={carregar} className='underline font-medium'>
                Tentar novamente
              </button>
            </div>
          )}

          {!dados && !erro ? (
            <Esqueleto />
          ) : dados ? (
            <>
              {/* ── Requer atenção ── */}
              <Atencao dados={dados} />

              {/* ── Fornecedores (o principal: fazer pedido) ── */}
              <section className='mb-6'>
                <div className='flex items-end justify-between mb-3'>
                  <div>
                    <h2 className='text-lg font-bold text-gray-900'>Fazer pedido</h2>
                    <p className='text-xs text-gray-500'>
                      Escolha o fornecedor para ver o catálogo
                    </p>
                  </div>
                  <span className='text-xs text-gray-400'>
                    {dados.fornecedores.length} fornecedor(es)
                  </span>
                </div>

                {dados.fornecedores.length === 0 ? (
                  <div className='bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500'>
                    Nenhum fornecedor disponível no momento.
                  </div>
                ) : (
                  <div className='flex flex-wrap justify-center gap-3 sm:gap-4'>
                    {dados.fornecedores.map(f => (
                      <CartaoFornecedor key={f._id} f={f} />
                    ))}
                  </div>
                )}
              </section>

              <div className='grid lg:grid-cols-3 gap-4 sm:gap-6'>
                {/* ── Pedidos recentes ── */}
                <section className='lg:col-span-2 self-start bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden'>
                  <div className='flex items-center justify-between px-4 py-3 border-b border-gray-100'>
                    <h2 className='text-sm font-bold text-gray-900'>Pedidos recentes</h2>
                    <Link href='/meus-pedidos' className='text-xs font-semibold text-blue-600'>
                      Ver todos →
                    </Link>
                  </div>
                  {dados.recentes.length === 0 ? (
                    <div className='p-8 text-center'>
                      <p className='text-sm font-medium text-gray-700'>
                        Ainda não fez nenhum pedido
                      </p>
                      <p className='text-xs text-gray-500 mt-1'>
                        Escolha um fornecedor acima para começar.
                      </p>
                    </div>
                  ) : (
                    <ul className='divide-y divide-gray-100'>
                      {dados.recentes.map(p => (
                        <li key={p._id}>
                          <Link
                            href='/meus-pedidos'
                            className='flex items-center gap-3 px-4 py-3 active:bg-gray-50 hover:bg-gray-50'
                          >
                            <Avatar fornecedor={p.fornecedor} tamanho={40} />
                            <div className='min-w-0 flex-1'>
                              <p className='text-sm font-semibold text-gray-900 truncate'>
                                {p.fornecedor?.nome || 'Fornecedor'}
                              </p>
                              <p className='text-xs text-gray-500 truncate'>
                                #{p.numero} · {p.itens} item(ns) · {relativo(p.createdAt)}
                              </p>
                            </div>
                            <div className='text-right shrink-0'>
                              <p className='text-sm font-bold text-gray-900 tabular-nums'>
                                {moeda(p.total)}
                              </p>
                              <BadgeStatus status={p.status} />
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* ── Resumo ── */}
                <aside className='space-y-4'>
                  <section className='bg-white rounded-2xl border border-gray-200 shadow-sm p-4'>
                    <h2 className='text-sm font-bold text-gray-900 mb-3'>Este mês</h2>
                    <div className='grid grid-cols-2 gap-3'>
                      <Stat rotulo='Pedidos' valor={dados.pedidos.mes.total} />
                      <Stat rotulo='Total' valor={moeda(dados.pedidos.mes.valor)} pequeno />
                    </div>
                    <div className='mt-4 pt-3 border-t border-gray-100 space-y-2 text-sm'>
                      <Linha
                        rotulo='Pendentes'
                        valor={dados.pedidos.status.pendente}
                        tom='text-amber-600'
                      />
                      <Linha
                        rotulo='Confirmados'
                        valor={dados.pedidos.status.confirmado}
                        tom='text-emerald-600'
                      />
                      <Linha rotulo='Total de pedidos' valor={dados.pedidos.total} />
                    </div>
                  </section>

                  <section
                    className={`rounded-2xl border shadow-sm p-4 ${
                      dados.financeiro.totalPendente > 0
                        ? 'bg-red-50 border-red-200'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className='flex items-center justify-between mb-2'>
                      <h2 className='text-sm font-bold text-gray-900'>Pagamentos</h2>
                      <Link href='/pagamentos' className='text-xs font-semibold text-blue-600'>
                        Detalhes →
                      </Link>
                    </div>
                    {dados.financeiro.totalPendente > 0 ? (
                      <>
                        <p className='text-2xl font-bold text-red-600 tabular-nums'>
                          {moeda(dados.financeiro.totalPendente)}
                        </p>
                        <p className='text-xs text-red-700 mt-0.5'>
                          em aberto em {dados.financeiro.pedidosComPendencia} pedido(s)
                        </p>
                        <ul className='mt-3 space-y-1 text-xs text-gray-700'>
                          <Linha
                            rotulo='Royalties'
                            valor={moeda(dados.financeiro.royaltiesPendentes)}
                          />
                        </ul>
                      </>
                    ) : (
                      <p className='text-sm text-emerald-700 flex items-center gap-2'>
                        <span className='w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs'>
                          ✓
                        </span>
                        Sem pagamentos pendentes
                      </p>
                    )}
                  </section>

                  <section className='bg-white rounded-2xl border border-gray-200 shadow-sm p-4'>
                    <h2 className='text-sm font-bold text-gray-900 mb-3'>Atalhos</h2>
                    <div className='grid grid-cols-2 gap-2'>
                      <Atalho href='/meus-pedidos' rotulo='Meus pedidos' />
                      <Atalho href='/tabela-precos' rotulo='Tabela de preços' />
                      <Atalho href='/pagamentos' rotulo='Pagamentos' />
                      <Atalho href='/alterar-senha' rotulo='Alterar senha' />
                    </div>
                  </section>
                </aside>
              </div>

              {/* ── Como funciona (compacto) ── */}
              <details className='mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm group'>
                <summary className='px-4 py-3 text-sm font-semibold text-gray-800 cursor-pointer select-none flex items-center justify-between'>
                  Como funciona
                  <span className='text-gray-400 group-open:rotate-180 transition'>▾</span>
                </summary>
                <ol className='px-4 pb-4 space-y-2 text-sm text-gray-600'>
                  <li className='flex gap-3'>
                    <Num n={1} /> Escolha o fornecedor e navegue pelo catálogo por categoria.
                  </li>
                  <li className='flex gap-3'>
                    <Num n={2} /> Adicione ao carrinho e finalize o pedido com o endereço de
                    entrega.
                  </li>
                  <li className='flex gap-3'>
                    <Num n={3} /> O fornecedor recebe o pedido por email; acompanhe o estado em
                    "Pedidos".
                  </li>
                </ol>
              </details>

              <p className='mt-6 text-center text-xs text-gray-400'>
                Dúvidas? Fale connosco pelo WhatsApp (botão no canto).
              </p>
            </>
          ) : null}
        </div>
      </Layout>
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ══════════════════════════════════════════════════════════════
function Atencao({ dados }) {
  const itens = [];
  if (dados.financeiro.totalPendente > 0) {
    itens.push({
      cor: 'bg-red-500',
      titulo: `${moeda(dados.financeiro.totalPendente)} em royalties a pagar`,
      desc: `${dados.financeiro.pedidosComPendencia} pedido(s) com royalties em aberto · pague por Pix`,
      href: '/pagamentos',
    });
  }
  if (dados.pedidos.status.pendente > 0) {
    itens.push({
      cor: 'bg-amber-500',
      titulo: `${dados.pedidos.status.pendente} pedido(s) aguardando confirmação do fornecedor`,
      desc: 'Normalmente confirmado em 1-2 dias úteis',
      href: '/meus-pedidos?status=pendente',
    });
  }
  if (itens.length === 0) return null;
  return (
    <section className='mb-5 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden'>
      <ul className='divide-y divide-gray-100'>
        {itens.map((a, i) => (
          <li key={i}>
            <Link
              href={a.href}
              className='flex items-center gap-3 px-4 py-3 active:bg-gray-50 hover:bg-gray-50'
            >
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${a.cor}`} />
              <div className='min-w-0 flex-1'>
                <p className='text-sm font-semibold text-gray-900'>{a.titulo}</p>
                <p className='text-xs text-gray-500'>{a.desc}</p>
              </div>
              <span className='text-gray-300'>›</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CartaoFornecedor({ f }) {
  const cor = f.cor || '#374151';
  return (
    <Link
      href={`/produtos/${f.codigo}`}
      className='group block w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)] max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden active:scale-[0.99] transition hover:shadow-md'
    >
      {/* Mobile: linha horizontal; desktop: cartão vertical */}
      <div className='flex sm:flex-col items-center sm:items-stretch'>
        <div
          className='w-24 sm:w-auto self-stretch sm:h-28 flex items-center justify-center shrink-0'
          style={{ background: `linear-gradient(135deg, ${cor}, ${cor}cc)` }}
        >
          <div className='bg-white rounded-full p-1 shadow'>
            <Avatar fornecedor={f} tamanho={52} />
          </div>
        </div>
        <div className='flex-1 min-w-0 p-3 sm:p-4 flex items-center sm:block gap-3'>
          <div className='min-w-0 flex-1'>
            <p className='font-bold text-gray-900 truncate'>{f.nome}</p>
            <p className='text-xs text-gray-500 truncate'>
              {f.especialidade || f.descricao || 'Ver catálogo'}
            </p>
            <p className='text-[11px] text-gray-400 mt-1'>
              {f.totalProdutos} produto(s)
              {f.meusPedidos > 0 && ` · ${f.meusPedidos} pedido(s) seus`}
              {f.prazoEntregaDias ? ` · ${f.prazoEntregaDias} d` : ''}
            </p>
          </div>
          <span
            className='shrink-0 sm:mt-3 sm:w-full inline-flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-white'
            style={{ background: cor }}
          >
            Pedir
            <svg
              className='w-4 h-4 group-hover:translate-x-0.5 transition'
              fill='none'
              stroke='currentColor'
              strokeWidth={2}
              viewBox='0 0 24 24'
            >
              <path strokeLinecap='round' strokeLinejoin='round' d='M9 5l7 7-7 7' />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

function Avatar({ fornecedor, tamanho }) {
  const cor = fornecedor?.cor || '#374151';
  const iniciais = (fornecedor?.nome || '?')
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();
  return fornecedor?.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={fornecedor.logo}
      alt={fornecedor.nome}
      className='rounded-full object-cover bg-white shrink-0'
      style={{ width: tamanho, height: tamanho }}
    />
  ) : (
    <div
      className='rounded-full flex items-center justify-center text-white font-bold shrink-0'
      style={{ width: tamanho, height: tamanho, background: cor, fontSize: tamanho * 0.36 }}
    >
      {iniciais}
    </div>
  );
}

const BadgeStatus = ({ status }) => {
  const s = STATUS[status] || { label: status, cls: 'bg-gray-100 text-gray-700 ring-gray-200' };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ${s.cls}`}
    >
      {s.label}
    </span>
  );
};

const Stat = ({ rotulo, valor, pequeno }) => (
  <div className='bg-gray-50 rounded-xl p-3'>
    <p className={`font-bold text-gray-900 tabular-nums ${pequeno ? 'text-base' : 'text-2xl'}`}>
      {valor}
    </p>
    <p className='text-[11px] uppercase tracking-wide text-gray-500'>{rotulo}</p>
  </div>
);

const Linha = ({ rotulo, valor, tom = 'text-gray-900' }) => (
  <li className='flex justify-between list-none'>
    <span className='text-gray-600'>{rotulo}</span>
    <span className={`font-semibold tabular-nums ${tom}`}>{valor}</span>
  </li>
);

const Atalho = ({ href, rotulo }) => (
  <Link
    href={href}
    className='px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 text-center active:bg-gray-100 hover:bg-gray-50'
  >
    {rotulo}
  </Link>
);

const Num = ({ n }) => (
  <span className='w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shrink-0'>
    {n}
  </span>
);

function Esqueleto() {
  return (
    <div className='animate-pulse space-y-4'>
      <div className='h-16 bg-white rounded-2xl border border-gray-200' />
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className='h-24 sm:h-52 bg-white rounded-2xl border border-gray-200' />
        ))}
      </div>
      <div className='h-48 bg-white rounded-2xl border border-gray-200' />
    </div>
  );
}
