// pages/esqueci-senha.js - SOLICITAR RECUPERAÇÃO DE SENHA
// ===================================

import { useState } from 'react';
import Link from 'next/link';
import AuthShell, { Alerta, BotaoPrimario } from '../components/AuthShell';

export default function EsqueciSenha() {
  const [identificador, setIdentificador] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identificador: identificador.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        setEnviado(true);
      } else {
        setError(data.message || 'Não foi possível processar o pedido');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      titulo='Recuperar senha'
      subtitulo={
        enviado
          ? undefined
          : 'Informe seu usuário ou email e enviaremos um link para criar uma nova senha.'
      }
    >
      {enviado ? (
        <div className='text-center'>
          <div className='mx-auto mb-4 w-14 h-14 rounded-full bg-green-50 flex items-center justify-center'>
            <svg className='w-7 h-7 text-green-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
            </svg>
          </div>
          <h3 className='text-lg font-semibold text-gray-800 mb-2'>Verifique seu email</h3>
          <p className='text-sm text-gray-600 mb-6'>
            Se a conta existir, você receberá em instantes um email com o link para
            redefinir a senha. O link é válido por 30 minutos.
          </p>
          <p className='text-xs text-gray-400 mb-6'>
            Não recebeu? Confira a pasta de spam ou tente novamente em alguns minutos.
          </p>
          <Link href='/' className='text-blue-600 hover:underline text-sm font-medium'>
            ← Voltar para o login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className='space-y-6'>
          <Alerta tipo='erro'>{error}</Alerta>

          <div>
            <label htmlFor='identificador' className='block text-gray-700 text-sm font-semibold mb-2'>
              Usuário ou email
            </label>
            <input
              id='identificador'
              type='text'
              autoComplete='username'
              autoCapitalize='none'
              value={identificador}
              onChange={e => setIdentificador(e.target.value)}
              placeholder='seu.usuario ou email@exemplo.com'
              required
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200'
            />
          </div>

          <BotaoPrimario loading={loading}>Enviar link de recuperação</BotaoPrimario>

          <div className='text-center'>
            <Link href='/' className='text-sm text-gray-500 hover:text-gray-700 hover:underline'>
              ← Voltar para o login
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
