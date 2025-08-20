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
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/dashboard');
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

  const testarCredencial = (username, password) => {
    setFormData({ username, password });
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4'>
      <div className='bg-white p-8 rounded-lg shadow-xl w-full max-w-md'>
        <div className='text-center mb-6'>
          <h1 className='text-3xl font-bold text-gray-800 mb-2'>
            📦 E-commerce
          </h1>
          <h2 className='text-xl font-semibold text-gray-600'>
            Login Distribuidores
          </h2>
        </div>

        {error && (
          <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4'>
            <div className='flex items-center'>
              <span className='mr-2'>⚠️</span>
              {error}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label className='block text-gray-700 text-sm font-bold mb-2'>
              Email ou Usuário
            </label>
            <input
              type='text'
              className='w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500'
              value={formData.username}
              onChange={e =>
                setFormData({ ...formData, username: e.target.value })
              }
              placeholder='seu@email.com ou admin'
              required
            />
          </div>

          <div>
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
              placeholder='••••••••'
              required
            />
          </div>

          <button
            type='submit'
            disabled={loading}
            className='w-full bg-blue-500 text-white py-3 px-4 rounded hover:bg-blue-600 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center'
          >
            {loading ? (
              <>
                <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2'></div>
                Entrando...
              </>
            ) : (
              <>
                <span className='mr-2'>🔑</span>
                Entrar
              </>
            )}
          </button>
        </form>

        {/* Credenciais de teste */}
        <div className='mt-6 p-4 bg-blue-50 rounded-lg'>
          <h3 className='text-sm font-semibold text-blue-800 mb-3 text-center'>
            🧪 Credenciais de Teste (.env):
          </h3>

          <div className='space-y-2'>
            <button
              onClick={() => testarCredencial('admin', 'admin123')}
              className='w-full bg-red-500 text-white py-2 px-4 rounded text-sm hover:bg-red-600 transition'
            >
              🔑 Admin: admin / admin123
            </button>

            <button
              onClick={() =>
                testarCredencial('joao@distribuidora.com', '123456')
              }
              className='w-full bg-green-500 text-white py-2 px-4 rounded text-sm hover:bg-green-600 transition'
            >
              👤 João: joao@distribuidora.com / 123456
            </button>

            <button
              onClick={() =>
                testarCredencial('maria@distribuidora.com', '123456')
              }
              className='w-full bg-green-500 text-white py-2 px-4 rounded text-sm hover:bg-green-600 transition'
            >
              👤 Maria: maria@distribuidora.com / 123456
            </button>

            <button
              onClick={() =>
                testarCredencial('pedro@distribuidora.com', '123456')
              }
              className='w-full bg-green-500 text-white py-2 px-4 rounded text-sm hover:bg-green-600 transition'
            >
              👤 Pedro: pedro@distribuidora.com / 123456
            </button>
          </div>
        </div>

        {/* Links úteis */}
        <div className='mt-4 text-center'>
          <div className='flex justify-center space-x-4 text-sm'>
            <a
              href='/seed'
              className='text-blue-500 hover:text-blue-700 flex items-center'
            >
              <span className='mr-1'>🌱</span>
              Seed (Produtos)
            </a>
            <a
              href='/test'
              className='text-green-500 hover:text-green-700 flex items-center'
            >
              <span className='mr-1'>🧪</span>
              Teste
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
