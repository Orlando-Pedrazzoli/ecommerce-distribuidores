// COMPONENTS/ADMIN/PRODUCTFORM.JS
// ===================================

import { useState } from 'react';

export default function ProductForm({ onSuccess, editingProduct = null }) {
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [formData, setFormData] = useState({
    nome: editingProduct?.nome || '',
    fornecedorId: editingProduct?.fornecedorId || '',
    categoria: editingProduct?.categoria || 'Capas',
    preco: editingProduct?.preco || '',
    descricao: editingProduct?.descricao || '',
    estoque: editingProduct?.estoque || '',
    sku: editingProduct?.sku || '',
    peso: editingProduct?.peso || '',
    tags: editingProduct?.tags?.join(', ') || '',
  });
  const [imagens, setImagens] = useState(editingProduct?.imagens || []);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const fornecedores = [
    { _id: '507f1f77bcf86cd799439011', nome: 'Fornecedor A', codigo: 'A' },
    { _id: '507f1f77bcf86cd799439012', nome: 'Fornecedor B', codigo: 'B' },
    { _id: '507f1f77bcf86cd799439013', nome: 'Fornecedor C', codigo: 'C' },
  ];

  const categorias = ['Capas', 'Decks', 'Leashes', 'Acessórios'];

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileSelect = e => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const uploadImages = async () => {
    if (selectedFiles.length === 0) return [];

    setUploadingImages(true);
    try {
      const formDataUpload = new FormData();
      selectedFiles.forEach(file => {
        formDataUpload.append('images', file);
      });

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      if (!response.ok) {
        throw new Error('Erro no upload das imagens');
      }

      const data = await response.json();
      return data.imageUrls;
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload das imagens');
      return [];
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload das novas imagens
      const newImageUrls = await uploadImages();
      const allImages = [...imagens, ...newImageUrls];

      // Preparar dados do produto
      const productData = {
        ...formData,
        preco: parseFloat(formData.preco),
        estoque: parseInt(formData.estoque) || 0,
        peso: parseFloat(formData.peso) || 0,
        tags: formData.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag),
        imagens: allImages,
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

        // Reset form
        setFormData({
          nome: '',
          fornecedorId: '',
          categoria: 'Capas',
          preco: '',
          descricao: '',
          estoque: '',
          sku: '',
          peso: '',
          tags: '',
        });
        setImagens([]);
        setSelectedFiles([]);

        // Reset file input
        const fileInput = document.getElementById('images');
        if (fileInput) fileInput.value = '';

        onSuccess && onSuccess();
      } else {
        throw new Error('Erro ao salvar produto');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao salvar produto');
    } finally {
      setLoading(false);
    }
  };

  const removeImage = index => {
    setImagens(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className='bg-white rounded-lg shadow-md p-6'>
      <h2 className='text-xl font-bold text-gray-800 mb-6'>
        {editingProduct ? 'Editar Produto' : 'Adicionar Novo Produto'}
      </h2>

      <form onSubmit={handleSubmit} className='space-y-4'>
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

        {/* SKU */}
        <div>
          <label className='block text-gray-700 font-medium mb-2'>
            SKU (Código do Produto)
          </label>
          <input
            type='text'
            name='sku'
            value={formData.sku}
            onChange={handleInputChange}
            className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
            placeholder='Ex: CAP001'
          />
        </div>

        {/* Fornecedor e Categoria */}
        <div className='grid md:grid-cols-2 gap-4'>
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
                  {f.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className='block text-gray-700 font-medium mb-2'>
              Categoria *
            </label>
            <select
              name='categoria'
              value={formData.categoria}
              onChange={handleInputChange}
              className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
            >
              {categorias.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Preço, Estoque e Peso */}
        <div className='grid md:grid-cols-3 gap-4'>
          <div>
            <label className='block text-gray-700 font-medium mb-2'>
              Preço (R$) *
            </label>
            <input
              type='number'
              step='0.01'
              name='preco'
              value={formData.preco}
              onChange={handleInputChange}
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
              name='estoque'
              value={formData.estoque}
              onChange={handleInputChange}
              className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
            />
          </div>
          <div>
            <label className='block text-gray-700 font-medium mb-2'>
              Peso (kg)
            </label>
            <input
              type='number'
              step='0.01'
              name='peso'
              value={formData.peso}
              onChange={handleInputChange}
              className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
              placeholder='0.5'
            />
          </div>
        </div>

        {/* Descrição */}
        <div>
          <label className='block text-gray-700 font-medium mb-2'>
            Descrição *
          </label>
          <textarea
            rows='4'
            name='descricao'
            value={formData.descricao}
            onChange={handleInputChange}
            className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
            required
          ></textarea>
        </div>

        {/* Tags */}
        <div>
          <label className='block text-gray-700 font-medium mb-2'>
            Tags (separadas por vírgula)
          </label>
          <input
            type='text'
            name='tags'
            value={formData.tags}
            onChange={handleInputChange}
            className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
            placeholder='Ex: azul, impermeável, premium'
          />
        </div>

        {/* Imagens Atuais */}
        {imagens.length > 0 && (
          <div>
            <label className='block text-gray-700 font-medium mb-2'>
              Imagens Atuais
            </label>
            <div className='flex flex-wrap gap-2'>
              {imagens.map((img, index) => (
                <div key={index} className='relative'>
                  <img
                    src={img}
                    alt={`Produto ${index + 1}`}
                    className='w-20 h-20 object-cover rounded border'
                  />
                  <button
                    type='button'
                    onClick={() => removeImage(index)}
                    className='absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs hover:bg-red-600'
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload de Imagens */}
        <div>
          <label className='block text-gray-700 font-medium mb-2'>
            {editingProduct ? 'Adicionar Mais Imagens' : 'Imagens do Produto'}
          </label>
          <input
            type='file'
            id='images'
            multiple
            accept='image/*'
            onChange={handleFileSelect}
            className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
          />
          <p className='text-xs text-gray-500 mt-1'>
            Máximo 5MB por imagem. Formatos: JPG, PNG, WEBP
          </p>
        </div>

        {/* Preview das novas imagens */}
        {selectedFiles.length > 0 && (
          <div>
            <label className='block text-gray-700 font-medium mb-2'>
              Preview das Novas Imagens
            </label>
            <div className='flex flex-wrap gap-2'>
              {selectedFiles.map((file, index) => (
                <div key={index} className='relative'>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Preview ${index + 1}`}
                    className='w-20 h-20 object-cover rounded border'
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type='submit'
          disabled={loading || uploadingImages}
          className='w-full bg-blue-500 text-white py-3 rounded font-medium hover:bg-blue-600 transition disabled:opacity-50'
        >
          {loading || uploadingImages
            ? uploadingImages
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
