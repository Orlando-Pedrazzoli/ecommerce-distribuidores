// PAGES/ADMIN-PRODUTOS.JS - ATUALIZADO COM SUPORTE A MÚLTIPLAS IMAGENS
// ================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ProductForm from '../components/Admin/ProductForm';
import AdminShell from '../components/Admin/AdminShell';

export default function AdminProdutos() {
  const [produtos, setProdutos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFornecedor, setSelectedFornecedor] = useState('todos');

  const [selectedCategoria, setSelectedCategoria] = useState('todas');
  const [viewMode, setViewMode] = useState('grouped');
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const router = useRouter();

  // Filtro inicial vindo de /admin/fornecedores (?fornecedor=<id>)
  useEffect(() => {
    if (router.isReady && router.query.fornecedor)
      setSelectedFornecedor(String(router.query.fornecedor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  useEffect(() => {
    verificarAuth();
    buscarDados();
  }, []);

  const verificarAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        console.log('❌ Não autenticado');
        router.push('/');
        return;
      }

      const data = await response.json();
      console.log('📦 Dados do usuário:', data);

      const isAdmin =
        data.isAdmin === true ||
        data.user?.isAdmin === true ||
        data.tipo === 'admin' ||
        data.user?.tipo === 'admin';

      if (!isAdmin) {
        console.log('❌ Usuário não é admin');
        router.push('/');
      } else {
        console.log('✅ Usuário admin verificado');
      }
    } catch (error) {
      console.error('❌ Erro ao verificar auth:', error);
      router.push('/');
    }
  };

  const buscarDados = async () => {
    setLoading(true);
    try {
      const [produtosRes, fornecedoresRes] = await Promise.all([
        fetch('/api/admin/produtos'),
        fetch('/api/admin/fornecedores'),
      ]);

      if (produtosRes.ok && fornecedoresRes.ok) {
        const produtosData = await produtosRes.json();
        const fornecedoresData = await fornecedoresRes.json();

        setProdutos(produtosData.produtos || []);
        setFornecedores(fornecedoresData || []);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🆕 Helper para obter imagens do produto
  const getProductImages = produto => {
    if (produto.imagens && produto.imagens.length > 0) {
      return produto.imagens;
    }
    if (produto.imagem) {
      return [produto.imagem];
    }
    return [];
  };

  // 🆕 Helper para obter imagem principal
  const getMainImage = produto => {
    const images = getProductImages(produto);
    return images.length > 0 ? images[0] : null;
  };

  // Agrupar produtos por fornecedor e categoria
  const produtosAgrupados = () => {
    let filteredProdutos = produtos;

    if (searchTerm) {
      filteredProdutos = filteredProdutos.filter(
        p =>
          p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.descricao?.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (selectedFornecedor !== 'todos') {
      filteredProdutos = filteredProdutos.filter(p => p.fornecedorId?._id === selectedFornecedor);
    }

    if (selectedCategoria !== 'todas') {
      filteredProdutos = filteredProdutos.filter(p => p.categoria === selectedCategoria);
    }

    const grouped = {};

    filteredProdutos.forEach(produto => {
      const fornecedorNome = produto.fornecedorId?.nome || 'Sem Fornecedor';
      const categoria = produto.categoria || 'Sem Categoria';

      if (!grouped[fornecedorNome]) {
        grouped[fornecedorNome] = {};
      }

      if (!grouped[fornecedorNome][categoria]) {
        grouped[fornecedorNome][categoria] = [];
      }

      grouped[fornecedorNome][categoria].push(produto);
    });

    Object.keys(grouped).forEach(fornecedor => {
      Object.keys(grouped[fornecedor]).forEach(categoria => {
        grouped[fornecedor][categoria].sort((a, b) => a.codigo.localeCompare(b.codigo));
      });
    });

    return grouped;
  };

  const todasCategorias = () => {
    const categorias = new Set();
    produtos.forEach(p => {
      if (p.categoria) categorias.add(p.categoria);
    });
    return Array.from(categorias).sort();
  };

  const handleEdit = produto => {
    setEditingProduct(produto);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async produtoId => {
    if (!confirm('Tem certeza que deseja remover este produto?')) return;

    try {
      const response = await fetch(`/api/admin/produtos?id=${produtoId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('✅ Produto removido com sucesso!');
        buscarDados();
      }
    } catch (error) {
      alert('❌ Erro ao remover produto');
    }
  };

  const handleFormSuccess = () => {
    buscarDados();
    setShowForm(false);
    setEditingProduct(null);
  };

  const toggleCategory = (fornecedor, categoria) => {
    const key = `${fornecedor}-${categoria}`;
    const newExpanded = new Set(expandedCategories);

    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }

    setExpandedCategories(newExpanded);
  };

  const expandAll = () => {
    const allKeys = new Set();
    const grouped = produtosAgrupados();

    Object.keys(grouped).forEach(fornecedor => {
      Object.keys(grouped[fornecedor]).forEach(categoria => {
        allKeys.add(`${fornecedor}-${categoria}`);
      });
    });

    setExpandedCategories(allKeys);
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  if (loading) {
    return (
      <AdminShell titulo='Produtos'>
        <div className='flex items-center justify-center py-24'>
          <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800'></div>
        </div>
      </AdminShell>
    );
  }

  const grouped = produtosAgrupados();
  const totalProdutos = produtos.length;
  const produtosFiltrados = Object.values(grouped).reduce(
    (acc, cats) => acc + Object.values(cats).reduce((sum, prods) => sum + prods.length, 0),
    0,
  );

  return (
    <AdminShell
      titulo='Produtos'
      subtitulo={`${totalProdutos} produto(s) no catálogo`}
      acoes={
        <button
          onClick={() => {
            setEditingProduct(null);
            setShowForm(!showForm);
          }}
          className='bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold'
        >
          {showForm ? '✕ Fechar' : '+ Novo Produto'}
        </button>
      }
    >
      <div>
        {/* Formulário de Produto */}
        {showForm && (
          <div className='mb-8'>
            <ProductForm editingProduct={editingProduct} onSuccess={handleFormSuccess} />
          </div>
        )}

        {/* Filtros e Controles */}
        <div className='bg-white rounded-lg shadow-md p-6 mb-6'>
          <div className='grid md:grid-cols-4 gap-4'>
            {/* Busca */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>🔍 Buscar</label>
              <input
                type='text'
                placeholder='Nome, código ou descrição...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>

            {/* Filtro Fornecedor */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>🏢 Fornecedor</label>
              <select
                value={selectedFornecedor}
                onChange={e => setSelectedFornecedor(e.target.value)}
                className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
              >
                <option value='todos'>Todos ({totalProdutos})</option>
                {fornecedores.map(f => {
                  const count = produtos.filter(p => p.fornecedorId?._id === f._id).length;
                  return (
                    <option key={f._id} value={f._id}>
                      {f.nome} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Filtro Categoria */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>📁 Categoria</label>
              <select
                value={selectedCategoria}
                onChange={e => setSelectedCategoria(e.target.value)}
                className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
              >
                <option value='todas'>Todas</option>
                {todasCategorias().map(cat => {
                  const count = produtos.filter(p => p.categoria === cat).length;
                  return (
                    <option key={cat} value={cat}>
                      {cat} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Controles de Visualização */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                👁️ Visualização
              </label>
              <div className='flex gap-2'>
                <button
                  onClick={() => setViewMode(viewMode === 'grouped' ? 'list' : 'grouped')}
                  className='flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition text-sm'
                >
                  {viewMode === 'grouped' ? '📋 Lista' : '📂 Agrupado'}
                </button>
                {viewMode === 'grouped' && (
                  <>
                    <button
                      onClick={expandAll}
                      className='bg-green-100 text-green-700 px-3 py-2 rounded-lg hover:bg-green-200 transition text-sm'
                      title='Expandir tudo'
                    >
                      ↓
                    </button>
                    <button
                      onClick={collapseAll}
                      className='bg-red-100 text-red-700 px-3 py-2 rounded-lg hover:bg-red-200 transition text-sm'
                      title='Recolher tudo'
                    >
                      ↑
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Estatísticas */}
          {searchTerm || selectedFornecedor !== 'todos' || selectedCategoria !== 'todas' ? (
            <div className='mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
              <p className='text-sm text-yellow-800'>
                🔍 Mostrando {produtosFiltrados} de {totalProdutos} produtos
              </p>
            </div>
          ) : null}
        </div>

        {/* Lista de Produtos */}
        <div className='space-y-6'>
          {viewMode === 'grouped' ? (
            // Visualização Agrupada
            Object.keys(grouped).length === 0 ? (
              <div className='bg-white rounded-lg shadow-md p-8 text-center'>
                <p className='text-gray-500'>Nenhum produto encontrado com os filtros aplicados.</p>
              </div>
            ) : (
              Object.keys(grouped)
                .sort()
                .map(fornecedor => (
                  <div key={fornecedor} className='bg-white rounded-lg shadow-md overflow-hidden'>
                    <div className='bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4'>
                      <h2 className='text-xl font-bold flex items-center gap-3'>
                        <span>🏢</span>
                        {fornecedor}
                        <span className='bg-white/20 px-3 py-1 rounded-full text-sm'>
                          {Object.values(grouped[fornecedor]).reduce(
                            (acc, prods) => acc + prods.length,
                            0,
                          )}{' '}
                          produtos
                        </span>
                      </h2>
                    </div>

                    <div className='p-4 space-y-4'>
                      {Object.keys(grouped[fornecedor])
                        .sort()
                        .map(categoria => {
                          const isExpanded = expandedCategories.has(`${fornecedor}-${categoria}`);
                          const produtosCategoria = grouped[fornecedor][categoria];

                          return (
                            <div key={categoria} className='border rounded-lg overflow-hidden'>
                              <button
                                onClick={() => toggleCategory(fornecedor, categoria)}
                                className='w-full bg-gray-50 hover:bg-gray-100 transition p-3 flex items-center justify-between'
                              >
                                <div className='flex items-center gap-3'>
                                  <span className='text-lg'>{isExpanded ? '📂' : '📁'}</span>
                                  <h3 className='font-semibold text-gray-800'>{categoria}</h3>
                                  <span className='bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm'>
                                    {produtosCategoria.length}{' '}
                                    {produtosCategoria.length === 1 ? 'produto' : 'produtos'}
                                  </span>
                                </div>
                                <span className='text-gray-400'>{isExpanded ? '▼' : '▶'}</span>
                              </button>

                              {isExpanded && (
                                <div className='divide-y divide-gray-200'>
                                  {produtosCategoria.map(produto => {
                                    const images = getProductImages(produto);
                                    const mainImage = getMainImage(produto);
                                    const precoTotal =
                                      (produto.preco || 0) +
                                      (produto.precoEtiqueta || 0) +
                                      (produto.precoEmbalagem || 0);

                                    return (
                                      <div
                                        key={produto._id}
                                        className='p-4 hover:bg-gray-50 transition'
                                      >
                                        <div className='flex items-start justify-between'>
                                          <div className='flex gap-4 flex-1'>
                                            {/* 🆕 Imagem com indicador de múltiplas */}
                                            <div className='relative'>
                                              {mainImage ? (
                                                <>
                                                  <img
                                                    src={mainImage}
                                                    alt={produto.nome}
                                                    className='w-16 h-16 object-cover rounded-lg border'
                                                  />
                                                  {/* Badge de múltiplas imagens */}
                                                  {images.length > 1 && (
                                                    <span className='absolute -top-1 -right-1 bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold'>
                                                      {images.length}
                                                    </span>
                                                  )}
                                                </>
                                              ) : (
                                                <div className='w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center'>
                                                  <span className='text-gray-400 text-xs'>
                                                    Sem img
                                                  </span>
                                                </div>
                                              )}
                                            </div>

                                            {/* Informações */}
                                            <div className='flex-1'>
                                              <div className='flex items-start justify-between'>
                                                <div>
                                                  <h4 className='font-semibold text-gray-900'>
                                                    {produto.nome}
                                                  </h4>
                                                  <p className='text-sm text-gray-500'>
                                                    Código: {produto.codigo}
                                                  </p>
                                                  {produto.descricao && (
                                                    <p className='text-sm text-gray-600 mt-1 line-clamp-2'>
                                                      {produto.descricao}
                                                    </p>
                                                  )}
                                                  {/* 🆕 Info de imagens */}
                                                  {images.length > 0 && (
                                                    <p className='text-xs text-purple-600 mt-1'>
                                                      🖼️ {images.length} imagem
                                                      {images.length > 1 ? 's' : ''}
                                                    </p>
                                                  )}
                                                </div>

                                                {/* 🆕 Preços detalhados */}
                                                <div className='text-right ml-4'>
                                                  <p className='font-bold text-green-600'>
                                                    R$ {precoTotal.toFixed(2)}
                                                  </p>
                                                  {(produto.precoEtiqueta > 0 ||
                                                    produto.precoEmbalagem > 0) && (
                                                    <div className='text-xs text-gray-500 mt-1'>
                                                      <p>Base: R$ {produto.preco?.toFixed(2)}</p>
                                                      {produto.precoEtiqueta > 0 && (
                                                        <p>
                                                          🏷️ +R$ {produto.precoEtiqueta.toFixed(2)}
                                                        </p>
                                                      )}
                                                      {produto.precoEmbalagem > 0 && (
                                                        <p>
                                                          📦 +R$ {produto.precoEmbalagem.toFixed(2)}
                                                        </p>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Ações */}
                                          <div className='flex gap-2 ml-4'>
                                            <button
                                              onClick={() => handleEdit(produto)}
                                              className='bg-yellow-100 text-yellow-700 p-2 rounded hover:bg-yellow-200 transition'
                                              title='Editar'
                                            >
                                              ✏️
                                            </button>
                                            <button
                                              onClick={() => handleDelete(produto._id)}
                                              className='bg-red-100 text-red-700 p-2 rounded hover:bg-red-200 transition'
                                              title='Remover'
                                            >
                                              🗑️
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))
            )
          ) : (
            // Visualização em Lista Simples
            <div className='bg-white rounded-lg shadow-md overflow-hidden'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Produto
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Fornecedor
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Categoria
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Preços
                    </th>
                    <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {Object.values(grouped)
                    .map(fornecedor =>
                      Object.values(fornecedor).map(produtosArr =>
                        produtosArr.map(produto => {
                          const images = getProductImages(produto);
                          const mainImage = getMainImage(produto);
                          const precoTotal =
                            (produto.preco || 0) +
                            (produto.precoEtiqueta || 0) +
                            (produto.precoEmbalagem || 0);

                          return (
                            <tr key={produto._id} className='hover:bg-gray-50'>
                              <td className='px-6 py-4 whitespace-nowrap'>
                                <div className='flex items-center'>
                                  {/* 🆕 Imagem com badge */}
                                  <div className='relative mr-3'>
                                    {mainImage ? (
                                      <>
                                        <img
                                          src={mainImage}
                                          alt={produto.nome}
                                          className='w-10 h-10 rounded-lg object-cover'
                                        />
                                        {images.length > 1 && (
                                          <span className='absolute -top-1 -right-1 bg-purple-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold'>
                                            {images.length}
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <div className='w-10 h-10 bg-gray-200 rounded-lg' />
                                    )}
                                  </div>
                                  <div>
                                    <div className='text-sm font-medium text-gray-900'>
                                      {produto.nome}
                                    </div>
                                    <div className='text-sm text-gray-500'>{produto.codigo}</div>
                                  </div>
                                </div>
                              </td>
                              <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                                {produto.fornecedorId?.nome || 'N/A'}
                              </td>
                              <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                                {produto.categoria}
                              </td>
                              <td className='px-6 py-4 whitespace-nowrap'>
                                <div className='text-sm font-semibold text-green-600'>
                                  R$ {precoTotal.toFixed(2)}
                                </div>
                                {(produto.precoEtiqueta > 0 || produto.precoEmbalagem > 0) && (
                                  <div className='text-xs text-gray-500'>
                                    Base: R$ {produto.preco?.toFixed(2)}
                                  </div>
                                )}
                              </td>
                              <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                                <button
                                  onClick={() => handleEdit(produto)}
                                  className='text-yellow-600 hover:text-yellow-900 mr-3'
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDelete(produto._id)}
                                  className='text-red-600 hover:text-red-900'
                                >
                                  Remover
                                </button>
                              </td>
                            </tr>
                          );
                        }),
                      ),
                    )
                    .flat()}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Estatísticas Finais */}
        <div className='mt-8 bg-white rounded-lg shadow-md p-6'>
          <h3 className='text-lg font-semibold mb-4'>📊 Resumo</h3>
          <div className='grid md:grid-cols-4 gap-4'>
            <div className='bg-blue-50 p-4 rounded-lg'>
              <p className='text-sm text-blue-600 font-medium'>Total de Produtos</p>
              <p className='text-2xl font-bold text-blue-800'>{totalProdutos}</p>
            </div>
            <div className='bg-green-50 p-4 rounded-lg'>
              <p className='text-sm text-green-600 font-medium'>Fornecedores</p>
              <p className='text-2xl font-bold text-green-800'>{fornecedores.length}</p>
            </div>
            <div className='bg-purple-50 p-4 rounded-lg'>
              <p className='text-sm text-purple-600 font-medium'>Categorias</p>
              <p className='text-2xl font-bold text-purple-800'>{todasCategorias().length}</p>
            </div>
            <div className='bg-orange-50 p-4 rounded-lg'>
              <p className='text-sm text-orange-600 font-medium'>Produtos Filtrados</p>
              <p className='text-2xl font-bold text-orange-800'>{produtosFiltrados}</p>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
