// COMPONENTS/ADMIN/PRODUCTFORM.JS - SIMPLIFICADO
// ===================================

import { useState, useEffect } from 'react';

export default function ProductForm({ onSuccess, editingProduct = null }) {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fornecedores, setFornecedores] = useState([]);
  const [selectedFornecedor, setSelectedFornecedor] = useState(null);
  const [formData, setFormData] = useState({
    fornecedorId: editingProduct?.fornecedorId || '',
    codigo: editingProduct?.codigo || '',
    nome: editingProduct?.nome || '',
    descricao: editingProduct?.descricao || '',
    categoria: editingProduct?.categoria || '',
    preco: editingProduct?.preco || '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentImage, setCurrentImage] = useState(
    editingProduct?.imagem || ''
  );

  useEffect(() => {
    buscarFornecedores();
  }, []);

  useEffect(() => {
    if (formData.fornecedorId) {
      const fornecedor = fornecedores.find(
        f => f._id === formData.fornecedorId
      );
      setSelectedFornecedor(fornecedor);
      if (fornecedor && !editingProduct) {
        setFormData(prev => ({ ...prev, categoria: '' }));
      }
    }
  }, [formData.fornecedorId, fornecedores]);

  const buscarFornecedores = async () => {
    try {
      const response = await fetch('/api/admin/fornecedores');
      if (response.ok) {
        const data = await response.json();
        setFornecedores(data);
      }
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
    }
  };

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileSelect = e => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Arquivo muito grande. Máximo 5MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadImage = async () => {
    if (!selectedFile) return currentImage;

    setUploadingImage(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('images', selectedFile);

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      if (!response.ok) {
        throw new Error('Erro no upload da imagem');
      }

      const data = await response.json();
      return data.imageUrls[0];
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload da imagem');
      return currentImage;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload da imagem
      const imageUrl = await uploadImage();

      // Preparar dados do produto
      const productData = {
        ...formData,
        preco: parseFloat(formData.preco),
        imagem: imageUrl,
      };

      // Salvar produto
      const url = editingProduct
        ? `/api/admin/produtos?id=${editingProduct._id}`
        : '/api/admin/produtos';

      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (response.ok) {
        alert(
          editingProduct
            ? 'Produto atualizado com sucesso!'
            : 'Produto criado com sucesso!'
        );

        // Reset form apenas se não estiver editando
        if (!editingProduct) {
          setFormData({
            fornecedorId: '',
            codigo: '',
            nome: '',
            descricao: '',
            categoria: '',
            preco: '',
          });
          setCurrentImage('');
          setSelectedFile(null);
          setSelectedFornecedor(null);

          // Reset file input
          const fileInput = document.getElementById('imageFile');
          if (fileInput) fileInput.value = '';
        }

        onSuccess && onSuccess();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao salvar produto');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert(`Erro ao salvar produto: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='bg-white rounded-lg shadow-md p-6'>
      <h2 className='text-xl font-bold text-gray-800 mb-6'>
        {editingProduct ? 'Editar Produto' : 'Adicionar Produto'}
      </h2>

      <form onSubmit={handleSubmit} className='space-y-4'>
        {/* Fornecedor */}
        <div>
          <label className='block text-gray-700 font-medium mb-2'>
            Fornecedor *
          </label>
          <select
            name='fornecedorId'
            value={formData.fornecedorId}
            onChange={handleInputChange}
            className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
            required
          >
            <option value=''>Selecione um fornecedor</option>
            {fornecedores.map(f => (
              <option key={f._id} value={f._id}>
                {f.nome} ({f.codigo})
              </option>
            ))}
          </select>
        </div>

        {/* Categoria - só aparece quando fornecedor selecionado */}
        {selectedFornecedor && (
          <div>
            <label className='block text-gray-700 font-medium mb-2'>
              Categoria *
            </label>
            <select
              name='categoria'
              value={formData.categoria}
              onChange={handleInputChange}
              className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
              required
            >
              <option value=''>Selecione uma categoria</option>
              {selectedFornecedor.categorias?.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Código */}
        <div>
          <label className='block text-gray-700 font-medium mb-2'>
            Código do Produto *
          </label>
          <input
            type='text'
            name='codigo'
            value={formData.codigo}
            onChange={handleInputChange}
            placeholder='Ex: CAP-A-001'
            className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
            required
          />
        </div>

        {/* Nome */}
        <div>
          <label className='block text-gray-700 font-medium mb-2'>
            Nome do Produto *
          </label>
          <input
            type='text'
            name='nome'
            value={formData.nome}
            onChange={handleInputChange}
            className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
            required
          />
        </div>

        {/* Descrição */}
        <div>
          <label className='block text-gray-700 font-medium mb-2'>
            Descrição *
          </label>
          <textarea
            rows='3'
            name='descricao'
            value={formData.descricao}
            onChange={handleInputChange}
            className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
            required
          />
        </div>

        {/* Preço */}
        <div>
          <label className='block text-gray-700 font-medium mb-2'>
            Preço (R$) *
          </label>
          <input
            type='number'
            step='0.01'
            min='0'
            name='preco'
            value={formData.preco}
            onChange={handleInputChange}
            className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
            required
          />
        </div>

        {/* Imagem atual */}
        {currentImage && (
          <div>
            <label className='block text-gray-700 font-medium mb-2'>
              Imagem Atual
            </label>
            <img
              src={currentImage}
              alt='Produto'
              className='w-24 h-24 object-cover rounded border'
            />
          </div>
        )}

        {/* Upload de Imagem */}
        <div>
          <label className='block text-gray-700 font-medium mb-2'>
            {currentImage ? 'Alterar Imagem' : 'Imagem do Produto'}
          </label>
          <input
            type='file'
            id='imageFile'
            accept='image/*'
            onChange={handleFileSelect}
            className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
          />
          <p className='text-xs text-gray-500 mt-1'>
            Máximo 5MB. Formatos: JPG, PNG, WEBP
          </p>
        </div>

        {/* Preview da nova imagem */}
        {selectedFile && (
          <div>
            <label className='block text-gray-700 font-medium mb-2'>
              Preview da Nova Imagem
            </label>
            <img
              src={URL.createObjectURL(selectedFile)}
              alt='Preview'
              className='w-24 h-24 object-cover rounded border'
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          type='submit'
          disabled={loading || uploadingImage}
          className='w-full bg-blue-500 text-white py-3 rounded font-medium hover:bg-blue-600 transition disabled:opacity-50'
        >
          {loading || uploadingImage
            ? uploadingImage
              ? 'Fazendo upload...'
              : 'Salvando...'
            : editingProduct
            ? 'Atualizar Produto'
            : 'Salvar Produto'}
        </button>
      </form>
    </div>
  );
}
