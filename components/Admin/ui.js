// components/Admin/ui.js - COMPONENTES PARTILHADOS DA ÁREA ADMIN
// ===================================
// Cartões, KPIs, badges, modal, campos de formulário, tabela e formatadores.
// Tudo o que as páginas admin repetem vive aqui para o visual ser consistente.

import { useEffect, useState } from 'react';

// ══════════════════════════════════════════════════════════════
// FORMATADORES
// ══════════════════════════════════════════════════════════════
export const moeda = valor =>
  `R$ ${Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const dataCurta = d => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

export const dataHora = d =>
  d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export const relativo = d => {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.round(h / 24);
  if (dias < 30) return `há ${dias} d`;
  return dataCurta(d);
};

/** Tempo até uma data futura: "em 3 d", "em 5 h" */
export const emPrazo = d => {
  if (!d) return '—';
  const diff = new Date(d).getTime() - Date.now();
  if (diff <= 0) return 'já expirou';
  const h = Math.round(diff / 3600000);
  if (h < 1) return 'em menos de 1 h';
  if (h < 24) return `em ${h} h`;
  return `em ${Math.round(h / 24)} d`;
};

// ══════════════════════════════════════════════════════════════
// CARTÕES
// ══════════════════════════════════════════════════════════════
export const Card = ({ titulo, descricao, acoes, children, className = '', semPadding }) => (
  <section className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
    {(titulo || acoes) && (
      <header className='flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100'>
        <div>
          {titulo && <h2 className='text-sm font-semibold text-gray-900'>{titulo}</h2>}
          {descricao && <p className='text-xs text-gray-500 mt-0.5'>{descricao}</p>}
        </div>
        {acoes && <div className='flex items-center gap-2 shrink-0'>{acoes}</div>}
      </header>
    )}
    <div className={semPadding ? '' : 'p-5'}>{children}</div>
  </section>
);

export const Kpi = ({ rotulo, valor, detalhe, tom = 'neutro', onClick }) => {
  const tons = {
    neutro: 'text-gray-900',
    positivo: 'text-emerald-600',
    alerta: 'text-amber-600',
    perigo: 'text-red-600',
    info: 'text-blue-600',
  };
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-left w-full ${
        onClick ? 'hover:border-gray-300 hover:shadow transition' : ''
      }`}
    >
      <p className='text-xs font-medium text-gray-500 uppercase tracking-wide'>{rotulo}</p>
      <p className={`mt-1 text-xl sm:text-2xl font-bold tabular-nums ${tons[tom]}`}>{valor}</p>
      {detalhe && <p className='mt-1 text-xs text-gray-500'>{detalhe}</p>}
    </Tag>
  );
};

// ══════════════════════════════════════════════════════════════
// BADGE / STATUS
// ══════════════════════════════════════════════════════════════
export const Badge = ({ cor = 'gray', children, className = '' }) => {
  const cores = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    orange: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    red: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    blue: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    purple: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cores[cor]} ${className}`}
    >
      {children}
    </span>
  );
};

export const STATUS_PEDIDO = {
  pendente: { label: 'Pendente', cor: 'orange' },
  confirmado: { label: 'Confirmado', cor: 'blue' },
  enviado: { label: 'Enviado', cor: 'purple' },
  entregue: { label: 'Entregue', cor: 'green' },
};

export const BadgePedido = ({ status }) => {
  const s = STATUS_PEDIDO[status] || { label: status, cor: 'gray' };
  return <Badge cor={s.cor}>{s.label}</Badge>;
};

// ══════════════════════════════════════════════════════════════
// BOTÕES
// ══════════════════════════════════════════════════════════════
export const Botao = ({
  variante = 'primario',
  tamanho = 'md',
  loading,
  children,
  className = '',
  ...props
}) => {
  const variantes = {
    primario: 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm',
    secundario: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    perigo: 'bg-red-600 text-white hover:bg-red-700',
    fantasma: 'text-gray-600 hover:bg-gray-100',
    azul: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
  };
  const tamanhos = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  };
  return (
    <button
      type='button'
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${variantes[variante]} ${tamanhos[tamanho]} ${className}`}
    >
      {loading && (
        <span className='animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current'></span>
      )}
      {children}
    </button>
  );
};

// ══════════════════════════════════════════════════════════════
// FORMULÁRIO
// ══════════════════════════════════════════════════════════════
export const Campo = ({ label, obrigatorio, dica, className = '', children }) => (
  <div className={className}>
    <label className='block text-xs font-semibold text-gray-600 mb-1'>
      {label} {obrigatorio && <span className='text-red-500'>*</span>}
    </label>
    {children}
    {dica && <p className='text-[11px] text-gray-400 mt-1'>{dica}</p>}
  </div>
);

export const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500';

export const Input = props => (
  <input {...props} className={`${inputClass} ${props.className || ''}`} />
);
export const Select = props => (
  <select {...props} className={`${inputClass} ${props.className || ''}`} />
);
export const Textarea = props => (
  <textarea {...props} className={`${inputClass} ${props.className || ''}`} />
);

export const Alerta = ({ tipo = 'erro', children, className = '' }) => {
  if (!children) return null;
  const estilos = {
    erro: 'bg-red-50 border-red-200 text-red-700',
    sucesso: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    aviso: 'bg-amber-50 border-amber-200 text-amber-800',
  };
  return (
    <div className={`border px-4 py-3 rounded-lg text-sm ${estilos[tipo]} ${className}`}>
      {children}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════════════════════════
export const Modal = ({
  titulo,
  subtitulo,
  onFechar,
  largura = 'max-w-2xl',
  rodape,
  children,
  bloqueado,
}) => {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && !bloqueado && onFechar?.();
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [onFechar, bloqueado]);

  return (
    <div
      className='fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4'
      onClick={() => !bloqueado && onFechar?.()}
    >
      <div
        className={`bg-white w-full ${largura} max-h-[95vh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        <div className='px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3'>
          <div>
            <h2 className='text-base font-bold text-gray-900'>{titulo}</h2>
            {subtitulo && <p className='text-xs text-gray-500 mt-0.5'>{subtitulo}</p>}
          </div>
          <button
            type='button'
            onClick={onFechar}
            className='text-gray-400 hover:text-gray-600 text-2xl leading-none -mt-1'
          >
            ×
          </button>
        </div>
        <div className='px-5 py-5 overflow-y-auto flex-1'>{children}</div>
        {rodape && (
          <div className='px-5 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl sm:rounded-b-xl flex justify-end gap-3'>
            {rodape}
          </div>
        )}
      </div>
    </div>
  );
};

// Modal de exclusão definitiva: obriga a escrever a palavra de confirmação
export const ModalApagar = ({ titulo, palavra, loading, onFechar, onConfirmar, children }) => {
  const [texto, setTexto] = useState('');
  const ok = texto.trim().toLowerCase() === String(palavra).toLowerCase();
  return (
    <Modal
      titulo={titulo}
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
            onClick={() => onConfirmar(texto.trim())}
            loading={loading}
            disabled={!ok}
          >
            Apagar definitivamente
          </Botao>
        </>
      }
    >
      <div className='space-y-4'>
        <Alerta tipo='erro'>
          <strong>Esta ação não pode ser desfeita.</strong> {children}
        </Alerta>
        <Campo label={`Para confirmar, escreva ${palavra}`}>
          <Input
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder={String(palavra)}
            className='font-mono'
            autoFocus
            onKeyDown={e => e.key === 'Enter' && ok && !loading && onConfirmar(texto.trim())}
          />
        </Campo>
      </div>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════
// TABELA / ESTADOS
// ══════════════════════════════════════════════════════════════
export const Tabela = ({ colunas, children, vazio }) => (
  <div className='overflow-x-auto'>
    <table className='min-w-full text-sm'>
      <thead className='bg-gray-50 text-gray-500 uppercase text-[11px] tracking-wide'>
        <tr>
          {colunas.map((c, i) => (
            <th
              key={i}
              className={`px-4 py-3 font-semibold ${c.alinhar === 'right' ? 'text-right' : c.alinhar === 'center' ? 'text-center' : 'text-left'} ${c.className || ''}`}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className='divide-y divide-gray-100'>
        {vazio ? (
          <tr>
            <td colSpan={colunas.length} className='px-4 py-12 text-center text-gray-400 text-sm'>
              {vazio}
            </td>
          </tr>
        ) : (
          children
        )}
      </tbody>
    </table>
  </div>
);

export const Vazio = ({ titulo, descricao, acao }) => (
  <div className='text-center py-12 px-4'>
    <div className='mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3'>
      <svg
        className='w-6 h-6'
        fill='none'
        stroke='currentColor'
        strokeWidth={1.8}
        viewBox='0 0 24 24'
      >
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          d='M20 13V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6m16 0v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4m16 0h-5l-1.5 2h-3L9 13H4'
        />
      </svg>
    </div>
    <p className='text-sm font-semibold text-gray-700'>{titulo}</p>
    {descricao && <p className='text-xs text-gray-500 mt-1 max-w-sm mx-auto'>{descricao}</p>}
    {acao && <div className='mt-4'>{acao}</div>}
  </div>
);

export const Carregando = ({ altura = 'py-24' }) => (
  <div className={`flex items-center justify-center ${altura}`}>
    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800'></div>
  </div>
);

// Menu de ações (dropdown simples)
export const MenuAcoes = ({ aberto, onToggle, children, rotulo = 'Ações' }) => (
  <div className='relative inline-block text-left' onClick={e => e.stopPropagation()}>
    <Botao variante='secundario' tamanho='sm' onClick={onToggle}>
      {rotulo} <span className='text-gray-400'>▾</span>
    </Botao>
    {aberto && (
      <div className='absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-30 overflow-hidden'>
        {children}
      </div>
    )}
  </div>
);

export const ItemMenu = ({ onClick, desc, perigo, children }) => (
  <button
    type='button'
    onClick={onClick}
    className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 ${perigo ? 'text-red-600' : 'text-gray-800'}`}
  >
    <div className='text-sm font-medium'>{children}</div>
    {desc && <div className='text-xs text-gray-400'>{desc}</div>}
  </button>
);

// Avatar/logo circular do fornecedor com fallback para as iniciais
export const LogoFornecedor = ({ fornecedor, tamanho = 40 }) => {
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
      width={tamanho}
      height={tamanho}
      className='rounded-full object-cover bg-white ring-1 ring-gray-200 shrink-0'
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
};
