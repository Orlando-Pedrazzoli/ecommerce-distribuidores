// 23. PAGES/PRODUTOS/[FORNECEDOR].JS
// ===================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import ProductCard from '../../components/ProductCard';

export default function ProdutosFornecedor() {
  const router = useRouter();
  const { fornecedor } = router.query;
  const [produtos, setProdutos] = useState([]);
  const [filteredProdutos, setFilteredProdutos] = useState([]);
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todos');
  const [loading, setLoading] = useState(true);

  const categorias = ['Todos', 'Capas', 'Decks', 'Leashes', 'Acessórios'];

  useEffect(() => {
    if (fornecedor) {
      buscarProdutos();
    }
  }, [fornecedor]);

  useEffect(() => {
    if (categoriaFiltro === 'Todos') {
      setFilteredProdutos(produtos);
    } else {
      setFilteredProdutos(
        produtos.filter(p => p.categoria === categoriaFiltro)
      );
    }
  }, [produtos, categoriaFiltro]);

  const buscarProdutos = async () => {
    try {
      const response = await fetch(`/api/produtos?fornecedor=${fornecedor}`);
      const data = await response.json();
      setProdutos(data);
      setFilteredProdutos(data);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const nomesFornecedores = {
    A: 'Fornecedor A',
    B: 'Fornecedor B',
    C: 'Fornecedor C',
  };

  if (loading) {
    return (
      <Layout>
        <div className='flex justify-center items-center h-64'>
          <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500'></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className='max-w-7xl mx-auto px-4 py-8'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-800 mb-2'>
            Produtos - {nomesFornecedores[fornecedor]}
          </h1>
          <p className='text-gray-600'>
            {filteredProdutos.length} produtos encontrados
          </p>
        </div>

        <div className='flex gap-8'>
          {/* Sidebar de Filtros */}
          <aside className='w-64 bg-white rounded-lg shadow-md p-6 h-fit sticky top-4'>
            <h3 className='font-bold text-gray-800 mb-4 pb-2 border-b-2 border-blue-500'>
              Filtros
            </h3>

            <div className='mb-6'>
              <h4 className='font-semibold text-gray-700 mb-3'>Categorias</h4>
              {categorias.map(categoria => (
                <label
                  key={categoria}
                  className='flex items-center mb-2 cursor-pointer'
                >
                  <input
                    type='radio'
                    name='categoria'
                    value={categoria}
                    checked={categoriaFiltro === categoria}
                    onChange={e => setCategoriaFiltro(e.target.value)}
                    className='mr-2'
                  />
                  <span className='text-gray-600'>{categoria}</span>
                </label>
              ))}
            </div>
          </aside>

          {/* Grid de Produtos */}
          <div className='flex-1'>
            {filteredProdutos.length === 0 ? (
              <div className='text-center py-12'>
                <p className='text-gray-500 text-lg'>
                  Nenhum produto encontrado para esta categoria.
                </p>
              </div>
            ) : (
              <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {filteredProdutos.map(produto => (
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
