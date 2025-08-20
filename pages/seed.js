// PAGES/SEED.JS - CORRIGIDO
// ===================================

import { useState } from 'react';

export default function SeedPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const executarSeed = async () => {
    if (
      !confirm(
        '🌱 Isso vai LIMPAR todos os dados existentes e criar novos dados iniciais.\n\n⚠️ ATENÇÃO: Todos os fornecedores, produtos e usuários atuais serão removidos!\n\nContinuar?'
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('📥 Resposta do seed:', data);

      if (response.ok) {
        setResult(data);
      } else {
        throw new Error(data.message || 'Erro ao executar seed');
      }
    } catch (err) {
      console.error('💥 Erro no seed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-100 py-12'>
      <div className='max-w-2xl mx-auto px-4'>
        <div className='bg-white rounded-lg shadow-md p-8'>
          <div className='text-center mb-8'>
            <h1 className='text-3xl font-bold text-gray-800 mb-4'>
              🌱 Inicializar Sistema
            </h1>
            <p className='text-gray-600'>
              Crie os dados iniciais para começar a usar o sistema
            </p>
          </div>

          <div className='bg-blue-50 border-l-4 border-blue-400 p-4 mb-6'>
            <div className='flex'>
              <div className='flex-shrink-0'>
                <span className='text-blue-400 text-xl'>ℹ️</span>
              </div>
              <div className='ml-3'>
                <h3 className='text-sm font-medium text-blue-800'>
                  O que será criado:
                </h3>
                <div className='mt-2 text-sm text-blue-700'>
                  <ul className='list-disc pl-5 space-y-1'>
                    <li>
                      <strong>3 Fornecedores:</strong> Vitor (A), Mauricio (B),
                      Rodrigo (C)
                    </li>
                    <li>
                      <strong>Produtos de exemplo</strong> para cada fornecedor
                    </li>
                    <li>
                      <strong>3 Distribuidores</strong> para teste de login
                    </li>
                    <li>
                      <strong>1 Admin</strong> adicional no banco de dados
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className='bg-red-50 border-l-4 border-red-400 p-4 mb-6'>
            <div className='flex'>
              <div className='flex-shrink-0'>
                <span className='text-red-400 text-xl'>⚠️</span>
              </div>
              <div className='ml-3'>
                <h3 className='text-sm font-medium text-red-800'>ATENÇÃO:</h3>
                <div className='mt-2 text-sm text-red-700'>
                  <p>
                    Esta operação irá <strong>LIMPAR TODOS OS DADOS</strong>{' '}
                    existentes (fornecedores, produtos, usuários) e criar novos
                    dados de exemplo.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className='text-center mb-8'>
            <button
              onClick={executarSeed}
              disabled={loading}
              className='bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-3 px-8 rounded-lg transition duration-200 flex items-center mx-auto'
            >
              {loading ? (
                <>
                  <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3'></div>
                  Criando dados...
                </>
              ) : (
                <>
                  <span className='mr-3'>🌱</span>
                  Inicializar Sistema
                </>
              )}
            </button>
          </div>

          {/* Resultado de Sucesso */}
          {result && (
            <div className='bg-green-50 border border-green-200 rounded-lg p-4 mb-6'>
              <h3 className='text-lg font-semibold text-green-800 mb-3 flex items-center'>
                <span className='mr-2'>✅</span>
                Sistema inicializado com sucesso!
              </h3>

              <div className='text-sm text-green-700 mb-4'>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
                  <div className='bg-white p-3 rounded border'>
                    <p className='font-semibold'>📦 Fornecedores</p>
                    <p className='text-lg'>{result.dados?.fornecedores || 0}</p>
                  </div>
                  <div className='bg-white p-3 rounded border'>
                    <p className='font-semibold'>🛍️ Produtos</p>
                    <p className='text-lg'>{result.dados?.produtos || 0}</p>
                  </div>
                  <div className='bg-white p-3 rounded border'>
                    <p className='font-semibold'>👥 Usuários</p>
                    <p className='text-lg'>{result.dados?.usuarios || 0}</p>
                  </div>
                </div>

                {/* Credenciais criadas */}
                {result.credenciais && (
                  <div className='bg-white p-4 rounded border'>
                    <h4 className='font-semibold text-green-800 mb-2'>
                      🔑 Credenciais de Acesso:
                    </h4>

                    {/* Admin */}
                    {result.credenciais.admin && (
                      <div className='mb-3 p-2 bg-red-50 rounded'>
                        <p className='font-medium text-red-800'>
                          🔴 ADMIN (do .env):
                        </p>
                        <p className='text-sm'>
                          Usuário:{' '}
                          <code className='bg-gray-200 px-1 rounded'>
                            {result.credenciais.admin.username}
                          </code>
                        </p>
                        <p className='text-sm'>
                          Senha:{' '}
                          <code className='bg-gray-200 px-1 rounded'>
                            {result.credenciais.admin.password}
                          </code>
                        </p>
                      </div>
                    )}

                    {/* Distribuidores */}
                    {result.credenciais.distribuidores && (
                      <div className='p-2 bg-blue-50 rounded'>
                        <p className='font-medium text-blue-800 mb-2'>
                          🟢 DISTRIBUIDORES:
                        </p>
                        {result.credenciais.distribuidores.map(
                          (dist, index) => (
                            <div key={index} className='text-sm mb-1'>
                              <code className='bg-gray-200 px-1 rounded'>
                                {dist.email}
                              </code>
                              {' / '}
                              <code className='bg-gray-200 px-1 rounded'>
                                {dist.senha}
                              </code>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className='flex gap-3'>
                <a
                  href='/'
                  className='inline-block bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded transition duration-200'
                >
                  🔑 Fazer Login
                </a>
                <a
                  href='/dashboard'
                  className='inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition duration-200'
                >
                  🏠 Dashboard
                </a>
                <a
                  href='/admin'
                  className='inline-block bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded transition duration-200'
                >
                  ⚙️ Admin
                </a>
              </div>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-6'>
              <h3 className='text-lg font-semibold text-red-800 mb-2 flex items-center'>
                <span className='mr-2'>❌</span>
                Erro ao inicializar sistema
              </h3>
              <p className='text-sm text-red-700 mb-3'>{error}</p>
              <div className='text-xs text-red-600'>
                <p className='font-semibold mb-1'>🔧 Possíveis soluções:</p>
                <ul className='ml-4 list-disc space-y-1'>
                  <li>Verifique se o MongoDB está conectado</li>
                  <li>Confirme as variáveis de ambiente (.env.local)</li>
                  <li>Verifique se MONGODB_URI tem o nome do database</li>
                  <li>Reinicie o servidor (npm run dev)</li>
                  <li>Veja o console do navegador (F12) para mais detalhes</li>
                </ul>
              </div>
            </div>
          )}

          {/* Links de navegação */}
          <div className='border-t border-gray-200 pt-6'>
            <h3 className='text-sm font-semibold text-gray-800 mb-3'>
              🔗 Links úteis:
            </h3>
            <div className='grid grid-cols-2 gap-3 text-sm'>
              <a
                href='/'
                className='text-blue-500 hover:text-blue-700 flex items-center'
              >
                <span className='mr-2'>🔑</span>
                Login
              </a>
              <a
                href='/dashboard'
                className='text-blue-500 hover:text-blue-700 flex items-center'
              >
                <span className='mr-2'>🏠</span>
                Dashboard
              </a>
              <a
                href='/admin'
                className='text-blue-500 hover:text-blue-700 flex items-center'
              >
                <span className='mr-2'>⚙️</span>
                Admin
              </a>
              <a
                href='/test'
                className='text-blue-500 hover:text-blue-700 flex items-center'
              >
                <span className='mr-2'>🧪</span>
                Teste
              </a>
            </div>
          </div>

          {/* Informações de debug */}
          {!result && !error && !loading && (
            <div className='mt-6 p-4 bg-yellow-50 rounded-lg'>
              <h4 className='text-sm font-semibold text-yellow-800 mb-2'>
                💡 Antes de executar:
              </h4>
              <div className='text-xs text-yellow-700 space-y-1'>
                <p>1. Verifique se seu .env.local está correto</p>
                <p>2. Certifique-se que o MongoDB está acessível</p>
                <p>3. Confirme que o servidor está rodando (npm run dev)</p>
                <p>4. Abra o console (F12) para ver logs detalhados</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
