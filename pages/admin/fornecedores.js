// pages/admin/fornecedores.js - GESTÃO DE FORNECEDORES (ADMIN)
// ===================================
// Criar, configurar (dados, apresentação, catálogo, operação), ativar/desativar
// e apagar fornecedores. Substitui o "Funcionalidade em desenvolvimento".

import { useState, useEffect, useCallback, useRef } from 'react';
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
  ModalApagar,
  Vazio,
  Carregando,
  LogoFornecedor,
  moeda,
  relativo,
} from '../../components/Admin/ui';
import { useToastContext } from '../_app';

const CORES_SUGERIDAS = [
  '#2563eb',
  '#059669',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#374151',
];

const FORM_VAZIO = {
  codigo: '',
  nome: '',
  email: '',
  emailsCopia: '',
  responsavel: '',
  telefone: '',
  whatsapp: '',
  cnpj: '',
  cidade: '',
  estado: '',
  especialidade: '',
  descricao: '',
  cor: '#2563eb',
  logo: '',
  ordem: 0,
  categorias: '',
  categoriasIsentasRoyalty: [],
  prazoEntregaDias: '',
  pedidoMinimo: '',
  observacoes: '',
};

const paraForm = f => ({
  ...FORM_VAZIO,
  ...f,
  emailsCopia: (f.emailsCopia || []).join(', '),
  categorias: (f.categorias || []).join('\n'),
  categoriasIsentasRoyalty: f.categoriasIsentasRoyalty || [],
  prazoEntregaDias: f.prazoEntregaDias ?? '',
  pedidoMinimo: f.pedidoMinimo ?? '',
  cor: f.cor || '#374151',
});

const ABAS = [
  { id: 'dados', label: 'Dados e contacto' },
  { id: 'apresentacao', label: 'Apresentação' },
  { id: 'catalogo', label: 'Catálogo e royalties' },
  { id: 'operacao', label: 'Operação' },
];

export default function AdminFornecedores() {
  const router = useRouter();
  const toast = useToastContext();

  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState({ fornecedores: [], total: 0, ativos: 0 });
  const [busca, setBusca] = useState('');
  const [mostrarInativos, setMostrarInativos] = useState(true);

  const [modal, setModal] = useState(null); // { modo: 'criar' | 'editar', dados }
  const [aba, setAba] = useState('dados');
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [acaoEmCurso, setAcaoEmCurso] = useState(null);

  const notificar = (tipo, msg) => {
    if (toast?.[tipo]) toast[tipo](msg);
    else if (tipo === 'error') alert(msg);
  };

  const carregar = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/fornecedores?todos=1');
      if (!r.ok) throw new Error();
      setDados(await r.json());
    } catch {
      notificar('error', 'Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Abre diretamente o modal de criação quando vem de /admin?novo=fornecedor
  useEffect(() => {
    if (router.isReady && router.query.novo === '1') abrirCriar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  const lista = dados.fornecedores.filter(f => {
    if (!mostrarInativos && !f.ativo) return false;
    if (!busca) return true;
    const b = busca.toLowerCase();
    return (
      f.nome.toLowerCase().includes(b) ||
      f.codigo.toLowerCase().includes(b) ||
      (f.email || '').toLowerCase().includes(b) ||
      (f.especialidade || '').toLowerCase().includes(b)
    );
  });

  const totais = dados.fornecedores.reduce(
    (acc, f) => ({
      produtos: acc.produtos + (f.stats?.produtos || 0),
      pendentes: acc.pendentes + (f.stats?.pedidosPendentes || 0),
    }),
    { produtos: 0, pendentes: 0 },
  );

  // ── Modal ──
  const abrirCriar = () => {
    setForm({ ...FORM_VAZIO, ordem: dados.fornecedores.length + 1 });
    setErroForm('');
    setAba('dados');
    setModal({ modo: 'criar' });
  };

  const abrirEditar = (f, abaInicial = 'dados') => {
    setForm(paraForm(f));
    setErroForm('');
    setAba(abaInicial);
    setModal({ modo: 'editar', dados: f });
  };

  const set = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }));

  const categoriasLista = form.categorias
    .split(/[\n,]/)
    .map(s => s.trim())
    .filter(Boolean);

  const salvar = async e => {
    e?.preventDefault();
    setSalvando(true);
    setErroForm('');
    try {
      const url =
        modal.modo === 'criar'
          ? '/api/admin/fornecedores'
          : `/api/admin/fornecedores/${modal.dados._id}`;
      const body = {
        ...form,
        categorias: categoriasLista,
        categoriasIsentasRoyalty: form.categoriasIsentasRoyalty.filter(c =>
          categoriasLista.includes(c),
        ),
      };
      const r = await fetch(url, {
        method: modal.modo === 'criar' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) {
        setErroForm(data.message || 'Erro ao salvar');
        return;
      }
      notificar('success', data.message);
      setModal(null);
      carregar();
    } catch {
      setErroForm('Erro de conexão');
    } finally {
      setSalvando(false);
    }
  };

  const executar = async (f, metodo, body, confirmacao) => {
    if (confirmacao && !confirm(confirmacao)) return;
    setAcaoEmCurso(f._id);
    try {
      const r = await fetch(`/api/admin/fornecedores/${f._id}`, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Erro');
      notificar('success', data.message);
      setModal(null);
      carregar();
    } catch (error) {
      notificar('error', error.message);
    } finally {
      setAcaoEmCurso(null);
    }
  };

  // Exclusão definitiva: abre o modal de confirmação (escrever o código)
  const [apagando, setApagando] = useState(null); // fornecedor
  const apagar = f => setApagando(f);
  const confirmarApagar = async confirmar => {
    const f = apagando;
    setAcaoEmCurso(f._id);
    try {
      // `confirmar` vai no body E na query: alguns proxies descartam o body de DELETE
      const r = await fetch(
        `/api/admin/fornecedores/${f._id}?confirmar=${encodeURIComponent(confirmar)}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmar }),
        },
      );
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || 'Erro');
      notificar('success', data.message);
      setApagando(null);
      setModal(null);
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
      titulo='Fornecedores'
      subtitulo='Cadastro, apresentação no portal, categorias e regras de royalties'
      acoes={
        <Botao variante='azul' onClick={abrirCriar}>
          + Novo fornecedor
        </Botao>
      }
    >
      {loading ? (
        <Carregando />
      ) : (
        <>
          {/* KPIs */}
          <div className='grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6'>
            <Kpi rotulo='Fornecedores' valor={dados.total} detalhe={`${dados.ativos} ativos`} />
            <Kpi
              rotulo='Inativos'
              valor={dados.total - dados.ativos}
              tom={dados.total - dados.ativos > 0 ? 'alerta' : 'neutro'}
            />
            <Kpi
              rotulo='Produtos no catálogo'
              valor={totais.produtos}
              tom='info'
              onClick={() => router.push('/admin-produtos')}
            />
            <Kpi
              rotulo='Pedidos pendentes'
              valor={totais.pendentes}
              tom={totais.pendentes > 0 ? 'perigo' : 'positivo'}
              onClick={() => router.push('/admin-pedidos')}
            />
          </div>

          {/* Filtros */}
          <div className='flex flex-col sm:flex-row gap-3 mb-4'>
            <Input
              type='search'
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder='Buscar por nome, código, email ou especialidade…'
              className='sm:max-w-md'
            />
            <label className='inline-flex items-center gap-2 text-sm text-gray-600 select-none'>
              <input
                type='checkbox'
                checked={mostrarInativos}
                onChange={e => setMostrarInativos(e.target.checked)}
                className='rounded'
              />
              Mostrar inativos
            </label>
          </div>

          {/* Lista */}
          {lista.length === 0 ? (
            <Card>
              <Vazio
                titulo={
                  dados.total === 0
                    ? 'Ainda não há fornecedores'
                    : 'Nenhum fornecedor corresponde à busca'
                }
                descricao={
                  dados.total === 0
                    ? 'Crie o primeiro fornecedor. Ele passa a aparecer no portal dos distribuidores assim que tiver produtos ativos.'
                    : undefined
                }
                acao={
                  dados.total === 0 && (
                    <Botao variante='azul' onClick={abrirCriar}>
                      + Novo fornecedor
                    </Botao>
                  )
                }
              />
            </Card>
          ) : (
            <div className='grid md:grid-cols-2 xl:grid-cols-3 gap-4'>
              {lista.map(f => (
                <CartaoFornecedor
                  key={f._id}
                  f={f}
                  ocupado={acaoEmCurso === f._id}
                  onEditar={abaInicial => abrirEditar(f, abaInicial)}
                  onToggleAtivo={() =>
                    executar(
                      f,
                      'PATCH',
                      { acao: f.ativo ? 'desativar' : 'ativar' },
                      f.ativo
                        ? `Desativar "${f.nome}"? Deixa de aparecer no portal dos distribuidores.`
                        : null,
                    )
                  }
                  onApagar={() => apagar(f)}
                  onVerProdutos={() => router.push(`/admin-produtos?fornecedor=${f._id}`)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══════════ MODAL CRIAR / CONFIGURAR ═══════════ */}
      {modal && (
        <Modal
          titulo={modal.modo === 'criar' ? 'Novo fornecedor' : `Configurar ${modal.dados.nome}`}
          subtitulo={
            modal.modo === 'editar'
              ? `Código ${modal.dados.codigo}`
              : 'O código é usado nas URLs e nos emails de pedido'
          }
          onFechar={() => !salvando && setModal(null)}
          bloqueado={salvando}
          largura='max-w-3xl'
          rodape={
            <>
              {modal.modo === 'editar' && (
                <div className='mr-auto flex gap-2'>
                  <Botao
                    variante='fantasma'
                    tamanho='sm'
                    onClick={() => apagar(modal.dados)}
                    className='text-red-600'
                  >
                    Apagar
                  </Botao>
                </div>
              )}
              <Botao variante='secundario' onClick={() => setModal(null)} disabled={salvando}>
                Cancelar
              </Botao>
              <Botao variante='azul' onClick={salvar} loading={salvando}>
                {modal.modo === 'criar' ? 'Criar fornecedor' : 'Salvar alterações'}
              </Botao>
            </>
          }
        >
          {/* Abas */}
          <div className='flex gap-1 overflow-x-auto border-b border-gray-200 -mx-5 px-5 mb-5'>
            {ABAS.map(a => (
              <button
                key={a.id}
                type='button'
                onClick={() => setAba(a.id)}
                className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition ${
                  aba === a.id
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          <Alerta tipo='erro' className='mb-4'>
            {erroForm}
          </Alerta>

          <form onSubmit={salvar} className='space-y-5'>
            {/* ── DADOS ── */}
            {aba === 'dados' && (
              <>
                <div className='grid sm:grid-cols-3 gap-4'>
                  <Campo label='Código' obrigatorio dica='1 a 6 letras/números. Ex.: A, WKM'>
                    <Input
                      value={form.codigo}
                      onChange={e =>
                        set(
                          'codigo',
                          e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9]/g, '')
                            .slice(0, 6),
                        )
                      }
                      disabled={
                        modal.modo === 'editar' &&
                        ((modal.dados.stats?.produtos || 0) > 0 ||
                          (modal.dados.stats?.pedidos || 0) > 0)
                      }
                      className='font-mono uppercase'
                      required
                    />
                  </Campo>
                  <Campo label='Nome do fornecedor' obrigatorio className='sm:col-span-2'>
                    <Input
                      value={form.nome}
                      onChange={e => set('nome', e.target.value)}
                      placeholder='Ex.: Mauricio - Maos Acessórios'
                      required
                    />
                  </Campo>
                </div>

                <div className='grid sm:grid-cols-2 gap-4'>
                  <Campo
                    label='Email principal'
                    obrigatorio
                    dica='Recebe os pedidos dos distribuidores'
                  >
                    <Input
                      type='email'
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                      required
                    />
                  </Campo>
                  <Campo
                    label='Emails em cópia'
                    dica='Separados por vírgula. Também recebem os pedidos'
                  >
                    <Input
                      value={form.emailsCopia}
                      onChange={e => set('emailsCopia', e.target.value)}
                      placeholder='vendas@…, financeiro@…'
                    />
                  </Campo>
                  <Campo label='Responsável / contacto'>
                    <Input
                      value={form.responsavel}
                      onChange={e => set('responsavel', e.target.value)}
                    />
                  </Campo>
                  <Campo label='CNPJ'>
                    <Input
                      value={form.cnpj}
                      onChange={e => set('cnpj', e.target.value)}
                      placeholder='00.000.000/0000-00'
                    />
                  </Campo>
                  <Campo label='Telefone'>
                    <Input
                      type='tel'
                      value={form.telefone}
                      onChange={e => set('telefone', e.target.value)}
                      placeholder='(11) 3333-3333'
                    />
                  </Campo>
                  <Campo label='WhatsApp'>
                    <Input
                      type='tel'
                      value={form.whatsapp}
                      onChange={e => set('whatsapp', e.target.value)}
                      placeholder='(11) 99999-9999'
                    />
                  </Campo>
                  <Campo label='Cidade'>
                    <Input value={form.cidade} onChange={e => set('cidade', e.target.value)} />
                  </Campo>
                  <Campo label='Estado (UF)'>
                    <Input
                      value={form.estado}
                      onChange={e => set('estado', e.target.value.toUpperCase().slice(0, 2))}
                      maxLength={2}
                      className='uppercase'
                    />
                  </Campo>
                </div>
              </>
            )}

            {/* ── APRESENTAÇÃO ── */}
            {aba === 'apresentacao' && (
              <>
                <Alerta tipo='info'>
                  É assim que o fornecedor aparece no cartão do portal dos distribuidores.
                </Alerta>

                <div className='grid sm:grid-cols-[1fr_auto] gap-5'>
                  <div className='space-y-4'>
                    <Campo
                      label='Especialidade'
                      dica='Linha curta por baixo do nome. Ex.: Especialista em Leashes'
                    >
                      <Input
                        value={form.especialidade}
                        onChange={e => set('especialidade', e.target.value)}
                        maxLength={120}
                      />
                    </Campo>
                    <Campo
                      label='Descrição'
                      dica='Uma frase sobre o fornecedor (máx. 300 caracteres)'
                    >
                      <Textarea
                        rows={2}
                        value={form.descricao}
                        onChange={e => set('descricao', e.target.value)}
                        maxLength={300}
                      />
                    </Campo>
                    <Campo label='Cor de destaque'>
                      <div className='flex flex-wrap items-center gap-2'>
                        {CORES_SUGERIDAS.map(c => (
                          <button
                            key={c}
                            type='button'
                            onClick={() => set('cor', c)}
                            className={`w-7 h-7 rounded-full ring-2 ring-offset-2 transition ${form.cor === c ? 'ring-gray-900' : 'ring-transparent'}`}
                            style={{ background: c }}
                            title={c}
                          />
                        ))}
                        <input
                          type='color'
                          value={form.cor}
                          onChange={e => set('cor', e.target.value)}
                          className='w-9 h-8 p-0 border rounded cursor-pointer'
                          title='Cor personalizada'
                        />
                        <div className='w-28'>
                          <Input
                            value={form.cor}
                            onChange={e => set('cor', e.target.value)}
                            className='font-mono'
                            maxLength={7}
                          />
                        </div>
                      </div>
                    </Campo>
                    <Campo label='Ordem no dashboard' dica='Menor número aparece primeiro'>
                      <div className='w-28'>
                        <Input
                          type='number'
                          value={form.ordem}
                          onChange={e => set('ordem', e.target.value)}
                        />
                      </div>
                    </Campo>
                  </div>

                  <div className='space-y-3'>
                    <p className='text-xs font-semibold text-gray-600'>Logo</p>
                    <UploadLogo
                      valor={form.logo}
                      onChange={url => set('logo', url)}
                      onErro={msg => setErroForm(msg)}
                    />
                  </div>
                </div>

                {/* Pré-visualização */}
                <div>
                  <p className='text-xs font-semibold text-gray-600 mb-2'>
                    Pré-visualização do cartão
                  </p>
                  <div className='max-w-xs rounded-xl overflow-hidden shadow border border-gray-200 bg-white'>
                    <div
                      className='p-5 text-white text-center relative'
                      style={{
                        background: `linear-gradient(135deg, ${form.cor || '#374151'}, ${form.cor || '#374151'}cc)`,
                      }}
                    >
                      <div className='flex justify-center mb-3'>
                        <div className='bg-white rounded-full p-1 shadow-lg'>
                          <LogoFornecedor
                            fornecedor={{ nome: form.nome, cor: form.cor, logo: form.logo }}
                            tamanho={56}
                          />
                        </div>
                      </div>
                      <h3 className='font-bold'>{form.nome || 'Nome do fornecedor'}</h3>
                      <p className='text-xs opacity-90'>{form.especialidade || 'Especialidade'}</p>
                      <span className='absolute top-3 right-3 bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold'>
                        {form.codigo || '?'}
                      </span>
                    </div>
                    <div className='p-4 text-center text-sm text-gray-600'>
                      {form.descricao || 'Descrição do fornecedor'}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── CATÁLOGO ── */}
            {aba === 'catalogo' && (
              <>
                <Campo
                  label='Categorias de produtos'
                  dica='Uma por linha (ou separadas por vírgula). São as categorias disponíveis ao cadastrar produtos deste fornecedor.'
                >
                  <Textarea
                    rows={8}
                    value={form.categorias}
                    onChange={e => set('categorias', e.target.value)}
                    placeholder={'Deck Noronha\nDeck Saquarema\nLeash Infinity 6 x 6,3mm'}
                    className='font-mono text-xs'
                  />
                </Campo>

                <div>
                  <p className='text-xs font-semibold text-gray-600 mb-1'>
                    Categorias isentas de royalties
                  </p>
                  <p className='text-[11px] text-gray-400 mb-2'>
                    Produtos nestas categorias não pagam os 5% de royalties. Marque as que se
                    aplicam.
                  </p>
                  {categoriasLista.length === 0 ? (
                    <p className='text-sm text-gray-400 italic'>
                      Adicione categorias acima para as poder marcar como isentas.
                    </p>
                  ) : (
                    <div className='flex flex-wrap gap-2'>
                      {categoriasLista.map(c => {
                        const on = form.categoriasIsentasRoyalty.includes(c);
                        return (
                          <button
                            key={c}
                            type='button'
                            onClick={() =>
                              set(
                                'categoriasIsentasRoyalty',
                                on
                                  ? form.categoriasIsentasRoyalty.filter(x => x !== c)
                                  : [...form.categoriasIsentasRoyalty, c],
                              )
                            }
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                              on
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                            }`}
                          >
                            {on ? '✓ ' : ''}
                            {c}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── OPERAÇÃO ── */}
            {aba === 'operacao' && (
              <>
                <div className='grid sm:grid-cols-2 gap-4'>
                  <Campo
                    label='Prazo de entrega (dias)'
                    dica='Informativo, mostrado ao distribuidor'
                  >
                    <Input
                      type='number'
                      min={0}
                      value={form.prazoEntregaDias}
                      onChange={e => set('prazoEntregaDias', e.target.value)}
                    />
                  </Campo>
                  <Campo label='Pedido mínimo (R$)' dica='0 = sem mínimo'>
                    <Input
                      type='number'
                      min={0}
                      step='0.01'
                      value={form.pedidoMinimo}
                      onChange={e => set('pedidoMinimo', e.target.value)}
                    />
                  </Campo>
                </div>
                <Campo
                  label='Observações internas'
                  dica='Só o admin vê. Condições comerciais, contactos alternativos, etc.'
                >
                  <Textarea
                    rows={5}
                    value={form.observacoes}
                    onChange={e => set('observacoes', e.target.value)}
                  />
                </Campo>

                {modal.modo === 'editar' && (
                  <div className='border border-gray-200 rounded-lg p-4 bg-gray-50'>
                    <p className='text-sm font-semibold text-gray-800 mb-1'>Estado do fornecedor</p>
                    <p className='text-xs text-gray-500 mb-3'>
                      {modal.dados.ativo
                        ? 'Ativo: aparece no portal e aceita pedidos.'
                        : 'Inativo: escondido do portal. Produtos e pedidos são mantidos.'}
                    </p>
                    <Botao
                      variante={modal.dados.ativo ? 'secundario' : 'primario'}
                      tamanho='sm'
                      loading={acaoEmCurso === modal.dados._id}
                      onClick={() =>
                        executar(
                          modal.dados,
                          'PATCH',
                          { acao: modal.dados.ativo ? 'desativar' : 'ativar' },
                          modal.dados.ativo ? `Desativar "${modal.dados.nome}"?` : null,
                        )
                      }
                    >
                      {modal.dados.ativo ? 'Desativar fornecedor' : 'Ativar fornecedor'}
                    </Botao>
                  </div>
                )}
              </>
            )}

            {/* submit invisível para Enter funcionar */}
            <button type='submit' className='hidden' />
          </form>
        </Modal>
      )}

      {/* ═══════════ MODAL APAGAR DEFINITIVAMENTE ═══════════ */}
      {apagando && (
        <ModalApagar
          titulo={`Apagar ${apagando.nome}`}
          palavra={apagando.codigo}
          loading={acaoEmCurso === apagando._id}
          onFechar={() => setApagando(null)}
          onConfirmar={confirmarApagar}
        >
          Serão apagados o fornecedor <strong>{apagando.nome}</strong>,{' '}
          <strong>{apagando.stats?.produtos || 0} produto(s)</strong> e{' '}
          <strong>{apagando.stats?.pedidos || 0} pedido(s)</strong> (incluindo o histórico
          financeiro desses pedidos). Se só quer escondê-lo do portal, use <em>Desativar</em>.
        </ModalApagar>
      )}
    </AdminShell>
  );
}

// ══════════════════════════════════════════════════════════════
// CARTÃO DO FORNECEDOR
// ══════════════════════════════════════════════════════════════
function CartaoFornecedor({ f, ocupado, onEditar, onToggleAtivo, onApagar, onVerProdutos }) {
  const s = f.stats || {};
  const semProdutos = (s.produtosAtivos || 0) === 0;
  return (
    <div
      className={`bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col ${f.ativo ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-75'}`}
    >
      <div className='h-1.5' style={{ background: f.cor || '#374151' }} />
      <div className='p-4 flex-1'>
        <div className='flex items-start gap-3'>
          <LogoFornecedor fornecedor={f} tamanho={48} />
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2 flex-wrap'>
              <h3 className='font-bold text-gray-900 truncate'>{f.nome}</h3>
              <span className='font-mono text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded'>
                {f.codigo}
              </span>
            </div>
            <p className='text-xs text-gray-500 truncate'>
              {f.especialidade || <span className='italic text-gray-400'>sem especialidade</span>}
            </p>
            <div className='mt-1.5 flex flex-wrap gap-1'>
              {f.ativo ? <Badge cor='green'>Ativo</Badge> : <Badge cor='gray'>Inativo</Badge>}
              {f.ativo && semProdutos && <Badge cor='orange'>Sem produtos ativos</Badge>}
              {(f.categoriasIsentasRoyalty || []).length > 0 && (
                <Badge cor='blue'>{f.categoriasIsentasRoyalty.length} isenta(s)</Badge>
              )}
            </div>
          </div>
        </div>

        <dl className='mt-4 grid grid-cols-3 gap-2 text-center'>
          <div className='bg-gray-50 rounded-lg py-2'>
            <dt className='text-[10px] uppercase text-gray-500'>Produtos</dt>
            <dd className='text-base font-bold text-gray-900 tabular-nums'>
              {s.produtosAtivos || 0}
              {s.produtos > s.produtosAtivos && (
                <span className='text-xs font-normal text-gray-400'>/{s.produtos}</span>
              )}
            </dd>
          </div>
          <div className='bg-gray-50 rounded-lg py-2'>
            <dt className='text-[10px] uppercase text-gray-500'>Pedidos</dt>
            <dd className='text-base font-bold text-gray-900 tabular-nums'>
              {s.pedidos || 0}
              {s.pedidosPendentes > 0 && (
                <span className='ml-1 text-xs font-semibold text-amber-600'>
                  ({s.pedidosPendentes})
                </span>
              )}
            </dd>
          </div>
          <div className='bg-gray-50 rounded-lg py-2'>
            <dt className='text-[10px] uppercase text-gray-500'>Volume</dt>
            <dd className='text-sm font-bold text-gray-900 tabular-nums'>
              {moeda(s.valorPedidos)}
            </dd>
          </div>
        </dl>

        <div className='mt-3 text-xs text-gray-500 space-y-0.5'>
          <p className='truncate'>
            <span className='text-gray-400'>Email:</span> {f.email}
          </p>
          <p className='truncate'>
            <span className='text-gray-400'>Categorias:</span> {(f.categorias || []).length} ·{' '}
            <span className='text-gray-400'>Último pedido:</span> {relativo(s.ultimoPedido)}
          </p>
        </div>
      </div>

      <div className='px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-2'>
        <Botao
          variante='primario'
          tamanho='sm'
          onClick={() => onEditar('dados')}
          disabled={ocupado}
        >
          Configurar
        </Botao>
        <Botao variante='secundario' tamanho='sm' onClick={onVerProdutos}>
          Produtos
        </Botao>
        <div className='ml-auto flex gap-1'>
          <Botao
            variante='fantasma'
            tamanho='sm'
            onClick={onToggleAtivo}
            loading={ocupado}
            title={f.ativo ? 'Desativar' : 'Ativar'}
          >
            {f.ativo ? 'Desativar' : 'Ativar'}
          </Botao>
          <Botao
            variante='fantasma'
            tamanho='sm'
            onClick={onApagar}
            className='text-red-600'
            title='Apagar definitivamente'
          >
            Apagar
          </Botao>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// UPLOAD DO LOGO (usa /api/admin/upload → Cloudinary)
// ══════════════════════════════════════════════════════════════
function UploadLogo({ valor, onChange, onErro }) {
  const inputRef = useRef(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async file => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return onErro('Selecione um ficheiro de imagem');
    if (file.size > 5 * 1024 * 1024) return onErro('Imagem demasiado grande (máx. 5 MB)');
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append('images', file);
      const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await r.json();
      if (!r.ok || !data.imageUrls?.[0]) throw new Error(data.message || 'Falha no upload');
      onChange(data.imageUrls[0]);
    } catch (e) {
      onErro(e.message);
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className='flex flex-col items-center gap-2'>
      <div className='w-28 h-28 rounded-full bg-gray-100 ring-1 ring-gray-200 overflow-hidden flex items-center justify-center'>
        {valor ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={valor} alt='Logo' className='w-full h-full object-cover' />
        ) : (
          <span className='text-xs text-gray-400 text-center px-2'>Sem logo</span>
        )}
      </div>
      <input
        ref={inputRef}
        type='file'
        accept='image/*'
        className='hidden'
        onChange={e => enviar(e.target.files?.[0])}
      />
      <div className='flex gap-1'>
        <Botao
          variante='secundario'
          tamanho='sm'
          loading={enviando}
          onClick={() => inputRef.current?.click()}
        >
          {valor ? 'Trocar' : 'Enviar'}
        </Botao>
        {valor && (
          <Botao variante='fantasma' tamanho='sm' onClick={() => onChange('')}>
            Remover
          </Botao>
        )}
      </div>
      <p className='text-[10px] text-gray-400 text-center'>PNG/JPG, quadrado, até 5 MB</p>
    </div>
  );
}
