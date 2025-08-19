// PAGES/SEED.JS - CRIE ESTE ARQUIVO
// ===================================

import { useState } from 'react';

export default function SeedPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const executarSeed = async () => {
    if (
      !confirm(
        '🌱 Isso vai criar os dados iniciais (fornecedores e produtos de exemplo).\n\nContinuar?'
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

      if (response.ok) {
        setResult(data);
      } else {
        throw new Error(data.message || 'Erro ao executar seed');
      }
    } catch (err) {
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
                      <strong>3 Fornecedores</strong> (A, B, C) com categorias
                      específicas
                    </li>
                    <li>
                      <strong>9 Produtos</strong> de exemplo (3 por fornecedor)
                    </li>
                    <li>
                      <strong>1 Distribuidor</strong> padrão para testes
                    </li>
                  </ul>
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
                <p>
                  <strong>Fornecedores criados:</strong>{' '}
                  {result.dados.fornecedores}
                </p>
                <p>
                  <strong>Produtos criados:</strong> {result.dados.produtos}
                </p>
                <div className='mt-2'>
                  <p>
                    <strong>Detalhes por fornecedor:</strong>
                  </p>
                  <ul className='ml-4 mt-1'>
                    {Object.entries(result.dados.detalhes).map(
                      ([fornecedor, quantidade]) => (
                        <li key={fornecedor}>
                          • {fornecedor}: {quantidade} produtos
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>
              <div className='flex gap-3'>
                <a
                  href='/dashboard'
                  className='inline-block bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded transition duration-200'
                >
                  🏠 Ir para Dashboard
                </a>
                <a
                  href='/admin'
                  className='inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition duration-200'
                >
                  ⚙️ Ir para Admin
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
                <p>
                  <strong>Possíveis soluções:</strong>
                </p>
                <ul className='ml-4 mt-1 list-disc'>
                  <li>Verifique se o MongoDB está conectado</li>
                  <li>Confirme as variáveis de ambiente (.env.local)</li>
                  <li>Reinicie o servidor (npm run dev)</li>
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
                href='/produtos/A'
                className='text-blue-500 hover:text-blue-700 flex items-center'
              >
                <span className='mr-2'>📦</span>
                Produtos Fornecedor A
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
