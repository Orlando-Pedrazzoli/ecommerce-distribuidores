// 25. PAGES/ADMIN.JS - CORRIGIDO
// ===================================

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('produtos');
  const [produtos, setProdutos] = useState([]); // INICIALIZAR COMO ARRAY VAZIO
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);

  const [novoProduto, setNovoProduto] = useState({
    nome: '',
    fornecedorId: '',
    categoria: 'Capas',
    preco: '',
    descricao: '',
    estoque: '',
  });

  const fornecedores = [
    { _id: '507f1f77bcf86cd799439011', nome: 'Fornecedor A', codigo: 'A' },
    { _id: '507f1f77bcf86cd799439012', nome: 'Fornecedor B', codigo: 'B' },
    { _id: '507f1f77bcf86cd799439013', nome: 'Fornecedor C', codigo: 'C' },
  ];

  useEffect(() => {
    if (activeTab === 'produtos') {
      buscarProdutos();
    }
  }, [activeTab]);

  const buscarProdutos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/produtos');

      if (response.ok) {
        const data = await response.json();
        // GARANTIR QUE SEMPRE SEJA UM ARRAY
        setProdutos(Array.isArray(data) ? data : data.produtos || []);
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

  // Função para lidar com seleção de imagens
  const handleImageUpload = e => {
    const files = Array.from(e.target.files);

    // Validar tamanho dos arquivos (5MB máximo)
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`Arquivo ${file.name} é muito grande. Máximo 5MB.`);
        return false;
      }
      return true;
    });

    setSelectedImages(validFiles);
  };

  // Função para remover imagem selecionada
  const removeSelectedImage = index => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Função para fazer upload das imagens
  const uploadImages = async () => {
    if (selectedImages.length === 0) return [];

    setUploadingImages(true);
    try {
      const formData = new FormData();
      selectedImages.forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro no upload das imagens');
      }

      const data = await response.json();
      return data.imageUrls || [];
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload das imagens');
      return [];
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmitProduto = async e => {
    e.preventDefault();
    setLoading(true);

    try {
      // Primeiro, fazer upload das imagens
      const imageUrls = await uploadImages();

      const response = await fetch('/api/admin/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...novoProduto,
          preco: parseFloat(novoProduto.preco),
          estoque: parseInt(novoProduto.estoque) || 0,
          imagens: imageUrls, // Adicionar URLs das imagens
        }),
      });

      if (response.ok) {
        alert('Produto criado com sucesso!');
        setNovoProduto({
          nome: '',
          fornecedorId: '',
          categoria: 'Capas',
          preco: '',
          descricao: '',
          estoque: '',
        });
        setSelectedImages([]); // Limpar imagens selecionadas

        // Limpar input de arquivo
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = '';

        buscarProdutos();
      } else {
        const errorData = await response.json();
        alert(`Erro ao criar produto: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      alert('Erro ao criar produto');
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

  return (
    <Layout>
      <div className='max-w-7xl mx-auto px-4 py-8'>
        <div className='bg-red-500 text-white p-4 rounded-lg mb-6'>
          <h1 className='text-2xl font-bold'>🛠️ Dashboard Administrativo</h1>
        </div>

        {/* Tabs */}
        <div className='border-b border-gray-200 mb-6'>
          <nav className='flex space-x-8'>
            {['produtos', 'pedidos', 'fornecedores'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Conteúdo das Tabs */}
        {activeTab === 'produtos' && (
          <div className='grid lg:grid-cols-2 gap-8'>
            {/* Formulário Novo Produto */}
            <div className='bg-white rounded-lg shadow-md p-6'>
              <h2 className='text-xl font-bold text-gray-800 mb-4'>
                Adicionar Produto
              </h2>

              <form onSubmit={handleSubmitProduto} className='space-y-4'>
                <div>
                  <label className='block text-gray-700 font-medium mb-2'>
                    Nome do Produto
                  </label>
                  <input
                    type='text'
                    value={novoProduto.nome}
                    onChange={e =>
                      setNovoProduto({ ...novoProduto, nome: e.target.value })
                    }
                    className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
                    required
                  />
                </div>

                <div>
                  <label className='block text-gray-700 font-medium mb-2'>
                    Fornecedor
                  </label>
                  <select
                    value={novoProduto.fornecedorId}
                    onChange={e =>
                      setNovoProduto({
                        ...novoProduto,
                        fornecedorId: e.target.value,
                      })
                    }
                    className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
                    required
                  >
                    <option value=''>Selecione um fornecedor</option>
                    {fornecedores.map(f => (
                      <option key={f._id} value={f._id}>
                        {f.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className='block text-gray-700 font-medium mb-2'>
                    Categoria
                  </label>
                  <select
                    value={novoProduto.categoria}
                    onChange={e =>
                      setNovoProduto({
                        ...novoProduto,
                        categoria: e.target.value,
                      })
                    }
                    className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
                  >
                    <option value='Capas'>Capas</option>
                    <option value='Decks'>Decks</option>
                    <option value='Leashes'>Leashes</option>
                    <option value='Acessórios'>Acessórios</option>
                  </select>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-gray-700 font-medium mb-2'>
                      Preço
                    </label>
                    <input
                      type='number'
                      step='0.01'
                      value={novoProduto.preco}
                      onChange={e =>
                        setNovoProduto({
                          ...novoProduto,
                          preco: e.target.value,
                        })
                      }
                      className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
                      required
                    />
                  </div>
                  <div>
                    <label className='block text-gray-700 font-medium mb-2'>
                      Estoque
                    </label>
                    <input
                      type='number'
                      value={novoProduto.estoque}
                      onChange={e =>
                        setNovoProduto({
                          ...novoProduto,
                          estoque: e.target.value,
                        })
                      }
                      className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-gray-700 font-medium mb-2'>
                    Descrição
                  </label>
                  <textarea
                    rows='3'
                    value={novoProduto.descricao}
                    onChange={e =>
                      setNovoProduto({
                        ...novoProduto,
                        descricao: e.target.value,
                      })
                    }
                    className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
                    required
                  ></textarea>
                </div>

                {/* Campo de Upload de Imagens */}
                <div>
                  <label className='block text-gray-700 font-medium mb-2'>
                    Imagens do Produto
                  </label>
                  <input
                    type='file'
                    multiple
                    accept='image/*'
                    onChange={handleImageUpload}
                    className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
                  />
                  <p className='text-xs text-gray-500 mt-1'>
                    Selecione múltiplas imagens (JPG, PNG, WEBP) - Máximo 5MB
                    cada
                  </p>

                  {/* Preview das imagens selecionadas */}
                  {selectedImages.length > 0 && (
                    <div className='mt-3'>
                      <p className='text-sm font-medium text-gray-700 mb-2'>
                        Imagens selecionadas:
                      </p>
                      <div className='flex flex-wrap gap-2'>
                        {selectedImages.map((file, index) => (
                          <div key={index} className='relative'>
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${index + 1}`}
                              className='w-16 h-16 object-cover rounded border'
                            />
                            <button
                              type='button'
                              onClick={() => removeSelectedImage(index)}
                              className='absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs hover:bg-red-600'
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type='submit'
                  disabled={loading || uploadingImages}
                  className='w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition disabled:opacity-50'
                >
                  {uploadingImages
                    ? 'Fazendo upload...'
                    : loading
                    ? 'Salvando...'
                    : 'Salvar Produto'}
                </button>
              </form>
            </div>

            {/* Lista de Produtos */}
            <div className='bg-white rounded-lg shadow-md p-6'>
              <h2 className='text-xl font-bold text-gray-800 mb-4'>
                Produtos Cadastrados
              </h2>

              {loading ? (
                <div className='text-center py-4'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto'></div>
                  <p className='mt-2 text-gray-600'>Carregando...</p>
                </div>
              ) : (
                <div className='max-h-96 overflow-y-auto'>
                  {produtos.length === 0 ? (
                    <p className='text-gray-500 text-center py-4'>
                      Nenhum produto cadastrado
                    </p>
                  ) : (
                    <div className='space-y-3'>
                      {produtos.map(produto => (
                        <div
                          key={produto._id}
                          className='border border-gray-200 rounded p-3'
                        >
                          <div className='flex justify-between items-start'>
                            <div>
                              <h3 className='font-medium'>{produto.nome}</h3>
                              <p className='text-sm text-gray-600'>
                                {produto.categoria}
                              </p>
                              <p className='text-sm font-medium text-green-600'>
                                R${' '}
                                {produto.preco
                                  ? produto.preco.toFixed(2)
                                  : '0.00'}
                              </p>
                            </div>
                            <button
                              onClick={() => deletarProduto(produto._id)}
                              className='bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600'
                            >
                              Deletar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'pedidos' && (
          <div className='bg-white rounded-lg shadow-md p-6'>
            <h2 className='text-xl font-bold text-gray-800 mb-4'>
              Gerenciar Pedidos
            </h2>
            <p className='text-gray-600'>
              Funcionalidade em desenvolvimento...
            </p>
          </div>
        )}

        {activeTab === 'fornecedores' && (
          <div className='bg-white rounded-lg shadow-md p-6'>
            <h2 className='text-xl font-bold text-gray-800 mb-4'>
              Gerenciar Fornecedores
            </h2>
            <div className='space-y-3'>
              {fornecedores.map(fornecedor => (
                <div
                  key={fornecedor._id}
                  className='border border-gray-200 rounded p-4'
                >
                  <h3 className='font-medium'>{fornecedor.nome}</h3>
                  <p className='text-sm text-gray-600'>
                    Código: {fornecedor.codigo}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
