// PAGES/INDEX.JS - LOGIN COM REDIRECIONAMENTO CORRETO
// ===================================

import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';


export default function Login() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // ══════════════════════════════════════════════════════════════
        // CORREÇÃO: Redirecionar baseado no tipo de usuário
        // ══════════════════════════════════════════════════════════════
        if (data.user?.tipo === 'admin') {
          router.push('/admin');  // Admin vai para painel administrativo
        } else {
          router.push('/dashboard');  // Distribuidor vai para dashboard
        }
      } else {
        setError(data.message || 'Erro ao fazer login');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

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
            {/* Logo */}
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
              Acesso para Distribuidores
            </h2>
          </div>

          {error && (
            <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6'>
              <div className='flex items-center'>
                <svg
                  className='w-5 h-5 mr-2'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                    clipRule='evenodd'
                  />
                </svg>
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className='space-y-6'>
            <div>
              <label className='block text-gray-700 text-sm font-semibold mb-2'>
                Usuário
              </label>
              <input
                type='text'
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200'
                value={formData.username}
                onChange={e =>
                  setFormData({ ...formData, username: e.target.value })
                }
                placeholder='Digite seu usuário'
                required
              />
            </div>

            <div>
              <label className='block text-gray-700 text-sm font-semibold mb-2'>
                Senha
              </label>
              <input
                type='password'
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200'
                value={formData.password}
                onChange={e =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder='Digite sua senha'
                required
              />
            </div>

            <button
              type='submit'
              disabled={loading}
              className='w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold shadow-lg'
            >
              {loading ? (
                <>
                  <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2'></div>
                  Entrando...
                </>
              ) : (
                <>
                  <svg
                    className='w-5 h-5 mr-2'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1'
                    />
                  </svg>
                  Entrar
                </>
              )}
            </button>
          </form>

          {/* Informações de suporte */}
          <div className='mt-8 p-4 bg-gray-50 rounded-lg'>
            <div className='text-center'>
              <h4 className='text-sm font-semibold text-gray-700 mb-2'>
                Precisa de ajuda?
              </h4>
              <p className='text-xs text-gray-600 mb-3'>
                Entre em contato com o administrador do sistema para obter suas
                credenciais de acesso.
              </p>
            
            </div>
          </div>
        </div>
        </div>
    </>
  );
}