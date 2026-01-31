// PAGES/PRODUTOS/[FORNECEDOR].JS - COM CATEGORIAS AGRUPADAS
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
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Estado para controlar accordion de grupos expandidos
  const [expandedGroups, setExpandedGroups] = useState({});

  // Mapeamento das cores dos fornecedores - igual ao dashboard
  const fornecedorCores = {
    A: 'from-[#ff7e5f] to-[#feb47b]', // Vitor - Pandawa
    B: 'from-[#43cea2] to-[#185a9d]', // Mauricio - Maos Acessórios
    C: 'from-[#6a11cb] to-[#2575fc]', // Rodrigo - Godas
  };

  // Função para obter a cor do fornecedor
  const obterCorFornecedor = codigo => {
    return fornecedorCores[codigo] || 'from-gray-500 to-gray-600';
  };

  // Função para agrupar categorias
  const agruparCategorias = (cats) => {
    const grupos = {};
    const individuais = [];

    cats.forEach(cat => {
      // Agrupar categorias que começam com "Leash"
      if (cat.toLowerCase().startsWith('leash')) {
        if (!grupos['Leashes']) {
          grupos['Leashes'] = [];
        }
        grupos['Leashes'].push(cat);
      }
      // Agrupar categorias que começam com "Deck"
      else if (cat.toLowerCase().startsWith('deck')) {
        if (!grupos['Decks']) {
          grupos['Decks'] = [];
        }
        grupos['Decks'].push(cat);
      }
      // Agrupar categorias que começam com "Capa"
      else if (cat.toLowerCase().startsWith('capa')) {
        if (!grupos['Capas']) {
          grupos['Capas'] = [];
        }
        grupos['Capas'].push(cat);
      }
      // Outras categorias ficam individuais
      else {
        individuais.push(cat);
      }
    });

    return { grupos, individuais };
  };

  // Toggle para expandir/colapsar grupo
  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Verificar se uma categoria do grupo está selecionada
  const isGroupActive = (groupCats) => {
    return groupCats.some(cat => cat === categoriaFiltro);
  };

  useEffect(() => {
    if (fornecedor) {
      buscarProdutos();
    }
  }, [fornecedor, categoriaFiltro]);

  // Expandir grupo automaticamente se categoria selecionada está nele
  useEffect(() => {
    const { grupos } = agruparCategorias(categorias);
    Object.entries(grupos).forEach(([groupName, groupCats]) => {
      if (groupCats.includes(categoriaFiltro)) {
        setExpandedGroups(prev => ({ ...prev, [groupName]: true }));
      }
    });
  }, [categoriaFiltro, categorias]);

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

  // Organizar categorias
  const { grupos, individuais } = agruparCategorias(categorias);

  // Componente de Categoria Individual
  const CategoriaButton = ({ categoria, onClick, isSelected, className = '' }) => (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded transition ${
        isSelected
          ? `bg-gradient-to-r ${obterCorFornecedor(fornecedorInfo.codigo)} text-white shadow-md`
          : 'hover:bg-gray-100 text-gray-700'
      } ${className}`}
    >
      {categoria}
    </button>
  );

  // Componente de Grupo de Categorias (Accordion)
  const CategoriaGrupo = ({ nome, subcategorias, isMobile = false }) => {
    const isExpanded = expandedGroups[nome];
    const hasActiveChild = isGroupActive(subcategorias);

    // Se só tem 1 item no grupo, mostrar direto sem accordion
    if (subcategorias.length === 1) {
      return (
        <CategoriaButton
          categoria={subcategorias[0]}
          onClick={() => {
            setCategoriaFiltro(subcategorias[0]);
            if (isMobile) setShowMobileFilters(false);
          }}
          isSelected={categoriaFiltro === subcategorias[0]}
        />
      );
    }

    return (
      <div className='space-y-1'>
        {/* Header do Grupo */}
        <button
          onClick={() => toggleGroup(nome)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded transition ${
            hasActiveChild
              ? 'bg-gray-200 text-gray-900 font-medium'
              : 'hover:bg-gray-100 text-gray-700'
          }`}
        >
          <span className='flex items-center gap-2'>
            {nome}
            <span className='text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full'>
              {subcategorias.length}
            </span>
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
          </svg>
        </button>

        {/* Subcategorias */}
        {isExpanded && (
          <div className='pl-4 space-y-1 border-l-2 border-gray-200 ml-2'>
            {subcategorias.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setCategoriaFiltro(cat);
                  if (isMobile) setShowMobileFilters(false);
                }}
                className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                  categoriaFiltro === cat
                    ? `bg-gradient-to-r ${obterCorFornecedor(fornecedorInfo.codigo)} text-white shadow-md`
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

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

          <div
            className={`bg-gradient-to-r ${obterCorFornecedor(
              fornecedorInfo.codigo
            )} text-white p-6 rounded-lg shadow-lg`}
          >
            <h1 className='text-3xl font-bold mb-2'>{fornecedorInfo.nome}</h1>
            <p className='opacity-90'>
              {produtos.length} produtos disponíveis
              {categoriaFiltro !== 'Todas' && ` em ${categoriaFiltro}`}
            </p>
          </div>
        </div>

        <div className='lg:flex gap-8'>
          {/* Mobile Filter Button */}
          <div className='lg:hidden mb-6'>
            <button
              onClick={() => setShowMobileFilters(true)}
              className={`w-full bg-gradient-to-r ${obterCorFornecedor(
                fornecedorInfo.codigo
              )} text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 shadow-md`}
            >
              <svg
                className='w-5 h-5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z'
                />
              </svg>
              Filtros ({categoriaFiltro === 'Todas' ? 'Todos' : categoriaFiltro})
            </button>
          </div>

          {/* Mobile Filter Modal - TELA CHEIA */}
          {showMobileFilters && (
            <div className='lg:hidden fixed inset-0 bg-white z-50 flex flex-col'>
              {/* Header fixo */}
              <div className='bg-white border-b p-4 flex justify-between items-center'>
                <h3 className='font-bold text-gray-800 text-lg'>
                  Filtrar por Categoria
                </h3>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className='text-gray-500 hover:text-gray-700 p-2'
                >
                  <svg
                    className='w-6 h-6'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M6 18L18 6M6 6l12 12'
                    />
                  </svg>
                </button>
              </div>

              {/* Conteúdo scrollável */}
              <div className='flex-1 overflow-y-auto p-4 space-y-2'>
                {/* Todas as Categorias */}
                <button
                  onClick={() => {
                    setCategoriaFiltro('Todas');
                    setShowMobileFilters(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg transition ${
                    categoriaFiltro === 'Todas'
                      ? `bg-gradient-to-r ${obterCorFornecedor(
                          fornecedorInfo.codigo
                        )} text-white shadow-md`
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Todas as Categorias
                </button>

                {/* Grupos de Categorias */}
                {Object.entries(grupos).map(([groupName, groupCats]) => (
                  <CategoriaGrupo
                    key={groupName}
                    nome={groupName}
                    subcategorias={groupCats}
                    isMobile={true}
                  />
                ))}

                {/* Categorias Individuais */}
                {individuais.map(categoria => (
                  <button
                    key={categoria}
                    onClick={() => {
                      setCategoriaFiltro(categoria);
                      setShowMobileFilters(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg transition ${
                      categoriaFiltro === categoria
                        ? `bg-gradient-to-r ${obterCorFornecedor(
                            fornecedorInfo.codigo
                          )} text-white shadow-md`
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {categoria}
                  </button>
                ))}
              </div>

              {/* Footer fixo com botão fechar */}
              <div className='border-t p-4 bg-white'>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className={`w-full bg-gradient-to-r ${obterCorFornecedor(
                    fornecedorInfo.codigo
                  )} text-white py-3 rounded-lg font-medium`}
                >
                  Aplicar Filtro
                </button>
              </div>
            </div>
          )}

          {/* Desktop Sidebar */}
          <aside className='hidden lg:block w-64 bg-white rounded-lg shadow-md p-6 h-fit sticky top-4'>
            <h3 className='font-bold text-gray-800 text-lg mb-4'>Categorias</h3>

            <div className='space-y-2'>
              {/* Todas as Categorias */}
              <button
                onClick={() => setCategoriaFiltro('Todas')}
                className={`w-full text-left px-3 py-2 rounded transition ${
                  categoriaFiltro === 'Todas'
                    ? `bg-gradient-to-r ${obterCorFornecedor(
                        fornecedorInfo.codigo
                      )} text-white shadow-md`
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                Todas as Categorias
              </button>

              {/* Grupos de Categorias (Accordion) */}
              {Object.entries(grupos).map(([groupName, groupCats]) => (
                <CategoriaGrupo
                  key={groupName}
                  nome={groupName}
                  subcategorias={groupCats}
                  isMobile={false}
                />
              ))}

              {/* Categorias Individuais */}
              {individuais.map(categoria => (
                <button
                  key={categoria}
                  onClick={() => setCategoriaFiltro(categoria)}
                  className={`w-full text-left px-3 py-2 rounded transition ${
                    categoriaFiltro === categoria
                      ? `bg-gradient-to-r ${obterCorFornecedor(
                          fornecedorInfo.codigo
                        )} text-white shadow-md`
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
          <div className='w-full lg:flex-1'>
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
                    className={`bg-gradient-to-r ${obterCorFornecedor(
                      fornecedorInfo?.codigo
                    )} text-white px-6 py-2 rounded-lg hover:opacity-90 transition shadow-md`}
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