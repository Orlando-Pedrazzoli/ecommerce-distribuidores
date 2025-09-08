// PAGES/ADMIN.JS - ATUALIZADO COM GERENCIAMENTO DE PEDIDOS
// ===================================

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import ProductForm from '../components/Admin/ProductForm';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Admin() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [stats, setStats] = useState({
    totalPedidos: 0,
    pedidosPendentes: 0,
  });
  const router = useRouter();

  useEffect(() => {
    buscarProdutos();
    buscarEstatisticas();
  }, []);

  const buscarProdutos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/produtos');

      if (response.ok) {
        const data = await response.json();
        setProdutos(data.produtos || []);
      } else {
        console.error('Erro ao buscar produtos:', response.status);
        setProdutos([]);
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      setProdutos([]);
    } finally {
      setLoading(false);
    }
  };

  const buscarEstatisticas = async () => {
    try {
      const response = await fetch('/api/admin/pedidos/todos');
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalPedidos: data.stats?.total || 0,
          pedidosPendentes: data.stats?.pendentes || 0,
        });
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  };

  const deletarProduto = async id => {
    if (confirm('Tem certeza que deseja deletar este produto?')) {
      try {
        const response = await fetch(`/api/admin/produtos?id=${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          buscarProdutos();
          alert('Produto deletado com sucesso!');
        } else {
          alert('Erro ao deletar produto');
        }
      } catch (error) {
        console.error('Erro ao deletar produto:', error);
        alert('Erro ao deletar produto');
      }
    }
  };

  const handleEditProduct = produto => {
    setEditingProduct(produto);
  };

  const handleProductSuccess = () => {
    buscarProdutos();
    setEditingProduct(null);
  };

  return (
    <>
      <Head>
        <title>Admin - Elite Surfing</title>
      </Head>
      <Layout>
        <div className='max-w-7xl mx-auto px-4 py-8'>
          {/* Header */}
          <div className='bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-lg mb-8 shadow-lg'>
            <h1 className='text-3xl font-bold flex items-center gap-3'>
              <span>⚙️</span>
              Painel de Administração
            </h1>
            <p className='mt-2 opacity-90'>
              Gerencie produtos e pedidos do sistema
            </p>
          </div>

          {/* Cards de Acesso Rápido */}
          <div className='grid md:grid-cols-3 gap-6 mb-8'>
            {/* Card Produtos */}
            <div className='bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500'>
              <div className='flex items-center justify-between mb-4'>
                <div className='text-3xl'>📦</div>
                <span className='text-2xl font-bold text-gray-800'>
                  {produtos.length}
                </span>
              </div>
              <h3 className='text-lg font-semibold text-gray-800 mb-2'>
                Produtos Cadastrados
              </h3>
              <p className='text-sm text-gray-600'>
                Gerencie o catálogo de produtos
              </p>
            </div>

            {/* Card Pedidos */}
            <div
              onClick={() => router.push('/admin-pedidos')}
              className='bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500 cursor-pointer hover:shadow-lg transition-shadow'
            >
              <div className='flex items-center justify-between mb-4'>
                <div className='text-3xl'>📋</div>
                <span className='text-2xl font-bold text-gray-800'>
                  {stats.totalPedidos}
                </span>
              </div>
              <h3 className='text-lg font-semibold text-gray-800 mb-2'>
                Total de Pedidos
              </h3>
              <p className='text-sm text-gray-600 mb-2'>
                Visualize e gerencie todos os pedidos
              </p>
              {stats.pedidosPendentes > 0 && (
                <p className='text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded inline-block'>
                  ⚠️ {stats.pedidosPendentes} pendente(s)
                </p>
              )}
              <div className='mt-3 text-blue-600 text-sm font-medium flex items-center gap-1'>
                Gerenciar Pedidos →
              </div>
            </div>

            {/* Card Relatórios (Futuro) */}
            <div className='bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500 opacity-75'>
              <div className='flex items-center justify-between mb-4'>
                <div className='text-3xl'>📊</div>
                <span className='text-sm bg-gray-200 text-gray-600 px-2 py-1 rounded'>
                  Em breve
                </span>
              </div>
              <h3 className='text-lg font-semibold text-gray-800 mb-2'>
                Relatórios
              </h3>
              <p className='text-sm text-gray-600'>
                Análises e estatísticas detalhadas
              </p>
            </div>
          </div>

          {/* Seção de Produtos */}
          <div className='grid lg:grid-cols-2 gap-8'>
            {/* Formulário de Produto */}
            <ProductForm
              onSuccess={handleProductSuccess}
              editingProduct={editingProduct}
            />

            {/* Lista de Produtos */}
            <div className='bg-white rounded-lg shadow-md p-6'>
              <div className='flex justify-between items-center mb-6'>
                <h2 className='text-xl font-bold text-gray-800'>
                  Produtos Cadastrados ({produtos.length})
                </h2>
                {editingProduct && (
                  <button
                    onClick={() => setEditingProduct(null)}
                    className='text-sm bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 transition'
                  >
                    Cancelar Edição
                  </button>
                )}
              </div>

              {loading ? (
                <div className='text-center py-8'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto'></div>
                  <p className='mt-2 text-gray-600'>Carregando produtos...</p>
                </div>
              ) : produtos.length === 0 ? (
                <div className='text-center py-8'>
                  <div className='text-4xl mb-4'>📦</div>
                  <p className='text-gray-500 mb-4'>
                    Nenhum produto cadastrado
                  </p>
                  <p className='text-sm text-gray-400'>
                    Use o formulário ao lado para adicionar produtos
                  </p>
                  <div className='mt-4'>
                    <a
                      href='/seed'
                      className='inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition'
                    >
                      Criar Dados de Exemplo
                    </a>
                  </div>
                </div>
              ) : (
                <div className='max-h-96 overflow-y-auto space-y-3'>
                  {produtos.map(produto => (
                    <div
                      key={produto._id}
                      className={`border rounded-lg p-4 transition ${
                        editingProduct?._id === produto._id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className='flex items-start gap-4'>
                        {/* Imagem */}
                        <div className='w-16 h-16 bg-gray-200 rounded flex-shrink-0 overflow-hidden'>
                          {produto.imagem ? (
                            <img
                              src={produto.imagem}
                              alt={produto.nome}
                              className='w-full h-full object-cover'
                            />
                          ) : (
                            <div className='w-full h-full flex items-center justify-center text-gray-400 text-xs'>
                              📦
                            </div>
                          )}
                        </div>

                        {/* Informações */}
                        <div className='flex-1 min-w-0'>
                          <h3 className='font-medium text-gray-900 truncate'>
                            {produto.nome}
                          </h3>
                          <p className='text-sm text-gray-600'>
                            {produto.codigo} • {produto.categoria}
                          </p>
                          <p className='text-sm text-gray-500'>
                            {produto.fornecedorId?.nome}
                          </p>
                          <div className='text-sm mt-1'>
                            <span className='font-medium text-blue-600'>
                              COM NF: R$ {produto.preco?.toFixed(2) || '0.00'}
                            </span>
                            <span className='mx-2'>|</span>
                            <span className='font-medium text-green-600'>
                              SEM NF: R${' '}
                              {produto.precoSemNF?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                        </div>

                        {/* Ações */}
                        <div className='flex flex-col gap-2'>
                          <button
                            onClick={() => handleEditProduct(produto)}
                            className='bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition'
                            title='Editar produto'
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deletarProduto(produto._id)}
                            className='bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition'
                            title='Deletar produto'
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Informações úteis */}
          <div className='mt-8 bg-blue-50 rounded-lg p-6'>
            <h3 className='text-lg font-semibold text-blue-800 mb-3'>
              ℹ️ Áreas do Admin
            </h3>
            <div className='grid md:grid-cols-2 gap-4 text-sm text-blue-700'>
              <div>
                <h4 className='font-medium mb-2'>📦 Gestão de Produtos:</h4>
                <ul className='space-y-1 ml-4'>
                  <li>• Adicionar novos produtos</li>
                  <li>• Editar produtos existentes</li>
                  <li>• Definir preços com e sem NF</li>
                  <li>• Upload de imagens</li>
                </ul>
              </div>
              <div>
                <h4 className='font-medium mb-2'>📋 Gestão de Pedidos:</h4>
                <ul className='space-y-1 ml-4'>
                  <li>• Visualizar todos os pedidos</li>
                  <li>• Atualizar status (pendente → entregue)</li>
                  <li>• Filtrar por status e fornecedor</li>
                  <li>• Acompanhar valores e estatísticas</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
