// PAGES/INDEX.JS - LOGIN COM REDIRECIONAMENTO CORRETO
// ===================================

import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import WhatsAppButton from '../components/WhatsAppButton';

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
              <div className='flex items-center justify-center gap-2 text-green-600'>
                <svg
                  className='w-4 h-4'
                  fill='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z' />
                </svg>
                <span className='text-sm font-medium'>
                  Ou clique no WhatsApp ao lado →
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Botão do WhatsApp */}
        <WhatsAppButton />
      </div>
    </>
  );
}