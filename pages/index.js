// 18. PAGES/INDEX.JS (LOGIN)
// ===================================

import { useState } from 'react';
import { useRouter } from 'next/router';

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
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/dashboard');
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center'>
      <div className='bg-white p-8 rounded-lg shadow-xl w-full max-w-md'>
        <h2 className='text-2xl font-bold text-center text-gray-800 mb-6'>
          Login - Distribuidores
        </h2>

        {error && (
          <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4'>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className='mb-4'>
            <label className='block text-gray-700 text-sm font-bold mb-2'>
              Usuário
            </label>
            <input
              type='text'
              className='w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500'
              value={formData.username}
              onChange={e =>
                setFormData({ ...formData, username: e.target.value })
              }
              required
            />
          </div>

          <div className='mb-6'>
            <label className='block text-gray-700 text-sm font-bold mb-2'>
              Senha
            </label>
            <input
              type='password'
              className='w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500'
              value={formData.password}
              onChange={e =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
          </div>

          <button
            type='submit'
            disabled={loading}
            className='w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition duration-200 disabled:opacity-50'
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
