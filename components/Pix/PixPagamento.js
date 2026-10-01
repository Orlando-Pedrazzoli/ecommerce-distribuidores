// components/Pix/PixPagamento.js - PAGAR POR PIX E ANEXAR O COMPROVANTE
// ===================================
// Bloco reutilizado no checkout (sinal ao fornecedor), em Meus Pedidos
// (novo comprovante depois de uma rejeição) e em Pagamentos (royalties).
// Mostra o valor, o "Pix Copia e Cola" (principal no celular), o QR Code
// (principal no computador) e o envio do comprovante.
//
// Uso:
//   <PixPagamento
//     cobranca={{ valor, payload, qrSvg, chave, tipoChaveRotulo, titular }}
//     finalidade='sinal' | 'royalties'
//     comprovante={{ id, nome } | null}
//     onComprovante={c => ...}
//   />

import { useRef, useState } from 'react';
import { formatarMoeda } from '../../lib/financeiro';

const TAMANHO_MAXIMO = 4 * 1024 * 1024;
const LADO_MAXIMO = 1600; // px - suficiente para ler um comprovante

// Reduz fotos/prints grandes antes de enviar (dados móveis e limite de upload)
const comprimirImagem = file =>
  new Promise(resolve => {
    if (!file.type.startsWith('image/')) return resolve(file);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const escala = Math.min(1, LADO_MAXIMO / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          blob => {
            URL.revokeObjectURL(url);
            const formatoAceite = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
            if (!blob || (formatoAceite && blob.size >= file.size)) return resolve(file);
            const nome = `${(file.name || 'comprovante').replace(/\.[^.]+$/, '')}.jpg`;
            resolve(new File([blob], nome, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          0.82,
        );
      } catch {
        URL.revokeObjectURL(url);
        resolve(file);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });

const copiarTexto = async texto => {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Navegadores antigos / contexto sem permissão
    try {
      const area = document.createElement('textarea');
      area.value = texto;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
};

export const LinkComprovante = ({ id, children = 'Ver comprovante', className = '' }) =>
  id ? (
    <a
      href={`/api/comprovantes/${id}`}
      target='_blank'
      rel='noopener noreferrer'
      className={`inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 underline ${className}`}
    >
      <svg className='w-4 h-4' fill='none' stroke='currentColor' strokeWidth={2} viewBox='0 0 24 24'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          d='M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13'
        />
      </svg>
      {children}
    </a>
  ) : null;

export default function PixPagamento({
  cobranca,
  finalidade,
  comprovante,
  onComprovante,
  rotuloValor = 'Valor do Pix',
  desativado = false,
}) {
  const inputRef = useRef(null);
  const [copiado, setCopiado] = useState(false);
  const [mostrarQr, setMostrarQr] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  if (!cobranca) return null;

  const copiar = async () => {
    const ok = await copiarTexto(cobranca.payload);
    if (ok) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } else {
      setErro('Não foi possível copiar. Toque no código e copie manualmente.');
    }
  };

  const enviar = async arquivo => {
    if (!arquivo) return;
    setErro('');

    const ehImagem = arquivo.type.startsWith('image/');
    if (!ehImagem && arquivo.type !== 'application/pdf') {
      setErro('Envie o comprovante como imagem (print ou foto) ou PDF.');
      return;
    }

    setEnviando(true);
    try {
      const pronto = await comprimirImagem(arquivo);
      if (pronto.size > TAMANHO_MAXIMO) {
        throw new Error('Arquivo muito grande (máximo 4 MB).');
      }

      const fd = new FormData();
      fd.append('finalidade', finalidade);
      fd.append('arquivo', pronto, pronto.name || 'comprovante');

      const r = await fetch('/api/comprovantes', { method: 'POST', body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message || 'Não foi possível enviar o comprovante.');

      onComprovante?.({ id: data.comprovante.id, nome: arquivo.name || data.comprovante.nome });
    } catch (e) {
      setErro(e.message || 'Não foi possível enviar o comprovante.');
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const qrSrc = cobranca.qrSvg
    ? `data:image/svg+xml;utf8,${encodeURIComponent(cobranca.qrSvg)}`
    : null;

  return (
    <div className='space-y-3'>
      {/* ── 1. PAGAR ── */}
      <div className='rounded-xl border border-gray-200 bg-white overflow-hidden'>
        <div className='flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200'>
          <span className='text-sm text-gray-600'>{rotuloValor}</span>
          <span className='text-xl font-bold text-gray-900 tabular-nums'>
            {formatarMoeda(cobranca.valor)}
          </span>
        </div>

        <div className='p-4 sm:flex sm:gap-4'>
          {/* QR: sempre visível no computador, opcional no celular */}
          {qrSrc && (
            <div className={`${mostrarQr ? 'block' : 'hidden'} sm:block shrink-0 mb-3 sm:mb-0`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt='QR Code do Pix'
                width={176}
                height={176}
                className='w-44 h-44 mx-auto rounded-lg border border-gray-200 bg-white'
              />
            </div>
          )}

          <div className='flex-1 min-w-0 space-y-3'>
            <button
              type='button'
              onClick={copiar}
              disabled={desativado}
              className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${
                copiado
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              {copiado ? '✓ Código copiado' : 'Copiar código Pix'}
            </button>

            <div
              className='text-[11px] leading-snug font-mono text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 break-all select-all max-h-16 overflow-y-auto'
              aria-label='Código Pix Copia e Cola'
            >
              {cobranca.payload}
            </div>

            {qrSrc && (
              <button
                type='button'
                onClick={() => setMostrarQr(v => !v)}
                className='sm:hidden text-xs text-blue-600 underline'
              >
                {mostrarQr ? 'Esconder QR Code' : 'Pagar de outro aparelho? Mostrar QR Code'}
              </button>
            )}

            <dl className='text-xs text-gray-600 space-y-0.5'>
              <div className='flex gap-1'>
                <dt className='text-gray-400 shrink-0'>Recebedor:</dt>
                <dd className='font-medium text-gray-800 truncate'>{cobranca.titular}</dd>
              </div>
              <div className='flex gap-1'>
                <dt className='text-gray-400 shrink-0'>
                  Chave ({cobranca.tipoChaveRotulo || 'Pix'}):
                </dt>
                <dd className='font-medium text-gray-800 break-all'>{cobranca.chave}</dd>
              </div>
            </dl>
          </div>
        </div>

        <ol className='px-4 pb-4 text-xs text-gray-500 space-y-1 list-decimal list-inside'>
          <li>
            No app do seu banco, escolha <strong>Pix Copia e Cola</strong> e cole o código (ou leia
            o QR Code).
          </li>
          <li>Confira o recebedor e o valor e conclua o pagamento.</li>
          <li>Guarde o comprovante e anexe aqui embaixo.</li>
        </ol>
      </div>

      {/* ── 2. COMPROVANTE ── */}
      <input
        ref={inputRef}
        type='file'
        accept='image/*,application/pdf'
        className='hidden'
        onChange={e => enviar(e.target.files?.[0])}
      />

      {comprovante ? (
        <div className='rounded-xl border-2 border-green-300 bg-green-50 px-4 py-3 flex items-center gap-3'>
          <span className='shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold'>
            ✓
          </span>
          <div className='min-w-0 flex-1'>
            <p className='text-sm font-semibold text-green-900'>Comprovante anexado</p>
            <p className='text-xs text-green-800 truncate'>{comprovante.nome}</p>
          </div>
          <div className='flex flex-col items-end gap-1 text-xs shrink-0'>
            <LinkComprovante id={comprovante.id}>Ver</LinkComprovante>
            <button
              type='button'
              onClick={() => inputRef.current?.click()}
              disabled={enviando || desativado}
              className='text-gray-600 underline disabled:opacity-50'
            >
              {enviando ? 'Enviando…' : 'Trocar'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type='button'
          onClick={() => inputRef.current?.click()}
          disabled={enviando || desativado}
          className='w-full rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-4 text-center hover:border-blue-400 hover:bg-blue-50 transition disabled:opacity-60'
        >
          {enviando ? (
            <span className='inline-flex items-center gap-2 text-sm text-gray-600'>
              <span className='w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin'></span>
              Enviando comprovante…
            </span>
          ) : (
            <>
              <span className='block text-sm font-semibold text-gray-800'>
                Anexar comprovante do Pix
              </span>
              <span className='block text-xs text-gray-500 mt-0.5'>
                Print, foto ou PDF do comprovante (até 4 MB)
              </span>
            </>
          )}
        </button>
      )}

      {erro && (
        <p className='text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2'>
          {erro}
        </p>
      )}
    </div>
  );
}
