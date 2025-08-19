// PAGES/PRODUTOS/[FORNECEDOR].JS - SIMPLIFICADO
// ===================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import ProductCard from '../../components/ProductCard';

export default function ProdutosFornecedor() {
  const router = useRouter();
  const { fornecedor } = router.query;
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');
  const [loading, setLoading] = useState(true);
  const [fornecedorInfo, setFornecedorInfo] = useState(null);

  useEffect(() => {
    if (fornecedor) {
      buscarProdutos();
    }
  }, [fornecedor, categoriaFiltro]);

  const buscarProdutos = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (categoriaFiltro !== 'Todas') {
        params.append('categoria', categoriaFiltro);
      }

      const response = await fetch(`/api/produtos/${fornecedor}?${params}`);

      if (!response.ok) {
        throw new Error('Erro ao carregar produtos');
      }

      const data = await response.json();

      setProdutos(data.produtos || []);
      setCategorias(data.categorias || []);
      setFornecedorInfo(data.fornecedor);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      setProdutos([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className='flex justify-center items-center h-64'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4'></div>
            <p className='text-gray-600'>Carregando produtos...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!fornecedorInfo) {
    return (
      <Layout>
        <div className='max-w-2xl mx-auto px-4 py-16 text-center'>
          <div className='text-6xl mb-4'>⚠️</div>
          <h1 className='text-2xl font-bold text-gray-800 mb-4'>
            Fornecedor não encontrado
          </h1>
          <p className='text-gray-600 mb-6'>
            O fornecedor "{fornecedor}" não existe ou está inativo.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className='bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition'
          >
            Voltar ao Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className='max-w-7xl mx-auto px-4 py-8'>
        {/* Header */}
        <div className='mb-8'>
          <div className='flex items-center gap-4 mb-4'>
            <button
              onClick={() => router.push('/dashboard')}
              className='text-blue-500 hover:text-blue-700 flex items-center gap-2 font-medium'
            >
              <span>←</span>
              Voltar ao Dashboard
            </button>
          </div>

          <div className='bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg'>
            <h1 className='text-3xl font-bold mb-2'>{fornecedorInfo.nome}</h1>
            <p className='opacity-90'>
              {produtos.length} produtos disponíveis
              {categoriaFiltro !== 'Todas' && ` em ${categoriaFiltro}`}
            </p>
          </div>
        </div>

        <div className='flex gap-8'>
          {/* Sidebar de Filtros */}
          <aside className='w-64 bg-white rounded-lg shadow-md p-6 h-fit sticky top-4'>
            <h3 className='font-bold text-gray-800 text-lg mb-4'>Categorias</h3>

            <div className='space-y-2'>
              <button
                onClick={() => setCategoriaFiltro('Todas')}
                className={`w-full text-left px-3 py-2 rounded transition ${
                  categoriaFiltro === 'Todas'
                    ? 'bg-blue-500 text-white'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                Todas as Categorias
              </button>

              {categorias.map(categoria => (
                <button
                  key={categoria}
                  onClick={() => setCategoriaFiltro(categoria)}
                  className={`w-full text-left px-3 py-2 rounded transition ${
                    categoriaFiltro === categoria
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {categoria}
                </button>
              ))}
            </div>

            {/* Info do fornecedor */}
            <div className='mt-8 p-4 bg-gray-50 rounded-lg'>
              <h4 className='font-semibold text-gray-800 mb-2'>
                📋 Informações
              </h4>
              <div className='space-y-1 text-sm text-gray-600'>
                <p>
                  <strong>Código:</strong> {fornecedorInfo.codigo}
                </p>
                <p>
                  <strong>Produtos:</strong> {produtos.length}
                </p>
                <p>
                  <strong>Categorias:</strong> {categorias.length}
                </p>
              </div>
            </div>
          </aside>

          {/* Grid de Produtos */}
          <div className='flex-1'>
            {produtos.length === 0 ? (
              <div className='text-center py-16'>
                <div className='text-6xl mb-4'>📦</div>
                <h3 className='text-xl font-medium text-gray-900 mb-2'>
                  Nenhum produto encontrado
                </h3>
                <p className='text-gray-600 mb-6'>
                  {categoriaFiltro === 'Todas'
                    ? 'Este fornecedor ainda não possui produtos cadastrados.'
                    : `Nenhum produto encontrado na categoria "${categoriaFiltro}".`}
                </p>
                {categoriaFiltro !== 'Todas' && (
                  <button
                    onClick={() => setCategoriaFiltro('Todas')}
                    className='bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition'
                  >
                    Ver Todas as Categorias
                  </button>
                )}
              </div>
            ) : (
              <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {produtos.map(produto => (
                  <ProductCard key={produto._id} produto={produto} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
