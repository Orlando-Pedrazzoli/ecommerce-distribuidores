// pages/admin.js - DASHBOARD ADMIN
// ===================================
// Visão geral do portal: KPIs do dia/mês, painel "Requer atenção",
// pedidos recentes, fornecedores e distribuidores. Tudo vem de
// /api/admin/dashboard numa única chamada; auto-refresh a cada 2 min.

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AdminShell from '../components/Admin/AdminShell';
import {
  Card,
  Kpi,
  Badge,
  BadgePedido,
  Botao,
  Carregando,
  LogoFornecedor,
  moeda,
  relativo,
  dataHora,
} from '../components/Admin/ui';

const REFRESH_MS = 2 * 60 * 1000;

export default function Admin() {
  const router = useRouter();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async silencioso => {
    if (!silencioso) setAtualizando(true);
    try {
      const r = await fetch('/api/admin/dashboard');
      if (!r.ok) throw new Error('Falha ao carregar a dashboard');
      setDados(await r.json());
      setErro('');
    } catch (e) {
      setErro(e.message);
    } finally {
      setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    const id = setInterval(() => carregar(true), REFRESH_MS);
    return () => clearInterval(id);
  }, [carregar]);

  const acoes = (
    <>
      <Botao
        variante='secundario'
        tamanho='sm'
        onClick={() => carregar()}
        loading={atualizando}
        className='hidden sm:inline-flex'
      >
        Atualizar
      </Botao>
      <Botao variante='azul' tamanho='sm' onClick={() => router.push('/admin-produtos')}>
        + Produto
      </Botao>
    </>
  );

  if (!dados) {
    return (
      <AdminShell titulo='Dashboard' subtitulo='Visão geral do portal' acoes={acoes}>
        {erro ? <p className='text-sm text-red-600'>{erro}</p> : <Carregando />}
      </AdminShell>
    );
  }

  const { pedidos, financeiro, recentes, fornecedores, produtos, distribuidores, convites } = dados;
  const pix = dados.pix || { sinaisAConferir: 0, pagamentosAConferir: 0, valorAConferir: 0 };

  // ── Requer atenção ──
  const alertas = [];
  if (pedidos.status.pendente > 0)
    alertas.push({
      tom: 'orange',
      titulo: `${pedidos.status.pendente} pedido(s) aguardando confirmação`,
      desc: 'Confirme para o fornecedor iniciar a produção.',
      href: '/admin-pedidos?status=pendente',
      cta: 'Ver pedidos',
    });
  if (fornecedores.semPix > 0)
    alertas.push({
      tom: 'red',
      titulo: `${fornecedores.semPix} fornecedor(es) sem chave Pix`,
      desc: 'Exigem sinal mas não têm chave: os distribuidores não conseguem enviar pedidos.',
      href: '/admin/fornecedores',
      cta: 'Configurar Pix',
    });
  if (pix.sinaisAConferir > 0)
    alertas.push({
      tom: 'orange',
      titulo: `${pix.sinaisAConferir} sinal(is) Pix a conferir`,
      desc: 'Pedidos enviados com comprovante do sinal. Confirme depois de o fornecedor ver o crédito.',
      href: '/admin-pedidos?sinal=em_analise',
      cta: 'Conferir sinais',
    });
  if (pix.pagamentosAConferir > 0)
    alertas.push({
      tom: 'orange',
      titulo: `${pix.pagamentosAConferir} Pix de royalties a conferir (${moeda(pix.valorAConferir)})`,
      desc: 'A baixa já foi feita. Confirme o crédito no seu extrato ou rejeite.',
      href: '/admin/financeiro',
      cta: 'Conferir pagamentos',
    });
  if (financeiro.totalAReceber > 0)
    alertas.push({
      tom: 'red',
      titulo: `${moeda(financeiro.totalAReceber)} a receber`,
      desc: `${financeiro.pedidosComPendencia} pedido(s) com royalties em aberto.`,
      href: '/admin/financeiro',
      cta: 'Controle financeiro',
    });
  if (distribuidores.semSenha > 0)
    alertas.push({
      tom: 'blue',
      titulo: `${distribuidores.semSenha} distribuidor(es) ainda sem senha`,
      desc: 'Convite enviado mas nunca concluído. Reenvie o convite.',
      href: '/admin/distribuidores?filtro=sem-senha',
      cta: 'Distribuidores',
    });
  if (distribuidores.bloqueados > 0)
    alertas.push({
      tom: 'red',
      titulo: `${distribuidores.bloqueados} conta(s) bloqueada(s) por tentativas`,
      desc: 'Desbloqueie se for um acesso legítimo.',
      href: '/admin/distribuidores',
      cta: 'Distribuidores',
    });
  if (convites.expirados > 0)
    alertas.push({
      tom: 'gray',
      titulo: `${convites.expirados} convite(s) de cadastro expirado(s)`,
      desc: 'O link deixou de funcionar. Reenvie ou cancele.',
      href: '/admin/distribuidores?aba=convites',
      cta: 'Convites',
    });
  if (fornecedores.semProdutos > 0)
    alertas.push({
      tom: 'orange',
      titulo: `${fornecedores.semProdutos} fornecedor(es) ativo(s) sem produtos`,
      desc: 'Aparecem no portal mas não têm nada para vender.',
      href: '/admin/fornecedores',
      cta: 'Fornecedores',
    });

  const variacaoMes =
    pedidos.mesAnterior.valor > 0
      ? ((pedidos.mes.valor - pedidos.mesAnterior.valor) / pedidos.mesAnterior.valor) * 100
      : null;

  return (
    <AdminShell
      titulo='Dashboard'
      subtitulo={`Visão geral · atualizado ${relativo(dados.geradoEm)}`}
      acoes={acoes}
    >
      {/* ── Faixa "Hoje" ── */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6'>
        <Kpi
          rotulo='Pedidos hoje'
          valor={pedidos.hoje.total}
          detalhe={moeda(pedidos.hoje.valor)}
          tom='info'
          onClick={() => router.push('/admin-pedidos')}
        />
        <Kpi
          rotulo='Pendentes'
          valor={pedidos.status.pendente}
          detalhe={pedidos.status.pendente > 0 ? 'aguardando confirmação' : 'tudo confirmado'}
          tom={pedidos.status.pendente > 0 ? 'alerta' : 'positivo'}
          onClick={() => router.push('/admin-pedidos?status=pendente')}
        />
        <Kpi
          rotulo='Faturado no mês'
          valor={moeda(pedidos.mes.valor)}
          detalhe={
            variacaoMes === null
              ? `${pedidos.mes.total} pedido(s)`
              : `${variacaoMes >= 0 ? '▲' : '▼'} ${Math.abs(variacaoMes).toFixed(0)}% vs. mês anterior`
          }
          tom={variacaoMes === null ? 'neutro' : variacaoMes >= 0 ? 'positivo' : 'perigo'}
        />
        <Kpi
          rotulo='A receber'
          valor={moeda(financeiro.totalAReceber)}
          detalhe='royalties em aberto'
          tom={financeiro.totalAReceber > 0 ? 'perigo' : 'positivo'}
          onClick={() => router.push('/admin/financeiro')}
        />
      </div>

      <div className='grid lg:grid-cols-3 gap-4 sm:gap-6'>
        {/* ── Coluna principal ── */}
        <div className='lg:col-span-2 space-y-4 sm:space-y-6'>
          {/* Requer atenção */}
          <Card
            titulo='Requer atenção'
            descricao={
              alertas.length === 0 ? 'Nada pendente. Bom trabalho.' : `${alertas.length} item(ns)`
            }
          >
            {alertas.length === 0 ? (
              <div className='flex items-center gap-3 text-sm text-emerald-700'>
                <span className='w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center'>
                  ✓
                </span>
                Sem pendências operacionais ou financeiras.
              </div>
            ) : (
              <ul className='divide-y divide-gray-100 -my-2'>
                {alertas.map((a, i) => (
                  <li key={i} className='py-3 flex items-center gap-3'>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        a.tom === 'red'
                          ? 'bg-red-500'
                          : a.tom === 'orange'
                            ? 'bg-amber-500'
                            : a.tom === 'blue'
                              ? 'bg-blue-500'
                              : 'bg-gray-400'
                      }`}
                    />
                    <div className='min-w-0 flex-1'>
                      <p className='text-sm font-medium text-gray-900'>{a.titulo}</p>
                      <p className='text-xs text-gray-500'>{a.desc}</p>
                    </div>
                    <Link
                      href={a.href}
                      className='text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap'
                    >
                      {a.cta} →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Pedidos recentes */}
          <Card
            titulo='Pedidos recentes'
            descricao='Últimos 8 pedidos de todos os distribuidores'
            acoes={
              <Link
                href='/admin-pedidos'
                className='text-xs font-semibold text-blue-600 hover:underline'
              >
                Ver todos →
              </Link>
            }
            semPadding
          >
            {recentes.length === 0 ? (
              <p className='p-5 text-sm text-gray-400'>Ainda não há pedidos.</p>
            ) : (
              <ul className='divide-y divide-gray-100'>
                {recentes.map(p => (
                  <li
                    key={p._id}
                    className='px-5 py-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer'
                    onClick={() => router.push('/admin-pedidos')}
                  >
                    <LogoFornecedor fornecedor={p.fornecedor} tamanho={36} />
                    <div className='min-w-0 flex-1'>
                      <p className='text-sm font-medium text-gray-900 truncate'>
                        <span className='font-mono text-xs text-gray-500 mr-2'>#{p.numero}</span>
                        {p.userId}
                      </p>
                      <p className='text-xs text-gray-500 truncate'>
                        {p.fornecedor?.nome || 'Fornecedor'} · {p.itens} item(ns) ·{' '}
                        {relativo(p.createdAt)}
                      </p>
                    </div>
                    <div className='text-right shrink-0'>
                      <p className='text-sm font-bold text-gray-900 tabular-nums'>
                        {moeda(p.total)}
                      </p>
                      <BadgePedido status={p.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Por fornecedor */}
          <Card
            titulo='Fornecedores'
            descricao='Pedidos e volume dos últimos 30 dias'
            acoes={
              <Link
                href='/admin/fornecedores'
                className='text-xs font-semibold text-blue-600 hover:underline'
              >
                Gerir →
              </Link>
            }
          >
            {fornecedores.lista.length === 0 ? (
              <div className='text-sm text-gray-500'>
                Nenhum fornecedor.{' '}
                <Link href='/admin/fornecedores?novo=1' className='text-blue-600 hover:underline'>
                  Criar o primeiro
                </Link>
              </div>
            ) : (
              <div className='grid sm:grid-cols-2 gap-3'>
                {fornecedores.lista.map(f => (
                  <div
                    key={f._id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${f.ativo ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-60'}`}
                  >
                    <LogoFornecedor fornecedor={f} tamanho={40} />
                    <div className='min-w-0 flex-1'>
                      <p className='text-sm font-semibold text-gray-900 truncate'>
                        {f.nome}{' '}
                        <span className='font-mono text-[10px] text-gray-400'>{f.codigo}</span>
                      </p>
                      <p className='text-xs text-gray-500'>
                        {f.pedidos30d} pedido(s) · {moeda(f.valor30d)}
                        {f.pendentes > 0 && (
                          <span className='text-amber-600 font-medium'> · {f.pendentes} pend.</span>
                        )}
                      </p>
                    </div>
                    <div className='text-right shrink-0'>
                      {!f.ativo ? (
                        <Badge cor='gray'>Inativo</Badge>
                      ) : f.produtosAtivos === 0 ? (
                        <Badge cor='orange'>Sem produtos</Badge>
                      ) : (
                        <span className='text-xs text-gray-500'>{f.produtosAtivos} prod.</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── Coluna lateral ── */}
        <div className='space-y-4 sm:space-y-6'>
          {/* Atividade 14 dias */}
          <Card
            titulo='Pedidos · 14 dias'
            descricao={`${pedidos.serie14.reduce((s, d) => s + d.total, 0)} pedidos no período`}
          >
            <MiniBarras serie={pedidos.serie14} />
          </Card>

          {/* Status dos pedidos */}
          <Card
            titulo='Pedidos por status'
            descricao={`${pedidos.total} no total · ${moeda(pedidos.valorTotal)}`}
          >
            <BarraStatus status={pedidos.status} total={pedidos.total} />
            <ul className='mt-4 space-y-2 text-sm'>
              {[
                ['pendente', 'Pendentes', 'bg-amber-400'],
                ['confirmado', 'Confirmados', 'bg-emerald-500'],
              ].map(([k, label, cor]) => (
                <li key={k} className='flex items-center justify-between'>
                  <span className='flex items-center gap-2 text-gray-600'>
                    <span className={`w-2.5 h-2.5 rounded-sm ${cor}`} />
                    {label}
                  </span>
                  <span className='font-semibold text-gray-900 tabular-nums'>
                    {pedidos.status[k] || 0}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Distribuidores */}
          <Card
            titulo='Distribuidores'
            acoes={
              <Link
                href='/admin/distribuidores?aba=convites&novo=1'
                className='text-xs font-semibold text-blue-600 hover:underline'
              >
                Convidar →
              </Link>
            }
          >
            <div className='grid grid-cols-2 gap-3 text-center'>
              <Stat rotulo='Ativos' valor={distribuidores.ativos} />
              <Stat rotulo='Novos (30 d)' valor={distribuidores.novos30d} tom='text-emerald-600' />
              <Stat
                rotulo='Convites pendentes'
                valor={convites.pendentes}
                tom={convites.pendentes > 0 ? 'text-blue-600' : ''}
              />
              <Stat
                rotulo='Sem senha'
                valor={distribuidores.semSenha}
                tom={distribuidores.semSenha > 0 ? 'text-amber-600' : ''}
              />
            </div>
            {convites.aceites7d > 0 && (
              <p className='mt-3 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2'>
                🎉 {convites.aceites7d} convite(s) aceite(s) nos últimos 7 dias
              </p>
            )}
          </Card>

          {/* A receber detalhado */}
          <Card titulo='A receber' descricao='Royalties em aberto'>
            <ul className='space-y-2 text-sm'>
              <Linha rotulo='Royalties (5%)' valor={financeiro.royalties} />
              <li className='flex justify-between pt-2 border-t border-gray-100 font-bold text-gray-900'>
                <span>Total</span>
                <span className='tabular-nums'>{moeda(financeiro.totalAReceber)}</span>
              </li>
            </ul>
            <Botao
              variante='secundario'
              tamanho='sm'
              className='w-full mt-4'
              onClick={() => router.push('/admin/financeiro')}
            >
              Abrir controle financeiro
            </Botao>
          </Card>

          {/* Catálogo */}
          <Card titulo='Catálogo'>
            <div className='grid grid-cols-2 gap-3 text-center'>
              <Stat rotulo='Produtos ativos' valor={produtos.ativos} />
              <Stat rotulo='Fornecedores ativos' valor={fornecedores.ativos} />
            </div>
            <div className='flex gap-2 mt-4'>
              <Botao
                variante='secundario'
                tamanho='sm'
                className='flex-1'
                onClick={() => router.push('/admin-produtos')}
              >
                Produtos
              </Botao>
              <Botao
                variante='secundario'
                tamanho='sm'
                className='flex-1'
                onClick={() => router.push('/admin/fornecedores')}
              >
                Fornecedores
              </Botao>
            </div>
          </Card>

          <p className='text-[11px] text-gray-400 text-center'>
            Dados de {dataHora(dados.geradoEm)} · atualiza automaticamente
          </p>
        </div>
      </div>
    </AdminShell>
  );
}

// ══════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ══════════════════════════════════════════════════════════════
const Stat = ({ rotulo, valor, tom = '' }) => (
  <div className='bg-gray-50 rounded-lg py-3'>
    <p className={`text-xl font-bold tabular-nums ${tom || 'text-gray-900'}`}>{valor}</p>
    <p className='text-[11px] uppercase tracking-wide text-gray-500'>{rotulo}</p>
  </div>
);

const Linha = ({ rotulo, valor }) => (
  <li className='flex justify-between'>
    <span className='text-gray-600'>{rotulo}</span>
    <span className={`tabular-nums font-medium ${valor > 0 ? 'text-red-600' : 'text-gray-400'}`}>
      {moeda(valor)}
    </span>
  </li>
);

const BarraStatus = ({ status, total }) => {
  if (!total) return <div className='h-2.5 rounded-full bg-gray-100' />;
  const seg = [
    ['pendente', 'bg-amber-400'],
    ['confirmado', 'bg-emerald-500'],
  ];
  return (
    <div className='h-2.5 rounded-full bg-gray-100 overflow-hidden flex'>
      {seg.map(([k, cor]) => (
        <div
          key={k}
          className={cor}
          style={{ width: `${((status[k] || 0) / total) * 100}%` }}
          title={`${k}: ${status[k] || 0}`}
        />
      ))}
    </div>
  );
};

const MiniBarras = ({ serie }) => {
  const max = Math.max(1, ...serie.map(d => d.total));
  return (
    <div>
      <div className='flex items-end gap-1 h-24'>
        {serie.map(d => {
          const dia = new Date(d.dia + 'T12:00:00');
          const ehHoje = d === serie[serie.length - 1];
          return (
            <div
              key={d.dia}
              className='flex-1 flex flex-col items-center justify-end h-full group'
              title={`${dia.toLocaleDateString('pt-BR')}: ${d.total} pedido(s) · ${moeda(d.valor)}`}
            >
              <span className='text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition mb-0.5'>
                {d.total}
              </span>
              <div
                className={`w-full rounded-t ${ehHoje ? 'bg-blue-600' : d.total > 0 ? 'bg-blue-300' : 'bg-gray-100'}`}
                style={{ height: `${Math.max(4, (d.total / max) * 100)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className='flex justify-between text-[10px] text-gray-400 mt-1'>
        <span>
          {new Date(serie[0].dia + 'T12:00:00').toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
          })}
        </span>
        <span>hoje</span>
      </div>
    </div>
  );
};
