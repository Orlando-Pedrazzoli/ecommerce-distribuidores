// pages/admin/distribuidores.js - GESTÃO DE DISTRIBUIDORES (ADMIN)
// ===================================
// Criar, editar, ativar/desativar, reenviar convite, resetar senha,
// desbloquear e revogar dispositivos confiáveis.

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../components/Layout';
import { useToastContext } from '../_app';

const FORM_VAZIO = {
  usuario: '',
  nome: '',
  email: '',
  telefone: '',
  endereco: { rua: '', numero: '', complemento: '', bairro: '', cidade: '', cep: '', estado: '' },
};

const formatarData = d =>
  d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export default function AdminDistribuidores() {
  const router = useRouter();
  const toast = useToastContext();

  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState({ distribuidores: [], total: 0, ativos: 0, semSenha: 0 });
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos'); // todos | ativos | inativos | sem-senha
  const [modal, setModal] = useState(null); // { modo: 'criar' | 'editar', dados }
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [acaoEmCurso, setAcaoEmCurso] = useState(null); // `${id}:${acao}`
  const [menuAberto, setMenuAberto] = useState(null);

  const notificar = (tipo, msg) => {
    if (toast?.[tipo]) toast[tipo](msg);
    else if (tipo === 'error') alert(msg);
  };

  // ── Auth ──
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(data => {
        if (data.user?.tipo !== 'admin') router.push('/');
      })
      .catch(() => router.push('/'));
  }, [router]);

  // ── Carregar ──
  const carregar = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/distribuidores?tipo=todos');
      if (!response.ok) throw new Error('Falha ao carregar');
      setDados(await response.json());
    } catch (error) {
      notificar('error', 'Erro ao carregar distribuidores');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Fecha o menu de ações ao clicar fora
  useEffect(() => {
    const fechar = () => setMenuAberto(null);
    document.addEventListener('click', fechar);
    return () => document.removeEventListener('click', fechar);
  }, []);

  // ── Filtro ──
  const lista = dados.distribuidores.filter(u => {
    if (filtroStatus === 'ativos' && !u.ativo) return false;
    if (filtroStatus === 'inativos' && u.ativo) return false;
    if (filtroStatus === 'sem-senha' && u.senhaDefinida) return false;
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

  // ── Modal ──
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

  const salvar = async e => {
    e.preventDefault();
    setSalvando(true);
    setErroForm('');
    try {
      const url =
        modal.modo === 'criar'
          ? '/api/admin/distribuidores'
          : `/api/admin/distribuidores/${modal.dados._id}`;
      const body =
        modal.modo === 'criar'
          ? form
          : { nome: form.nome, email: form.email, telefone: form.telefone, endereco: form.endereco };

      const response = await fetch(url, {
        method: modal.modo === 'criar' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        setErroForm(data.message || 'Erro ao salvar');
        return;
      }
      notificar(data.conviteEnviado === false ? 'warning' : 'success', data.message);
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
      const response = await fetch(`/api/admin/distribuidores/${u._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erro');
      notificar('success', data.message);
      carregar();
    } catch (error) {
      notificar('error', error.message);
    } finally {
      setAcaoEmCurso(null);
    }
  };

  // ── Render ──
  if (loading) {
    return (
      <Layout>
        <div className='flex items-center justify-center py-32'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Distribuidores - Admin</title>
      </Head>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Cabeçalho */}
        <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6'>
          <div>
            <button onClick={() => router.push('/admin')} className='text-sm text-gray-500 hover:text-gray-700 mb-1'>
              ← Painel Admin
            </button>
            <h1 className='text-2xl font-bold text-gray-800'>👥 Distribuidores</h1>
            <p className='text-sm text-gray-500'>Contas de acesso, convites e segurança</p>
          </div>
          <button
            onClick={abrirCriar}
            className='bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition shadow'
          >
            + Novo distribuidor
          </button>
        </div>

        {/* Cards */}
        <div className='grid grid-cols-3 gap-4 mb-6'>
          <div className='bg-white rounded-lg shadow p-4'>
            <p className='text-xs text-gray-500 uppercase'>Total</p>
            <p className='text-2xl font-bold text-gray-800'>{dados.total}</p>
          </div>
          <div className='bg-white rounded-lg shadow p-4'>
            <p className='text-xs text-gray-500 uppercase'>Ativos</p>
            <p className='text-2xl font-bold text-green-600'>{dados.ativos}</p>
          </div>
          <div className='bg-white rounded-lg shadow p-4'>
            <p className='text-xs text-gray-500 uppercase'>Sem senha definida</p>
            <p className='text-2xl font-bold text-orange-500'>{dados.semSenha}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className='bg-white rounded-lg shadow p-4 mb-6 flex flex-col md:flex-row gap-3'>
          <input
            type='search'
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder='Buscar por usuário, nome ou email...'
            className='flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            className='px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            <option value='todos'>Todos</option>
            <option value='ativos'>Ativos</option>
            <option value='inativos'>Inativos</option>
            <option value='sem-senha'>Sem senha definida</option>
          </select>
        </div>

        {/* Tabela */}
        <div className='bg-white rounded-lg shadow overflow-visible'>
          <div className='overflow-x-auto'>
            <table className='min-w-full text-sm'>
              <thead className='bg-gray-50 text-gray-600 uppercase text-xs'>
                <tr>
                  <th className='px-4 py-3 text-left'>Usuário</th>
                  <th className='px-4 py-3 text-left'>Nome / Email</th>
                  <th className='px-4 py-3 text-left'>Status</th>
                  <th className='px-4 py-3 text-left'>Último login</th>
                  <th className='px-4 py-3 text-center'>Disp.</th>
                  <th className='px-4 py-3 text-right'>Ações</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {lista.length === 0 && (
                  <tr>
                    <td colSpan={6} className='px-4 py-10 text-center text-gray-400'>
                      Nenhum distribuidor encontrado
                    </td>
                  </tr>
                )}
                {lista.map(u => {
                  const ocupado = acaoEmCurso?.startsWith(u._id);
                  return (
                    <tr key={u._id} className={!u.ativo ? 'bg-gray-50 text-gray-400' : ''}>
                      <td className='px-4 py-3 font-mono font-medium'>
                        {u.usuario}
                        {u.tipo === 'admin' && (
                          <span className='ml-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase font-sans'>
                            admin
                          </span>
                        )}
                      </td>
                      <td className='px-4 py-3'>
                        <div className='font-medium text-gray-800'>{u.nome}</div>
                        <div className='text-xs text-gray-500'>{u.email || <span className='text-red-500'>sem email</span>}</div>
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
                      <td className='px-4 py-3 text-gray-600 whitespace-nowrap'>{formatarData(u.ultimoLogin)}</td>
                      <td className='px-4 py-3 text-center' title='Dispositivos confiáveis (sem OTP)'>
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
                          <button
                            onClick={() => abrirEditar(u)}
                            className='px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-100 text-gray-700'
                          >
                            Editar
                          </button>
                          <div className='relative' onClick={e => e.stopPropagation()}>
                            <button
                              disabled={ocupado}
                              onClick={() => setMenuAberto(menuAberto === u._id ? null : u._id)}
                              className='px-3 py-1.5 rounded bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-50'
                            >
                              {ocupado ? '...' : 'Ações ▾'}
                            </button>
                            {menuAberto === u._id && (
                              <div className='absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-20 text-left overflow-hidden'>
                                <ItemMenu
                                  onClick={() => executarAcao(u, 'reenviar-convite')}
                                  desc={u.senhaDefinida ? 'Link para definir nova senha (7 dias)' : 'Reenvia o email de boas-vindas'}
                                >
                                  📨 {u.senhaDefinida ? 'Enviar link de nova senha' : 'Reenviar convite'}
                                </ItemMenu>
                                <ItemMenu
                                  onClick={() =>
                                    executarAcao(
                                      u,
                                      'resetar-senha',
                                      `Remover a senha de "${u.usuario}"? Ele só voltará a entrar depois de definir uma nova pelo email.`
                                    )
                                  }
                                  desc='Apaga a senha atual e encerra as sessões'
                                >
                                  🔑 Resetar senha (forçar)
                                </ItemMenu>
                                {u.bloqueado && (
                                  <ItemMenu onClick={() => executarAcao(u, 'desbloquear')} desc='Remove o bloqueio por tentativas'>
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
                                        u.ativo ? `Desativar "${u.usuario}"? Ele perde o acesso imediatamente.` : null
                                      )
                                    }
                                    desc={u.ativo ? 'Bloqueia o acesso (pedidos são mantidos)' : 'Restaura o acesso'}
                                    perigo={u.ativo}
                                  >
                                    {u.ativo ? '🚫 Desativar conta' : '✅ Ativar conta'}
                                  </ItemMenu>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className='text-xs text-gray-400 mt-4'>
          O nome de usuário não pode ser alterado depois de criado: ele identifica os pedidos
          do distribuidor no sistema.
        </p>
      </div>

      {/* ═══════════ MODAL CRIAR / EDITAR ═══════════ */}
      {modal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4' onClick={() => !salvando && setModal(null)}>
          <div className='bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto' onClick={e => e.stopPropagation()}>
            <form onSubmit={salvar}>
              <div className='px-6 py-4 border-b flex items-center justify-between'>
                <h2 className='text-lg font-bold text-gray-800'>
                  {modal.modo === 'criar' ? '➕ Novo distribuidor' : `✏️ Editar ${modal.dados.usuario}`}
                </h2>
                <button type='button' onClick={() => setModal(null)} className='text-gray-400 hover:text-gray-600 text-2xl leading-none'>
                  ×
                </button>
              </div>

              <div className='px-6 py-5 space-y-5'>
                {erroForm && (
                  <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm'>{erroForm}</div>
                )}

                {modal.modo === 'criar' && (
                  <div className='bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm'>
                    O distribuidor receberá um email com um link para definir a própria senha (válido por 7 dias).
                    Nenhuma senha é criada ou enviada pelo admin.
                  </div>
                )}

                <div className='grid md:grid-cols-2 gap-4'>
                  <Campo label='Usuário (login)' obrigatorio>
                    <input
                      type='text'
                      value={form.usuario}
                      disabled={modal.modo === 'editar'}
                      onChange={e => setForm({ ...form, usuario: e.target.value.toLowerCase() })}
                      pattern='[a-z0-9._\-]{3,30}'
                      title='3-30 caracteres: letras minúsculas, números, ponto, hífen ou underscore'
                      placeholder='ex.: surfshop.rio'
                      required
                      className='input-admin font-mono disabled:bg-gray-100 disabled:text-gray-500'
                    />
                  </Campo>
                  <Campo label='Nome completo / Razão social' obrigatorio>
                    <input
                      type='text'
                      value={form.nome}
                      onChange={e => setForm({ ...form, nome: e.target.value })}
                      required
                      className='input-admin'
                    />
                  </Campo>
                  <Campo label='Email' obrigatorio>
                    <input
                      type='email'
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      required
                      className='input-admin'
                    />
                  </Campo>
                  <Campo label='Telefone'>
                    <input
                      type='tel'
                      value={form.telefone}
                      onChange={e => setForm({ ...form, telefone: e.target.value })}
                      placeholder='(11) 99999-9999'
                      className='input-admin'
                    />
                  </Campo>
                </div>

                <details className='border rounded-lg' open={modal.modo === 'editar' && Boolean(form.endereco.rua)}>
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
                        <input
                          type='text'
                          value={form.endereco[campo] || ''}
                          onChange={e =>
                            setForm({ ...form, endereco: { ...form.endereco, [campo]: e.target.value } })
                          }
                          className='input-admin'
                        />
                      </Campo>
                    ))}
                  </div>
                </details>
              </div>

              <div className='px-6 py-4 border-t bg-gray-50 flex justify-end gap-3'>
                <button
                  type='button'
                  onClick={() => setModal(null)}
                  disabled={salvando}
                  className='px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100'
                >
                  Cancelar
                </button>
                <button
                  type='submit'
                  disabled={salvando}
                  className='px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50'
                >
                  {salvando ? 'Salvando...' : modal.modo === 'criar' ? 'Criar e enviar convite' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input-admin {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.875rem;
        }
        .input-admin:focus {
          outline: none;
          box-shadow: 0 0 0 2px #3b82f6;
          border-color: transparent;
        }
      `}</style>
    </Layout>
  );
}

// ══════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ══════════════════════════════════════════════════════════════
const Badge = ({ cor, children }) => {
  const cores = {
    green: 'bg-green-100 text-green-800',
    gray: 'bg-gray-200 text-gray-600',
    orange: 'bg-orange-100 text-orange-800',
    red: 'bg-red-100 text-red-800',
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cores[cor]}`}>{children}</span>;
};

const ItemMenu = ({ onClick, desc, perigo, children }) => (
  <button
    type='button'
    onClick={onClick}
    className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 ${
      perigo ? 'text-red-600' : 'text-gray-800'
    }`}
  >
    <div className='text-sm font-medium'>{children}</div>
    {desc && <div className='text-xs text-gray-400'>{desc}</div>}
  </button>
);

const Campo = ({ label, obrigatorio, className = '', children }) => (
  <div className={className}>
    <label className='block text-xs font-semibold text-gray-600 mb-1'>
      {label} {obrigatorio && <span className='text-red-500'>*</span>}
    </label>
    {children}
  </div>
);
