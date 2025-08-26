// PAGES/SEED.JS - ATUALIZADO PARA ADICIONAR APENAS CATEGORIAS
// ===================================

import { useState } from 'react';

export default function SeedPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const executarSeed = async () => {
    if (
      !confirm(
        '🆕 Adicionar novas categorias aos fornecedores?\n\n✅ SEGURO: Esta operação NÃO apagará nenhum dado existente.\n\n📝 Apenas adicionará novas categorias aos fornecedores:\n- Vitor (Decks)\n- Mauricio (Capas)\n- Rodrigo (Leashes)\n\nContinuar?'
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
              📝 Adicionar Categorias
            </h1>
            <p className='text-gray-600'>
              Adicione novas categorias aos fornecedores sem afetar dados
              existentes
            </p>
          </div>

          <div className='bg-green-50 border-l-4 border-green-400 p-4 mb-6'>
            <div className='flex'>
              <div className='flex-shrink-0'>
                <span className='text-green-400 text-xl'>✅</span>
              </div>
              <div className='ml-3'>
                <h3 className='text-sm font-medium text-green-800'>
                  Esta operação é SEGURA:
                </h3>
                <div className='mt-2 text-sm text-green-700'>
                  <ul className='list-disc pl-5 space-y-1'>
                    <li>
                      <strong>NÃO apaga</strong> produtos, pedidos ou usuários
                      existentes
                    </li>
                    <li>
                      <strong>Apenas adiciona</strong> novas categorias aos
                      fornecedores
                    </li>
                    <li>
                      <strong>Preserva</strong> todas as categorias já
                      existentes
                    </li>
                    <li>
                      <strong>Não duplica</strong> categorias que já existem
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className='bg-blue-50 border-l-4 border-blue-400 p-4 mb-6'>
            <div className='flex'>
              <div className='flex-shrink-0'>
                <span className='text-blue-400 text-xl'>ℹ️</span>
              </div>
              <div className='ml-3'>
                <h3 className='text-sm font-medium text-blue-800'>
                  Como usar:
                </h3>
                <div className='mt-2 text-sm text-blue-700'>
                  <div className='space-y-2'>
                    <p>
                      1. <strong>Edite o arquivo</strong>{' '}
                      <code className='bg-blue-100 px-1 rounded'>
                        pages/api/seed/index.js
                      </code>
                    </p>
                    <p>
                      2. <strong>Adicione suas categorias</strong> na seção
                      marcada com comentários
                    </p>
                    <p>
                      3. <strong>Execute esta página</strong> para aplicar as
                      mudanças
                    </p>
                    <p className='text-xs bg-blue-100 p-2 rounded'>
                      💡 <strong>Dica:</strong> As categorias que você adicionar
                      no código serão incluídas para cada fornecedor sem apagar
                      as existentes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className='text-center mb-8'>
            <button
              onClick={executarSeed}
              disabled={loading}
              className='bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-bold py-3 px-8 rounded-lg transition duration-200 flex items-center mx-auto'
            >
              {loading ? (
                <>
                  <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3'></div>
                  Adicionando categorias...
                </>
              ) : (
                <>
                  <span className='mr-3'>📝</span>
                  Adicionar Categorias
                </>
              )}
            </button>
          </div>

          {/* Resultado de Sucesso */}
          {result && (
            <div className='bg-green-50 border border-green-200 rounded-lg p-4 mb-6'>
              <h3 className='text-lg font-semibold text-green-800 mb-3 flex items-center'>
                <span className='mr-2'>✅</span>
                Categorias atualizadas com sucesso!
              </h3>

              <div className='text-sm text-green-700 mb-4'>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
                  <div className='bg-white p-3 rounded border'>
                    <p className='font-semibold'>👥 Fornecedores Atualizados</p>
                    <p className='text-lg'>
                      {result.resumo?.fornecedoresAtualizados || 0}
                    </p>
                  </div>
                  <div className='bg-white p-3 rounded border'>
                    <p className='font-semibold'>📝 Novas Categorias</p>
                    <p className='text-lg'>
                      {result.resumo?.novasCategoriasCriadas || 0}
                    </p>
                  </div>
                  <div className='bg-white p-3 rounded border'>
                    <p className='font-semibold'>📊 Total Categorias</p>
                    <p className='text-lg'>
                      {result.resumo?.totalCategorias || 0}
                    </p>
                  </div>
                </div>

                {/* Detalhes dos fornecedores */}
                {result.detalhes && (
                  <div className='bg-white p-4 rounded border'>
                    <h4 className='font-semibold text-green-800 mb-2'>
                      📋 Detalhes dos Fornecedores:
                    </h4>
                    {result.detalhes.fornecedores?.map((fornecedor, index) => (
                      <div key={index} className='mb-3 p-2 bg-gray-50 rounded'>
                        <p className='font-medium text-gray-800'>
                          {fornecedor.codigo} - {fornecedor.nome}
                        </p>
                        <p className='text-sm text-gray-600'>
                          Total de categorias: {fornecedor.totalCategorias}
                        </p>
                        <div className='mt-1'>
                          <details className='text-xs'>
                            <summary className='cursor-pointer text-blue-600 hover:text-blue-800'>
                              Ver todas as categorias
                            </summary>
                            <div className='mt-2 pl-4 border-l-2 border-gray-200'>
                              {fornecedor.categorias?.map((cat, i) => (
                                <span
                                  key={i}
                                  className='inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs mr-1 mb-1'
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </details>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className='p-3 bg-blue-100 rounded-lg text-center'>
                <p className='text-sm text-blue-800 font-medium'>
                  {result.observacao}
                </p>
              </div>

              <div className='flex gap-3 mt-4'>
                <a
                  href='/admin'
                  className='inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition duration-200'
                >
                  ⚙️ Ir para Admin
                </a>
                <a
                  href='/dashboard'
                  className='inline-block bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded transition duration-200'
                >
                  🏠 Dashboard
                </a>
              </div>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-6'>
              <h3 className='text-lg font-semibold text-red-800 mb-2 flex items-center'>
                <span className='mr-2'>❌</span>
                Erro ao adicionar categorias
              </h3>
              <p className='text-sm text-red-700 mb-3'>{error}</p>
              <div className='text-xs text-red-600'>
                <p className='font-semibold mb-1'>🔧 Possíveis soluções:</p>
                <ul className='ml-4 list-disc space-y-1'>
                  <li>Verifique se o MongoDB está conectado</li>
                  <li>Confirme se os fornecedores existem no banco</li>
                  <li>Verifique se MONGODB_URI está correto no .env.local</li>
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

          {/* Informações importantes */}
          {!result && !error && !loading && (
            <div className='mt-6 p-4 bg-yellow-50 rounded-lg'>
              <h4 className='text-sm font-semibold text-yellow-800 mb-2'>
                💡 Importante:
              </h4>
              <div className='text-xs text-yellow-700 space-y-1'>
                <p>✅ Esta operação é completamente segura</p>
                <p>📦 Todos os seus produtos atuais serão preservados</p>
                <p>👥 Todos os usuários e pedidos continuarão intactos</p>
                <p>📝 Apenas novas opções de categorias serão adicionadas</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
