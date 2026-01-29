// COMPONENTS/ADMIN/PRODUCTFORM.JS - ATUALIZADO COM ETIQUETA E EMBALAGEM
// ===================================
// Removido: precoSemNF
// Adicionado: precoEtiqueta, precoEmbalagem

import { useState, useEffect } from 'react';

export default function ProductForm({ onSuccess, editingProduct = null }) {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fornecedores, setFornecedores] = useState([]);
  const [selectedFornecedor, setSelectedFornecedor] = useState(null);
  const [formData, setFormData] = useState({
    fornecedorId: editingProduct?.fornecedorId?._id || editingProduct?.fornecedorId || '',
    codigo: editingProduct?.codigo || '',
    nome: editingProduct?.nome || '',
    descricao: editingProduct?.descricao || '',
    categoria: editingProduct?.categoria || '',
    preco: editingProduct?.preco || '',
    precoEtiqueta: editingProduct?.precoEtiqueta || 0,
    precoEmbalagem: editingProduct?.precoEmbalagem || 0,
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentImage, setCurrentImage] = useState(editingProduct?.imagem || '');

  // Estado para rastrear campos modificados
  const [modifiedFields, setModifiedFields] = useState(new Set());

  useEffect(() => {
    buscarFornecedores();
  }, []);

  useEffect(() => {
    if (formData.fornecedorId) {
      const fornecedor = fornecedores.find(f => f._id === formData.fornecedorId);
      setSelectedFornecedor(fornecedor);
      if (fornecedor && !editingProduct) {
        setFormData(prev => ({ ...prev, categoria: '' }));
      }
    }
  }, [formData.fornecedorId, fornecedores]);

  // Resetar campos quando trocar de produto
  useEffect(() => {
    if (editingProduct) {
      setFormData({
        fornecedorId: editingProduct.fornecedorId?._id || editingProduct.fornecedorId || '',
        codigo: editingProduct.codigo || '',
        nome: editingProduct.nome || '',
        descricao: editingProduct.descricao || '',
        categoria: editingProduct.categoria || '',
        preco: editingProduct.preco || '',
        precoEtiqueta: editingProduct.precoEtiqueta || 0,
        precoEmbalagem: editingProduct.precoEmbalagem || 0,
      });
      setCurrentImage(editingProduct.imagem || '');
      setSelectedFile(null);
      setModifiedFields(new Set());
    }
  }, [editingProduct]);

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

    // Marcar campo como modificado
    if (editingProduct) {
      setModifiedFields(prev => new Set([...prev, name]));
    }
  };

  const handleFileSelect = e => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Arquivo muito grande. Máximo 5MB.');
        return;
      }
      setSelectedFile(file);
      if (editingProduct) {
        setModifiedFields(prev => new Set([...prev, 'imagem']));
      }
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

    // Validações
    const precoBase = parseFloat(formData.preco);
    const precoEtiqueta = parseFloat(formData.precoEtiqueta) || 0;
    const precoEmbalagem = parseFloat(formData.precoEmbalagem) || 0;

    if (isNaN(precoBase) || precoBase <= 0) {
      alert('❌ O preço base deve ser maior que zero!');
      return;
    }

    if (precoEtiqueta < 0 || precoEmbalagem < 0) {
      alert('❌ Os valores de etiqueta e embalagem não podem ser negativos!');
      return;
    }

    setLoading(true);

    try {
      // Upload da imagem (só se houver nova imagem)
      const imageUrl = await uploadImage();

      let productData;

      if (editingProduct) {
        // MODO EDIÇÃO: Enviar apenas campos modificados
        productData = {};

        const fornecedorIdAtual = editingProduct.fornecedorId?._id || editingProduct.fornecedorId;

        if (formData.fornecedorId !== fornecedorIdAtual) {
          productData.fornecedorId = formData.fornecedorId;
        }
        if (formData.codigo !== editingProduct.codigo) {
          productData.codigo = formData.codigo;
        }
        if (formData.nome !== editingProduct.nome) {
          productData.nome = formData.nome;
        }
        if (formData.descricao !== editingProduct.descricao) {
          productData.descricao = formData.descricao;
        }
        if (formData.categoria !== editingProduct.categoria) {
          productData.categoria = formData.categoria;
        }
        if (precoBase !== editingProduct.preco) {
          productData.preco = precoBase;
        }
        if (precoEtiqueta !== (editingProduct.precoEtiqueta || 0)) {
          productData.precoEtiqueta = precoEtiqueta;
        }
        if (precoEmbalagem !== (editingProduct.precoEmbalagem || 0)) {
          productData.precoEmbalagem = precoEmbalagem;
        }
        if (selectedFile) {
          productData.imagem = imageUrl;
        }

        if (Object.keys(productData).length === 0) {
          alert('⚠️ Nenhum campo foi modificado!');
          setLoading(false);
          return;
        }
      } else {
        // MODO CRIAÇÃO: Enviar todos os dados
        productData = {
          ...formData,
          preco: precoBase,
          precoEtiqueta: precoEtiqueta,
          precoEmbalagem: precoEmbalagem,
          imagem: imageUrl,
        };
      }

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
        const fieldsChanged = Object.keys(productData).length;
        const fieldNames = Object.keys(productData).join(', ');

        alert(
          editingProduct
            ? `✅ Produto atualizado com sucesso!\n\n${fieldsChanged} campo${
                fieldsChanged > 1 ? 's' : ''
              } modificado${fieldsChanged > 1 ? 's' : ''}:\n${fieldNames}`
            : '✅ Produto criado com sucesso!'
        );

        if (!editingProduct) {
          setFormData({
            fornecedorId: '',
            codigo: '',
            nome: '',
            descricao: '',
            categoria: '',
            preco: '',
            precoEtiqueta: 0,
            precoEmbalagem: 0,
          });
          setCurrentImage('');
          setSelectedFile(null);
          setSelectedFornecedor(null);
          setModifiedFields(new Set());

          const fileInput = document.getElementById('imageFile');
          if (fileInput) fileInput.value = '';
        } else {
          setModifiedFields(new Set());
          setSelectedFile(null);
        }

        onSuccess && onSuccess();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao salvar produto');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert(`❌ Erro ao salvar produto: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Calcular preço total para preview
  const precoBase = parseFloat(formData.preco) || 0;
  const precoEtiqueta = parseFloat(formData.precoEtiqueta) || 0;
  const precoEmbalagem = parseFloat(formData.precoEmbalagem) || 0;
  const precoTotal = precoBase + precoEtiqueta + precoEmbalagem;

  return (
    <div className='bg-white rounded-lg shadow-md p-4 sm:p-6'>
      <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-6'>
        <h2 className='text-lg sm:text-xl font-bold text-gray-800'>
          {editingProduct ? '✏️ Editar Produto' : '➕ Adicionar Produto'}
        </h2>
        {editingProduct && modifiedFields.size > 0 && (
          <span className='text-xs sm:text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full self-start sm:self-auto'>
            {modifiedFields.size} campo{modifiedFields.size > 1 ? 's' : ''} modificado
            {modifiedFields.size > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {editingProduct && (
        <div className='mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
          <p className='text-xs sm:text-sm text-blue-800'>
            <strong>ℹ️ Modo Edição:</strong> Modifique apenas os campos que deseja
            atualizar.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-4'>
        {/* Fornecedor */}
        <div>
          <label className='block text-gray-700 font-medium mb-2 text-sm sm:text-base'>
            Fornecedor *
            {editingProduct && modifiedFields.has('fornecedorId') && (
              <span className='ml-2 text-xs text-yellow-600'>● Modificado</span>
            )}
          </label>
          <select
            name='fornecedorId'
            value={formData.fornecedorId}
            onChange={handleInputChange}
            className={`w-full border rounded px-3 py-2 text-sm sm:text-base focus:outline-none focus:border-blue-500 ${
              modifiedFields.has('fornecedorId')
                ? 'border-yellow-400 bg-yellow-50'
                : 'border-gray-300'
            }`}
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

        {/* Categoria */}
        {selectedFornecedor && (
          <div>
            <label className='block text-gray-700 font-medium mb-2 text-sm sm:text-base'>
              Categoria *
              {editingProduct && modifiedFields.has('categoria') && (
                <span className='ml-2 text-xs text-yellow-600'>● Modificado</span>
              )}
            </label>
            <select
              name='categoria'
              value={formData.categoria}
              onChange={handleInputChange}
              className={`w-full border rounded px-3 py-2 text-sm sm:text-base focus:outline-none focus:border-blue-500 ${
                modifiedFields.has('categoria')
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-gray-300'
              }`}
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

        {/* Grid: Código e Nome */}
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
          <div>
            <label className='block text-gray-700 font-medium mb-2 text-sm sm:text-base'>
              Código do Produto *
              {editingProduct && modifiedFields.has('codigo') && (
                <span className='ml-2 text-xs text-yellow-600'>● Modificado</span>
              )}
            </label>
            <input
              type='text'
              name='codigo'
              value={formData.codigo}
              onChange={handleInputChange}
              placeholder='Ex: CAP-A-001'
              className={`w-full border rounded px-3 py-2 text-sm sm:text-base focus:outline-none focus:border-blue-500 ${
                modifiedFields.has('codigo')
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-gray-300'
              }`}
              required
            />
          </div>

          <div>
            <label className='block text-gray-700 font-medium mb-2 text-sm sm:text-base'>
              Nome do Produto *
              {editingProduct && modifiedFields.has('nome') && (
                <span className='ml-2 text-xs text-yellow-600'>● Modificado</span>
              )}
            </label>
            <input
              type='text'
              name='nome'
              value={formData.nome}
              onChange={handleInputChange}
              className={`w-full border rounded px-3 py-2 text-sm sm:text-base focus:outline-none focus:border-blue-500 ${
                modifiedFields.has('nome')
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-gray-300'
              }`}
              required
            />
          </div>
        </div>

        {/* Descrição */}
        <div>
          <label className='block text-gray-700 font-medium mb-2 text-sm sm:text-base'>
            Descrição *
            {editingProduct && modifiedFields.has('descricao') && (
              <span className='ml-2 text-xs text-yellow-600'>● Modificado</span>
            )}
          </label>
          <textarea
            rows='3'
            name='descricao'
            value={formData.descricao}
            onChange={handleInputChange}
            className={`w-full border rounded px-3 py-2 text-sm sm:text-base focus:outline-none focus:border-blue-500 ${
              modifiedFields.has('descricao')
                ? 'border-yellow-400 bg-yellow-50'
                : 'border-gray-300'
            }`}
            required
          />
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* SEÇÃO DE PREÇOS - ATUALIZADA */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className='bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4'>
          <h3 className='text-base sm:text-lg font-semibold text-blue-800 mb-2 flex items-center gap-2'>
            <span>💰</span>
            Definição de Preços
          </h3>
          <p className='text-xs sm:text-sm text-blue-700 mb-4'>
            Configure o preço base e os valores adicionais de etiqueta e embalagem.
          </p>

          {/* Preço Base */}
          <div className='mb-4'>
            <label className='block text-gray-700 font-medium mb-2 text-sm sm:text-base'>
              💵 Preço Base (R$) *
              {editingProduct && modifiedFields.has('preco') && (
                <span className='ml-2 text-xs text-yellow-600'>● Modificado</span>
              )}
            </label>
            <input
              type='number'
              step='0.01'
              min='0.01'
              name='preco'
              value={formData.preco}
              onChange={handleInputChange}
              className={`w-full border rounded px-3 py-2 text-sm sm:text-base focus:outline-none focus:border-blue-500 ${
                modifiedFields.has('preco')
                  ? 'border-yellow-400 bg-yellow-50'
                  : 'border-gray-300'
              }`}
              placeholder='Ex: 89.90'
              required
            />
            <p className='text-xs text-gray-500 mt-1'>
              Valor que vai para o fornecedor (base para royalties 5%)
            </p>
          </div>

          {/* Grid: Etiqueta e Embalagem */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            {/* Preço Etiqueta */}
            <div>
              <label className='block text-gray-700 font-medium mb-2 text-sm sm:text-base'>
                🏷️ Valor Etiqueta (R$)
                {editingProduct && modifiedFields.has('precoEtiqueta') && (
                  <span className='ml-2 text-xs text-yellow-600'>● Modificado</span>
                )}
              </label>
              <input
                type='number'
                step='0.01'
                min='0'
                name='precoEtiqueta'
                value={formData.precoEtiqueta}
                onChange={handleInputChange}
                className={`w-full border rounded px-3 py-2 text-sm sm:text-base focus:outline-none focus:border-blue-500 ${
                  modifiedFields.has('precoEtiqueta')
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-gray-300'
                }`}
                placeholder='0.00'
              />
              <p className='text-xs text-gray-500 mt-1'>Valor cobrado pela etiqueta</p>
            </div>

            {/* Preço Embalagem */}
            <div>
              <label className='block text-gray-700 font-medium mb-2 text-sm sm:text-base'>
                📦 Valor Embalagem (R$)
                {editingProduct && modifiedFields.has('precoEmbalagem') && (
                  <span className='ml-2 text-xs text-yellow-600'>● Modificado</span>
                )}
              </label>
              <input
                type='number'
                step='0.01'
                min='0'
                name='precoEmbalagem'
                value={formData.precoEmbalagem}
                onChange={handleInputChange}
                className={`w-full border rounded px-3 py-2 text-sm sm:text-base focus:outline-none focus:border-blue-500 ${
                  modifiedFields.has('precoEmbalagem')
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-gray-300'
                }`}
                placeholder='0.00'
              />
              <p className='text-xs text-gray-500 mt-1'>Valor cobrado pela embalagem</p>
            </div>
          </div>

          {/* Preview do Preço */}
          {precoBase > 0 && (
            <div className='mt-4 p-3 bg-white rounded border'>
              <h4 className='text-sm font-medium text-gray-800 mb-2'>
                📊 Composição do Preço:
              </h4>
              <div className='space-y-1 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Preço Base:</span>
                  <span className='font-medium'>R$ {precoBase.toFixed(2)}</span>
                </div>
                {precoEtiqueta > 0 && (
                  <div className='flex justify-between'>
                    <span className='text-gray-600'>+ Etiqueta:</span>
                    <span className='font-medium text-blue-600'>
                      R$ {precoEtiqueta.toFixed(2)}
                    </span>
                  </div>
                )}
                {precoEmbalagem > 0 && (
                  <div className='flex justify-between'>
                    <span className='text-gray-600'>+ Embalagem:</span>
                    <span className='font-medium text-purple-600'>
                      R$ {precoEmbalagem.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className='border-t pt-2 mt-2'>
                  <div className='flex justify-between font-bold'>
                    <span>Preço Final:</span>
                    <span className='text-green-600'>R$ {precoTotal.toFixed(2)}</span>
                  </div>
                </div>
                <div className='text-xs text-gray-500 mt-2 p-2 bg-yellow-50 rounded'>
                  💡 <strong>Royalties (5%):</strong> R$ {(precoBase * 0.05).toFixed(2)}{' '}
                  (calculado apenas sobre o preço base)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Imagem atual */}
        {currentImage && (
          <div>
            <label className='block text-gray-700 font-medium mb-2 text-sm sm:text-base'>
              Imagem Atual
            </label>
            <img
              src={currentImage}
              alt='Produto'
              className='w-20 h-20 sm:w-24 sm:h-24 object-cover rounded border'
            />
          </div>
        )}

        {/* Upload de Imagem */}
        <div>
          <label className='block text-gray-700 font-medium mb-2 text-sm sm:text-base'>
            {currentImage ? 'Alterar Imagem' : 'Imagem do Produto'}
            {editingProduct && selectedFile && (
              <span className='ml-2 text-xs text-yellow-600'>● Será atualizada</span>
            )}
          </label>
          <input
            type='file'
            id='imageFile'
            accept='image/*'
            onChange={handleFileSelect}
            className='w-full border border-gray-300 rounded px-3 py-2 text-sm sm:text-base focus:outline-none focus:border-blue-500'
          />
          <p className='text-xs text-gray-500 mt-1'>
            Máximo 5MB. Formatos: JPG, PNG, WEBP
            {editingProduct && ' (deixe em branco para manter a imagem atual)'}
          </p>
        </div>

        {/* Preview da nova imagem */}
        {selectedFile && (
          <div>
            <label className='block text-gray-700 font-medium mb-2 text-sm sm:text-base'>
              Preview da Nova Imagem
            </label>
            <img
              src={URL.createObjectURL(selectedFile)}
              alt='Preview'
              className='w-20 h-20 sm:w-24 sm:h-24 object-cover rounded border'
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          type='submit'
          disabled={loading || uploadingImage}
          className='w-full bg-blue-500 text-white py-3 rounded font-medium hover:bg-blue-600 transition disabled:opacity-50 text-sm sm:text-base'
        >
          {loading || uploadingImage
            ? uploadingImage
              ? '⏳ Fazendo upload...'
              : '⏳ Salvando...'
            : editingProduct
            ? modifiedFields.size > 0
              ? `💾 Atualizar ${modifiedFields.size} Campo${
                  modifiedFields.size > 1 ? 's' : ''
                }`
              : '💾 Atualizar Produto'
            : '✅ Salvar Produto'}
        </button>
      </form>
    </div>
  );
}