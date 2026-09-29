// pages/admin/distribuidores.js - DISTRIBUIDORES E CONVITES (ADMIN)
// ===================================
// Aba "Contas": criar, editar, ativar/desativar, reenviar convite, resetar
//   senha, desbloquear e revogar dispositivos confiáveis.
// Aba "Convites": enviar convite por email para o distribuidor criar a
//   própria conta em /cadastro/[token]; reenviar e cancelar.
//
// Query params: ?aba=convites  ?novo=1  ?filtro=sem-senha

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import AdminShell from '../../components/Admin/AdminShell';
import {
  Card,
  Kpi,
  Badge,
  Botao,
  Campo,
  Input,
  Select,
  Textarea,
  Alerta,
  Modal,
  Tabela,
  Carregando,
  MenuAcoes,
  ItemMenu,
  dataHora,
  relativo,
  emPrazo,
} from '../../components/Admin/ui';
import { useToastContext } from '../_app';

const FORM_VAZIO = {
  usuario: '',
  nome: '',
  email: '',
  telefone: '',
  endereco: { rua: '', numero: '', complemento: '', bairro: '', cidade: '', cep: '', estado: '' },
};

const CONVITE_VAZIO = { email: '', nome: '', mensagem: '' };

export default function AdminDistribuidores() {
  const router = useRouter();
  const toast = useToastContext();

  const [aba, setAba] = useState('contas'); // contas | convites
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState({ distribuidores: [], total: 0, ativos: 0, semSenha: 0 });
  const [convites, setConvites] = useState({
    convites: [],
    total: 0,
    pendentes: 0,
    aceites: 0,
    expirados: 0,
  });

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroConvite, setFiltroConvite] = useState('pendente');

  const [modal, setModal] = useState(null); // { modo: 'criar' | 'editar' | 'convidar', dados }
  const [form, setForm] = useState(FORM_VAZIO);
  const [formConvite, setFormConvite] = useState(CONVITE_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [acaoEmCurso, setAcaoEmCurso] = useState(null);
  const [menuAberto, setMenuAberto] = useState(null);

  const notificar = (tipo, msg) => {
    if (toast?.[tipo]) toast[tipo](msg);
    else if (tipo === 'error') alert(msg);
  };

  // ── Carregar ──
  const carregar = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/admin/distribuidores?tipo=todos'),
        fetch('/api/admin/convites'),
      ]);
      if (!r1.ok || !r2.ok) throw new Error();
      setDados(await r1.json());
      setConvites(await r2.json());
    } catch {
      notificar('error', 'Erro ao carregar distribuidores');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Query params de entrada (vindos da dashboard)
  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.aba === 'convites') setAba('convites');
    if (router.query.filtro) setFiltroStatus(String(router.query.filtro));
    if (router.query.novo === '1') abrirConvidar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  useEffect(() => {
    const fechar = () => setMenuAberto(null);
    document.addEventListener('click', fechar);
    return () => document.removeEventListener('click', fechar);
  }, []);

  // ── Filtros ──
  const lista = dados.distribuidores.filter(u => {
    if (filtroStatus === 'ativos' && !u.ativo) return false;
    if (filtroStatus === 'inativos' && u.ativo) return false;
    if (filtroStatus === 'sem-senha' && u.senhaDefinida) return false;
    if (filtroStatus === 'bloqueados' && !u.bloqueado) return false;
    if (busca) {
      const b = busca.toLowerCase();
      return (
        u.usuario.toLowerCase().includes(b) ||
        u.nome.toLowerCase().includes(b) ||
        (u.email || '').toLowerCase().includes(b)
      );
    }
    return true;
  });

  const listaConvites = convites.convites.filter(c => {
    if (filtroConvite !== 'todos' && c.status !== filtroConvite) return false;
    if (busca) {
      const b = busca.toLowerCase();
      return c.email.toLowerCase().includes(b) || (c.nome || '').toLowerCase().includes(b);
    }
    return true;
  });

  // ── Modais ──
  const abrirCriar = () => {
    setForm(FORM_VAZIO);
    setErroForm('');
    setModal({ modo: 'criar' });
  };
  const abrirEditar = u => {
    setForm({
      usuario: u.usuario,
      nome: u.nome,
      email: u.email || '',
      telefone: u.telefone || '',
      endereco: { ...FORM_VAZIO.endereco, ...(u.endereco || {}) },
    });
    setErroForm('');
    setModal({ modo: 'editar', dados: u });
  };
  const abrirConvidar = () => {
    setFormConvite(CONVITE_VAZIO);
    setErroForm('');
    setAba('convites');
    setModal({ modo: 'convidar' });
  };

  const salvar = async e => {
    e.preventDefault();
    setSalvando(true);
    setErroForm('');
    try {
      let url;
      let body;
      let method;
      if (modal.modo === 'convidar') {
        url = '/api/admin/convites';
        method = 'POST';
        body = formConvite;
      } else if (modal.modo === 'criar') {
        url = '/api/admin/distribuidores';
        method = 'POST';
        body = form;
      } else {
        url = `/api/admin/distribuidores/${modal.dados._id}`;
        method = 'PUT';
        body = {
          nome: form.nome,
          email: form.email,
          telefone: form.telefone,
          endereco: form.endereco,
        };
      }
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) {
        setErroForm(data.message || 'Erro ao salvar');
        return;
      }
      const falhou = data.conviteEnviado === false || data.enviado === false;
      notificar(falhou ? 'warning' : 'success', data.message);
      setModal(null);
      carregar();
    } catch {
      setErroForm('Erro de conexão');
    } finally {
      setSalvando(false);
    }
  };

  // ── Ações ──
  const executarAcao = async (u, acao, confirmacao) => {
    if (confirmacao && !confirm(confirmacao)) return;
    setMenuAberto(null);
    setAcaoEmCurso(`${u._id}:${acao}`);
    try {
      const r = await fetch(`/api/admin/distribuidores/${u._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Erro');
      notificar('success', data.message);
      carregar();
    } catch (error) {
      notificar('error', error.message);
    } finally {
      setAcaoEmCurso(null);
    }
  };

  const acaoConvite = async (c, metodo, confirmacao) => {
    if (confirmacao && !confirm(confirmacao)) return;
    setAcaoEmCurso(`${c._id}:${metodo}`);
    try {
      const r = await fetch(`/api/admin/convites/${c._id}`, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: metodo === 'PATCH' ? JSON.stringify({ acao: 'reenviar' }) : undefined,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Erro');
      notificar('success', data.message);
      carregar();
    } catch (error) {
      notificar('error', error.message);
    } finally {
      setAcaoEmCurso(null);
    }
  };

  // ── Render ──
  return (
    <AdminShell
      titulo='Distribuidores'
      subtitulo='Contas de acesso, convites de cadastro e segurança'
      acoes={
        <>
          <Botao
            variante='secundario'
            tamanho='sm'
            onClick={abrirCriar}
            className='hidden sm:inline-flex'
          >
            + Criar conta
          </Botao>
          <Botao variante='azul' tamanho='sm' onClick={abrirConvidar}>
            ✉ Convidar distribuidor
          </Botao>
        </>
      }
    >
      {loading ? (
        <Carregando />
      ) : (
        <>
          {/* KPIs */}
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6'>
            <Kpi
              rotulo='Contas'
              valor={dados.total}
              detalhe={`${dados.ativos} ativas`}
              onClick={() => setAba('contas')}
            />
            <Kpi
              rotulo='Sem senha definida'
              valor={dados.semSenha}
              tom={dados.semSenha > 0 ? 'alerta' : 'positivo'}
              detalhe='convite nunca concluído'
              onClick={() => {
                setAba('contas');
                setFiltroStatus('sem-senha');
              }}
            />
            <Kpi
              rotulo='Convites pendentes'
              valor={convites.pendentes}
              tom={convites.pendentes > 0 ? 'info' : 'neutro'}
              detalhe={`${convites.aceites} aceite(s) no total`}
              onClick={() => {
                setAba('convites');
                setFiltroConvite('pendente');
              }}
            />
            <Kpi
              rotulo='Convites expirados'
              valor={convites.expirados}
              tom={convites.expirados > 0 ? 'perigo' : 'neutro'}
              onClick={() => {
                setAba('convites');
                setFiltroConvite('expirado');
              }}
            />
          </div>

          {/* Abas + filtros */}
          <div className='flex flex-col md:flex-row md:items-center gap-3 mb-4'>
            <div className='inline-flex rounded-lg border border-gray-200 bg-white p-1 self-start'>
              {[
                ['contas', `Contas (${dados.total})`],
                ['convites', `Convites (${convites.pendentes})`],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setAba(id)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${aba === id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Input
              type='search'
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder={
                aba === 'contas'
                  ? 'Buscar por usuário, nome ou email…'
                  : 'Buscar por email ou nome…'
              }
              className='md:max-w-sm'
            />
            {aba === 'contas' ? (
              <Select
                value={filtroStatus}
                onChange={e => setFiltroStatus(e.target.value)}
                className='md:w-48'
              >
                <option value='todos'>Todos</option>
                <option value='ativos'>Ativos</option>
                <option value='inativos'>Inativos</option>
                <option value='sem-senha'>Sem senha definida</option>
                <option value='bloqueados'>Bloqueados</option>
              </Select>
            ) : (
              <Select
                value={filtroConvite}
                onChange={e => setFiltroConvite(e.target.value)}
                className='md:w-48'
              >
                <option value='pendente'>Pendentes</option>
                <option value='expirado'>Expirados</option>
                <option value='aceite'>Aceites</option>
                <option value='cancelado'>Cancelados</option>
                <option value='todos'>Todos</option>
              </Select>
            )}
          </div>

          {/* ═══════ ABA CONTAS ═══════ */}
          {aba === 'contas' && (
            <Card semPadding>
              <Tabela
                colunas={[
                  { label: 'Usuário' },
                  { label: 'Nome / Email' },
                  { label: 'Status' },
                  { label: 'Último login' },
                  { label: 'Disp.', alinhar: 'center' },
                  { label: 'Ações', alinhar: 'right' },
                ]}
                vazio={lista.length === 0 && 'Nenhum distribuidor encontrado'}
              >
                {lista.map(u => {
                  const ocupado = acaoEmCurso?.startsWith(u._id);
                  return (
                    <tr
                      key={u._id}
                      className={!u.ativo ? 'bg-gray-50 text-gray-400' : 'hover:bg-gray-50'}
                    >
                      <td className='px-4 py-3 font-mono font-medium whitespace-nowrap'>
                        {u.usuario}
                        {u.tipo === 'admin' && (
                          <Badge cor='red' className='ml-2'>
                            admin
                          </Badge>
                        )}
                      </td>
                      <td className='px-4 py-3'>
                        <div className='font-medium text-gray-800'>{u.nome}</div>
                        <div className='text-xs text-gray-500'>
                          {u.email || <span className='text-red-500'>sem email</span>}
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex flex-wrap gap-1'>
                          {u.ativo ? (
                            <Badge cor='green'>Ativo</Badge>
                          ) : (
                            <Badge cor='gray'>Inativo</Badge>
                          )}
                          {!u.senhaDefinida && <Badge cor='orange'>Sem senha</Badge>}
                          {u.bloqueado && <Badge cor='red'>Bloqueado</Badge>}
                        </div>
                      </td>
                      <td className='px-4 py-3 text-gray-600 whitespace-nowrap text-xs'>
                        {dataHora(u.ultimoLogin)}
                      </td>
                      <td
                        className='px-4 py-3 text-center'
                        title='Dispositivos confiáveis (sem OTP)'
                      >
                        {u.dispositivosConfiaveis.length > 0 ? (
                          <span className='inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold'>
                            {u.dispositivosConfiaveis.length}
                          </span>
                        ) : (
                          <span className='text-gray-300'>0</span>
                        )}
                      </td>
                      <td className='px-4 py-3 text-right'>
                        <div className='inline-flex items-center gap-2'>
                          <Botao variante='secundario' tamanho='sm' onClick={() => abrirEditar(u)}>
                            Editar
                          </Botao>
                          <MenuAcoes
                            aberto={menuAberto === u._id}
                            onToggle={() => setMenuAberto(menuAberto === u._id ? null : u._id)}
                            rotulo={ocupado ? '…' : 'Ações'}
                          >
                            <ItemMenu
                              onClick={() => executarAcao(u, 'reenviar-convite')}
                              desc={
                                u.senhaDefinida
                                  ? 'Link para definir nova senha (7 dias)'
                                  : 'Reenvia o email de boas-vindas'
                              }
                            >
                              📨{' '}
                              {u.senhaDefinida ? 'Enviar link de nova senha' : 'Reenviar convite'}
                            </ItemMenu>
                            <ItemMenu
                              onClick={() =>
                                executarAcao(
                                  u,
                                  'resetar-senha',
                                  `Remover a senha de "${u.usuario}"? Ele só voltará a entrar depois de definir uma nova pelo email.`,
                                )
                              }
                              desc='Apaga a senha atual e encerra as sessões'
                            >
                              🔑 Resetar senha (forçar)
                            </ItemMenu>
                            {u.bloqueado && (
                              <ItemMenu
                                onClick={() => executarAcao(u, 'desbloquear')}
                                desc='Remove o bloqueio por tentativas'
                              >
                                🔓 Desbloquear
                              </ItemMenu>
                            )}
                            {u.dispositivosConfiaveis.length > 0 && (
                              <ItemMenu
                                onClick={() => executarAcao(u, 'revogar-dispositivos')}
                                desc='Exige OTP em todos os dispositivos'
                              >
                                📵 Revogar dispositivos confiáveis
                              </ItemMenu>
                            )}
                            {u.tipo !== 'admin' && (
                              <ItemMenu
                                onClick={() =>
                                  executarAcao(
                                    u,
                                    u.ativo ? 'desativar' : 'ativar',
                                    u.ativo
                                      ? `Desativar "${u.usuario}"? Ele perde o acesso imediatamente.`
                                      : null,
                                  )
                                }
                                desc={
                                  u.ativo
                                    ? 'Bloqueia o acesso (pedidos são mantidos)'
                                    : 'Restaura o acesso'
                                }
                                perigo={u.ativo}
                              >
                                {u.ativo ? '🚫 Desativar conta' : '✅ Ativar conta'}
                              </ItemMenu>
                            )}
                          </MenuAcoes>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </Tabela>
              <p className='px-4 py-3 text-xs text-gray-400 border-t border-gray-100'>
                O nome de usuário não pode ser alterado depois de criado: ele identifica os pedidos
                do distribuidor no sistema.
              </p>
            </Card>
          )}

          {/* ═══════ ABA CONVITES ═══════ */}
          {aba === 'convites' && (
            <Card
              titulo='Convites de cadastro'
              descricao='O distribuidor recebe um link, escolhe o próprio usuário e senha e preenche os dados. Válido por 7 dias.'
              acoes={
                <Botao variante='azul' tamanho='sm' onClick={abrirConvidar}>
                  ✉ Novo convite
                </Botao>
              }
              semPadding
            >
              <Tabela
                colunas={[
                  { label: 'Destinatário' },
                  { label: 'Status' },
                  { label: 'Enviado' },
                  { label: 'Validade' },
                  { label: 'Ações', alinhar: 'right' },
                ]}
                vazio={
                  listaConvites.length === 0 &&
                  (convites.total === 0
                    ? 'Ainda não enviou convites. Clique em "Novo convite".'
                    : 'Nenhum convite com este filtro')
                }
              >
                {listaConvites.map(c => {
                  const ocupado = acaoEmCurso?.startsWith(c._id);
                  return (
                    <tr key={c._id} className='hover:bg-gray-50'>
                      <td className='px-4 py-3'>
                        <div className='font-medium text-gray-800'>{c.email}</div>
                        <div className='text-xs text-gray-500'>
                          {c.nome || <span className='italic text-gray-400'>sem nome</span>}
                          {c.criadoPor && (
                            <span className='text-gray-400'> · por {c.criadoPor.nome}</span>
                          )}
                        </div>
                      </td>
                      <td className='px-4 py-3'>
                        <BadgeConvite status={c.status} />
                        {c.status === 'aceite' && c.userId && (
                          <div className='text-xs text-gray-500 mt-1'>
                            conta <span className='font-mono'>{c.userId.usuario}</span> ·{' '}
                            {relativo(c.aceiteEm)}
                          </div>
                        )}
                        {c.ultimoErroEnvio && c.status === 'pendente' && (
                          <div className='text-xs text-red-600 mt-1' title={c.ultimoErroEnvio}>
                            ⚠ falha no envio
                          </div>
                        )}
                      </td>
                      <td className='px-4 py-3 text-xs text-gray-600 whitespace-nowrap'>
                        {dataHora(c.enviadoEm)}
                        {c.reenvios > 0 && (
                          <div className='text-gray-400'>{c.reenvios} reenvio(s)</div>
                        )}
                      </td>
                      <td className='px-4 py-3 text-xs text-gray-600 whitespace-nowrap'>
                        {c.status === 'pendente'
                          ? `expira ${emPrazo(c.expiraEm)}`
                          : dataHora(c.expiraEm)}
                      </td>
                      <td className='px-4 py-3 text-right whitespace-nowrap'>
                        {c.status !== 'aceite' && (
                          <div className='inline-flex gap-2'>
                            <Botao
                              variante='secundario'
                              tamanho='sm'
                              loading={ocupado}
                              onClick={() => acaoConvite(c, 'PATCH')}
                            >
                              Reenviar
                            </Botao>
                            {c.status !== 'cancelado' && (
                              <Botao
                                variante='fantasma'
                                tamanho='sm'
                                className='text-red-600'
                                disabled={ocupado}
                                onClick={() =>
                                  acaoConvite(
                                    c,
                                    'DELETE',
                                    `Cancelar o convite para ${c.email}? O link deixa de funcionar.`,
                                  )
                                }
                              >
                                Cancelar
                              </Botao>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </Tabela>
            </Card>
          )}
        </>
      )}

      {/* ═══════════ MODAL CONVIDAR ═══════════ */}
      {modal?.modo === 'convidar' && (
        <Modal
          titulo='Convidar distribuidor'
          subtitulo='Enviamos um email com um link para ele criar a própria conta'
          onFechar={() => !salvando && setModal(null)}
          bloqueado={salvando}
          largura='max-w-lg'
          rodape={
            <>
              <Botao variante='secundario' onClick={() => setModal(null)} disabled={salvando}>
                Cancelar
              </Botao>
              <Botao variante='azul' onClick={salvar} loading={salvando}>
                Enviar convite
              </Botao>
            </>
          }
        >
          <form onSubmit={salvar} className='space-y-4'>
            <Alerta tipo='erro'>{erroForm}</Alerta>
            <Campo
              label='Email do distribuidor'
              obrigatorio
              dica='A conta será criada com este email'
            >
              <Input
                type='email'
                value={formConvite.email}
                onChange={e => setFormConvite({ ...formConvite, email: e.target.value })}
                required
                autoFocus
              />
            </Campo>
            <Campo label='Nome / empresa' dica='Opcional. Pré-preenche o formulário de cadastro'>
              <Input
                value={formConvite.nome}
                onChange={e => setFormConvite({ ...formConvite, nome: e.target.value })}
                placeholder='Ex.: Surf Shop Rio'
              />
            </Campo>
            <Campo label='Mensagem pessoal' dica='Opcional. Aparece no corpo do email'>
              <Textarea
                rows={3}
                value={formConvite.mensagem}
                onChange={e => setFormConvite({ ...formConvite, mensagem: e.target.value })}
                placeholder='Ex.: Foi um prazer falar contigo na feira. Aqui tens o acesso ao nosso portal de pedidos.'
                maxLength={1000}
              />
            </Campo>
            <Alerta tipo='info'>
              O link é válido por <strong>7 dias</strong> e só pode ser usado uma vez. O
              distribuidor escolhe o usuário e a senha; nada é criado até ele concluir.
            </Alerta>
            <button type='submit' className='hidden' />
          </form>
        </Modal>
      )}

      {/* ═══════════ MODAL CRIAR / EDITAR CONTA ═══════════ */}
      {modal && modal.modo !== 'convidar' && (
        <Modal
          titulo={
            modal.modo === 'criar' ? 'Criar conta de distribuidor' : `Editar ${modal.dados.usuario}`
          }
          subtitulo={
            modal.modo === 'criar'
              ? 'O admin define o usuário; o distribuidor recebe um link para escolher a senha'
              : undefined
          }
          onFechar={() => !salvando && setModal(null)}
          bloqueado={salvando}
          rodape={
            <>
              <Botao variante='secundario' onClick={() => setModal(null)} disabled={salvando}>
                Cancelar
              </Botao>
              <Botao variante='azul' onClick={salvar} loading={salvando}>
                {modal.modo === 'criar' ? 'Criar e enviar convite' : 'Salvar alterações'}
              </Botao>
            </>
          }
        >
          <form onSubmit={salvar} className='space-y-5'>
            <Alerta tipo='erro'>{erroForm}</Alerta>

            {modal.modo === 'criar' && (
              <Alerta tipo='info'>
                Prefere que o distribuidor preencha tudo sozinho? Use{' '}
                <button type='button' onClick={abrirConvidar} className='font-semibold underline'>
                  Convidar distribuidor
                </button>
                .
              </Alerta>
            )}

            <div className='grid md:grid-cols-2 gap-4'>
              <Campo
                label='Usuário (login)'
                obrigatorio
                dica='3-30 caracteres: minúsculas, números, ponto, hífen, underscore'
              >
                <Input
                  value={form.usuario}
                  disabled={modal.modo === 'editar'}
                  onChange={e => setForm({ ...form, usuario: e.target.value.toLowerCase() })}
                  pattern='[a-z0-9._\-]{3,30}'
                  placeholder='ex.: surfshop.rio'
                  required
                  className='font-mono'
                />
              </Campo>
              <Campo label='Nome completo / Razão social' obrigatorio>
                <Input
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  required
                />
              </Campo>
              <Campo label='Email' obrigatorio>
                <Input
                  type='email'
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </Campo>
              <Campo label='Telefone'>
                <Input
                  type='tel'
                  value={form.telefone}
                  onChange={e => setForm({ ...form, telefone: e.target.value })}
                  placeholder='(11) 99999-9999'
                />
              </Campo>
            </div>

            <details
              className='border border-gray-200 rounded-lg'
              open={modal.modo === 'editar' && Boolean(form.endereco.rua)}
            >
              <summary className='px-4 py-3 cursor-pointer text-sm font-semibold text-gray-700 select-none'>
                📍 Endereço de entrega (opcional — o distribuidor pode preencher no checkout)
              </summary>
              <div className='px-4 pb-4 grid md:grid-cols-3 gap-3'>
                {[
                  ['rua', 'Rua', 'md:col-span-2'],
                  ['numero', 'Número', ''],
                  ['complemento', 'Complemento', ''],
                  ['bairro', 'Bairro', ''],
                  ['cidade', 'Cidade', ''],
                  ['cep', 'CEP', ''],
                  ['estado', 'Estado (UF)', ''],
                ].map(([campo, label, cls]) => (
                  <Campo key={campo} label={label} className={cls}>
                    <Input
                      value={form.endereco[campo] || ''}
                      onChange={e =>
                        setForm({
                          ...form,
                          endereco: { ...form.endereco, [campo]: e.target.value },
                        })
                      }
                    />
                  </Campo>
                ))}
              </div>
            </details>
            <button type='submit' className='hidden' />
          </form>
        </Modal>
      )}
    </AdminShell>
  );
}

const BadgeConvite = ({ status }) => {
  const m = {
    pendente: ['blue', 'Pendente'],
    aceite: ['green', 'Aceite'],
    expirado: ['red', 'Expirado'],
    cancelado: ['gray', 'Cancelado'],
  };
  const [cor, label] = m[status] || ['gray', status];
  return <Badge cor={cor}>{label}</Badge>;
};
