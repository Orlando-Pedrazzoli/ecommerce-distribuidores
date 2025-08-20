// PAGES/ADMIN.JS - SIMPLIFICADO
// ===================================

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import ProductForm from '../components/Admin/ProductForm';
import Head from 'next/head';

export default function Admin() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    buscarProdutos();
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
              Administração de Produtos
            </h1>
            <p className='mt-2 opacity-90'>
              Gerencie o catálogo de produtos dos fornecedores
            </p>
          </div>

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
                          <p className='text-sm font-medium text-green-600 mt-1'>
                            R$ {produto.preco?.toFixed(2) || '0.00'}
                          </p>
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
              ℹ️ Instruções de Uso
            </h3>
            <div className='grid md:grid-cols-2 gap-4 text-sm text-blue-700'>
              <div>
                <h4 className='font-medium mb-2'>
                  ✅ Para adicionar produtos:
                </h4>
                <ul className='space-y-1 ml-4'>
                  <li>• Selecione o fornecedor</li>
                  <li>• As categorias serão carregadas automaticamente</li>
                  <li>• Preencha código, nome, descrição e preço</li>
                  <li>• Faça upload de uma imagem</li>
                </ul>
              </div>
              <div>
                <h4 className='font-medium mb-2'>🔧 Para gerenciar:</h4>
                <ul className='space-y-1 ml-4'>
                  <li>• Clique no ✏️ para editar</li>
                  <li>• Clique no 🗑️ para deletar</li>
                  <li>• Use "Cancelar Edição" para sair do modo edição</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
