// pages/index.js - LOGIN EM 2 PASSOS (SENHA + CÓDIGO OTP POR EMAIL)
// ===================================

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';

const OTP_LENGTH = 6;

export default function Login() {
  const router = useRouter();

  // 'senha' | 'otp'
  const [etapa, setEtapa] = useState('senha');
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // OTP
  const [emailMascarado, setEmailMascarado] = useState('');
  const [digitos, setDigitos] = useState(Array(OTP_LENGTH).fill(''));
  const [lembrarDispositivo, setLembrarDispositivo] = useState(true);
  const [reenvioEm, setReenvioEm] = useState(0);
  const inputsRef = useRef([]);

  // Mensagem vinda de outras páginas (ex.: senha redefinida)
  useEffect(() => {
    if (router.query.msg === 'senha-redefinida') {
      setInfo('Senha definida com sucesso. Faça login com a nova senha.');
    } else if (router.query.msg === 'sessao-expirada') {
      setInfo('Sua sessão expirou. Faça login novamente.');
    }
  }, [router.query.msg]);

  // Contador para reenvio do código
  useEffect(() => {
    if (reenvioEm <= 0) return;
    const t = setTimeout(() => setReenvioEm(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [reenvioEm]);

  const redirecionar = user => {
    router.push(user?.tipo === 'admin' ? '/admin' : '/dashboard');
  };

  // ══════════════════════════════════════════════════════════════
  // PASSO 1: usuário + senha
  // ══════════════════════════════════════════════════════════════
  const handleSubmitSenha = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username.trim(),
          password: formData.password,
        }),
      });
      const data = await response.json();

      if (!data.success) {
        setError(data.message || 'Erro ao fazer login');
        return;
      }

      if (data.otpRequired) {
        setEmailMascarado(data.emailMascarado || '');
        setEtapa('otp');
        setDigitos(Array(OTP_LENGTH).fill(''));
        setReenvioEm(60);
        setTimeout(() => inputsRef.current[0]?.focus(), 50);
      } else {
        redirecionar(data.user);
      }
    } catch (err) {
      console.error('Erro no login:', err);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // PASSO 2: código OTP
  // ══════════════════════════════════════════════════════════════
  const codigo = digitos.join('');

  const enviarOtp = async codigoFinal => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: codigoFinal, lembrarDispositivo }),
      });
      const data = await response.json();

      if (data.success) {
        redirecionar(data.user);
        return;
      }

      setError(data.message || 'Código inválido');
      if (data.reiniciar) {
        voltarParaSenha();
      } else {
        setDigitos(Array(OTP_LENGTH).fill(''));
        inputsRef.current[0]?.focus();
      }
    } catch (err) {
      console.error('Erro ao verificar código:', err);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOtp = e => {
    e.preventDefault();
    if (codigo.length === OTP_LENGTH) enviarOtp(codigo);
  };

  const handleDigito = (index, valor) => {
    const apenasNumeros = valor.replace(/\D/g, '');
    if (!apenasNumeros) {
      const novo = [...digitos];
      novo[index] = '';
      setDigitos(novo);
      return;
    }

    // Colagem de vários dígitos
    if (apenasNumeros.length > 1) {
      const novo = Array(OTP_LENGTH).fill('');
      apenasNumeros
        .slice(0, OTP_LENGTH)
        .split('')
        .forEach((d, i) => (novo[i] = d));
      setDigitos(novo);
      const ultimo = Math.min(apenasNumeros.length, OTP_LENGTH) - 1;
      inputsRef.current[ultimo]?.focus();
      if (novo.join('').length === OTP_LENGTH) enviarOtp(novo.join(''));
      return;
    }

    const novo = [...digitos];
    novo[index] = apenasNumeros;
    setDigitos(novo);
    if (index < OTP_LENGTH - 1) inputsRef.current[index + 1]?.focus();
    if (novo.join('').length === OTP_LENGTH) enviarOtp(novo.join(''));
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digitos[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputsRef.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  };

  const reenviarCodigo = async () => {
    if (reenvioEm > 0 || loading) return;
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const response = await fetch('/api/auth/resend-otp', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setInfo('Novo código enviado.');
        setDigitos(Array(OTP_LENGTH).fill(''));
        setReenvioEm(60);
        inputsRef.current[0]?.focus();
      } else {
        setError(data.message || 'Não foi possível reenviar');
        if (data.retryAfter) setReenvioEm(data.retryAfter);
        if (data.reiniciar) voltarParaSenha();
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const voltarParaSenha = () => {
    setEtapa('senha');
    setDigitos(Array(OTP_LENGTH).fill(''));
    setFormData(f => ({ ...f, password: '' }));
    setReenvioEm(0);
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <>
      <Head>
        <title>Login - Elite Surfing</title>
        <meta
          name='description'
          content='Acesse sua conta no sistema de distribuidores Elite Surfing'
        />
      </Head>

      <div className='min-h-screen bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center p-4'>
        <div className='bg-white p-8 rounded-xl shadow-2xl w-full max-w-md'>
          <div className='text-center mb-8'>
            <div className='flex justify-center mb-4'>
              <Image
                src='/logo-dark.png'
                alt='Elite Surfing Logo'
                width={240}
                height={60}
                className='h-12 w-auto object-contain'
                priority
              />
            </div>
            <h2 className='text-xl font-semibold text-gray-600'>
              {etapa === 'senha' ? 'Acesso para Distribuidores' : 'Verificação em duas etapas'}
            </h2>
          </div>

          {error && (
            <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-2 text-sm'>
              <svg className='w-5 h-5 flex-shrink-0' fill='currentColor' viewBox='0 0 20 20'>
                <path
                  fillRule='evenodd'
                  d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                  clipRule='evenodd'
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {info && (
            <div className='bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6 text-sm'>
              {info}
            </div>
          )}

          {/* ═══════════ PASSO 1: SENHA ═══════════ */}
          {etapa === 'senha' && (
            <form onSubmit={handleSubmitSenha} className='space-y-6'>
              <div>
                <label htmlFor='username' className='block text-gray-700 text-sm font-semibold mb-2'>
                  Usuário
                </label>
                <input
                  id='username'
                  type='text'
                  autoComplete='username'
                  autoCapitalize='none'
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200'
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  placeholder='Digite seu usuário'
                  required
                />
              </div>

              <div>
                <div className='flex items-center justify-between mb-2'>
                  <label htmlFor='password' className='block text-gray-700 text-sm font-semibold'>
                    Senha
                  </label>
                  <Link
                    href='/esqueci-senha'
                    className='text-sm text-blue-600 hover:text-blue-800 hover:underline'
                  >
                    Esqueci minha senha
                  </Link>
                </div>
                <div className='relative'>
                  <input
                    id='password'
                    type={mostrarSenha ? 'text' : 'password'}
                    autoComplete='current-password'
                    className='w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200'
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder='Digite sua senha'
                    required
                  />
                  <button
                    type='button'
                    onClick={() => setMostrarSenha(s => !s)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    tabIndex={-1}
                  >
                    {mostrarSenha ? (
                      <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' />
                      </svg>
                    ) : (
                      <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type='submit'
                disabled={loading}
                className='w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold shadow-lg'
              >
                {loading ? (
                  <>
                    <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2'></div>
                    Verificando...
                  </>
                ) : (
                  <>
                    <svg className='w-5 h-5 mr-2' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1' />
                    </svg>
                    Entrar
                  </>
                )}
              </button>
            </form>
          )}

          {/* ═══════════ PASSO 2: OTP ═══════════ */}
          {etapa === 'otp' && (
            <form onSubmit={handleSubmitOtp} className='space-y-6'>
              <div className='text-center text-sm text-gray-600'>
                <div className='mx-auto mb-3 w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center'>
                  <svg className='w-6 h-6 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
                  </svg>
                </div>
                Enviamos um código de 6 dígitos para
                <div className='font-semibold text-gray-800 mt-1'>{emailMascarado || 'seu email'}</div>
                <div className='text-xs text-gray-400 mt-1'>O código expira em 10 minutos.</div>
              </div>

              <div className='flex justify-center gap-2' onPaste={e => {
                e.preventDefault();
                handleDigito(0, e.clipboardData.getData('text'));
              }}>
                {digitos.map((d, i) => (
                  <input
                    key={i}
                    ref={el => (inputsRef.current[i] = el)}
                    type='text'
                    inputMode='numeric'
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={OTP_LENGTH}
                    value={d}
                    onChange={e => handleDigito(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    disabled={loading}
                    className='w-11 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100'
                    aria-label={`Dígito ${i + 1}`}
                  />
                ))}
              </div>

              <label className='flex items-start gap-3 text-sm text-gray-600 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={lembrarDispositivo}
                  onChange={e => setLembrarDispositivo(e.target.checked)}
                  className='mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                />
                <span>
                  Confiar neste dispositivo por 30 dias
                  <span className='block text-xs text-gray-400'>
                    Não marque em computadores compartilhados.
                  </span>
                </span>
              </label>

              <button
                type='submit'
                disabled={loading || codigo.length !== OTP_LENGTH}
                className='w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold shadow-lg'
              >
                {loading ? (
                  <>
                    <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2'></div>
                    Verificando...
                  </>
                ) : (
                  'Confirmar código'
                )}
              </button>

              <div className='flex items-center justify-between text-sm'>
                <button
                  type='button'
                  onClick={voltarParaSenha}
                  className='text-gray-500 hover:text-gray-700 hover:underline'
                >
                  ← Voltar
                </button>
                <button
                  type='button'
                  onClick={reenviarCodigo}
                  disabled={reenvioEm > 0 || loading}
                  className='text-blue-600 hover:text-blue-800 hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed'
                >
                  {reenvioEm > 0 ? `Reenviar código (${reenvioEm}s)` : 'Reenviar código'}
                </button>
              </div>
            </form>
          )}

          {/* Informações de suporte */}
          <div className='mt-8 p-4 bg-gray-50 rounded-lg'>
            <div className='text-center'>
              <h4 className='text-sm font-semibold text-gray-700 mb-2'>Precisa de ajuda?</h4>
              <p className='text-xs text-gray-600'>
                {etapa === 'senha'
                  ? 'Entre em contato com o administrador do sistema para obter suas credenciais de acesso.'
                  : 'Não recebeu o email? Verifique a pasta de spam ou aguarde para reenviar o código.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
