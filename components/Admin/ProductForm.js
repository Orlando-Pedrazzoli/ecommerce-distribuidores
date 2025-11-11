// COMPONENTS/ADMIN/PRODUCTFORM.JS - ATUALIZADO COM EDIÇÃO PARCIAL
// ===================================

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
    precoSemNF: editingProduct?.precoSemNF || '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentImage, setCurrentImage] = useState(
    editingProduct?.imagem || ''
  );

  // 🆕 Estado para rastrear campos modificados
  const [modifiedFields, setModifiedFields] = useState(new Set());

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

  // 🆕 Resetar campos modificados quando trocar de produto
  useEffect(() => {
    if (editingProduct) {
      setFormData({
        fornecedorId: editingProduct.fornecedorId?._id || editingProduct.fornecedorId || '',
        codigo: editingProduct.codigo || '',
        nome: editingProduct.nome || '',
        descricao: editingProduct.descricao || '',
        categoria: editingProduct.categoria || '',
        preco: editingProduct.preco || '',
        precoSemNF: editingProduct.precoSemNF || '',
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

    // 🆕 Marcar campo como modificado
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
      // 🆕 Marcar imagem como modificada
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

    // 🆕 VALIDAÇÃO: Verificar se precoSemNF é menor que preco
    const precoNormal = parseFloat(formData.preco);
    const precoSemNota = parseFloat(formData.precoSemNF);

    if (precoSemNota >= precoNormal) {
      alert('❌ O preço sem NF deve ser menor que o preço com NF!');
      return;
    }

    setLoading(true);

    try {
      // Upload da imagem (só se houver nova imagem selecionada)
      const imageUrl = await uploadImage();

      // 🆕 MODO EDIÇÃO: Enviar apenas campos modificados
      let productData;

      if (editingProduct) {
        // Criar objeto apenas com campos que foram modificados
        productData = {};

        // Verificar cada campo individualmente
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
        if (precoNormal !== editingProduct.preco) {
          productData.preco = precoNormal;
        }
        if (precoSemNota !== editingProduct.precoSemNF) {
          productData.precoSemNF = precoSemNota;
        }
        // Só atualizar imagem se houver nova
        if (selectedFile) {
          productData.imagem = imageUrl;
        }

        // 🔥 Se nenhum campo foi modificado
        if (Object.keys(productData).length === 0) {
          alert('⚠️ Nenhum campo foi modificado!');
          setLoading(false);
          return;
        }
      } else {
        // MODO CRIAÇÃO: Enviar todos os dados
        productData = {
          ...formData,
          preco: precoNormal,
          precoSemNF: precoSemNota,
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

        // Reset form apenas se não estiver editando
        if (!editingProduct) {
          setFormData({
            fornecedorId: '',
            codigo: '',
            nome: '',
            descricao: '',
            categoria: '',
            preco: '',
            precoSemNF: '',
          });
          setCurrentImage('');
          setSelectedFile(null);
          setSelectedFornecedor(null);
          setModifiedFields(new Set());

          // Reset file input
          const fileInput = document.getElementById('imageFile');
          if (fileInput) fileInput.value = '';
        } else {
          // Limpar campos modificados após sucesso
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

  return (
    <div className='bg-white rounded-lg shadow-md p-6'>
      <div className='flex justify-between items-center mb-6'>
        <h2 className='text-xl font-bold text-gray-800'>
          {editingProduct ? '✏️ Editar Produto' : '➕ Adicionar Produto'}
        </h2>
        {editingProduct && modifiedFields.size > 0 && (
          <span className='text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full'>
            {modifiedFields.size} campo{modifiedFields.size > 1 ? 's' : ''} modificado{modifiedFields.size > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {editingProduct && (
        <div className='mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
          <p className='text-sm text-blue-800'>
            <strong>ℹ️ Modo Edição:</strong> Modifique apenas os campos que deseja atualizar. 
            Os campos não alterados manterão seus valores originais.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-4'>
        {/* Fornecedor */}
        <div>
          <label className='block text-gray-700 font-medium mb-2'>
            Fornecedor *
            {editingProduct && modifiedFields.has('fornecedorId') && (
              <span className='ml-2 text-xs text-yellow-600'>● Modificado</span>
            )}
          </label>
          <select
            name='fornecedorId'
            value={formData.fornecedorId}
            onChange={handleInputChange}
            className={`w-full border rounded px-3 py-2 focus:outline-none focus:border-blue-500 ${
              modifiedFields.has('fornecedorId') ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
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

        {/* Categoria - só aparece quando fornecedor selecionado */}
        {selectedFornecedor && (
          <div>
            <label className='block text-gray-700 font-medium mb-2'>
              Categoria *
              {editingProduct && modifiedFields.has('categoria') && (
                <span className='ml-2 text-xs text-yellow-600'>● Modificado</span>
              )}
            </label>
            <select
              name='categoria'
              value={formData.categoria}
              onChange={handleInputChange}
              className={`w-full border rounded px-3 py-2 focus:outline-none focus:border-blue-500 ${
                modifiedFields.has('categoria') ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
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

        {/* Código */}
        <div>
          <label className='block text-gray-700 font-medium mb-2'>
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
            className={`w-full border rounded px-3 py-2 focus:outline-none focus:border-blue-500 ${
              modifiedFields.has('codigo') ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
            }`}
            required
          />
        </div>

        {/* Nome */}
        <div>
          <label className='block text-gray-700 font-medium mb-2'>
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
            className={`w-full border rounded px-3 py-2 focus:outline-none focus:border-blue-500 ${
              modifiedFields.has('nome') ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
            }`}
            required
          />
        </div>

        {/* Descrição */}
        <div>
          <label className='block text-gray-700 font-medium mb-2'>
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
            className={`w-full border rounded px-3 py-2 focus:outline-none focus:border-blue-500 ${
              modifiedFields.has('descricao') ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
            }`}
            required
          />
        </div>

        {/* 🆕 SEÇÃO DE PREÇOS */}
        <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
          <h3 className='text-lg font-semibold text-blue-800 mb-3 flex items-center gap-2'>
            <span>💰</span>
            Definição de Preços
          </h3>
          <p className='text-sm text-blue-700 mb-4'>
            Configure os dois preços para este produto. O preço sem NF deve ser
            sempre menor que o preço com NF.
          </p>

          <div className='grid md:grid-cols-2 gap-4'>
            {/* Preço com NF */}
            <div>
              <label className='block text-gray-700 font-medium mb-2'>
                💳 Preço COM Nota Fiscal (R$) *
                {editingProduct && modifiedFields.has('preco') && (
                  <span className='ml-2 text-xs text-yellow-600'>● Modificado</span>
                )}
              </label>
              <input
                type='number'
                step='0.01'
                min='0'
                name='preco'
                value={formData.preco}
                onChange={handleInputChange}
                className={`w-full border rounded px-3 py-2 focus:outline-none focus:border-blue-500 ${
                  modifiedFields.has('preco') ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
                }`}
                placeholder='Ex: 89.90'
                required
              />
              <p className='text-xs text-gray-500 mt-1'>
                Preço normal com nota fiscal
              </p>
            </div>

            {/* Preço sem NF */}
            <div>
              <label className='block text-gray-700 font-medium mb-2'>
                🏷️ Preço SEM Nota Fiscal (R$) *
                {editingProduct && modifiedFields.has('precoSemNF') && (
                  <span className='ml-2 text-xs text-yellow-600'>● Modificado</span>
                )}
              </label>
              <input
                type='number'
                step='0.01'
                min='0'
                name='precoSemNF'
                value={formData.precoSemNF}
                onChange={handleInputChange}
                className={`w-full border rounded px-3 py-2 focus:outline-none focus:border-blue-500 ${
                  modifiedFields.has('precoSemNF') ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'
                }`}
                placeholder='Ex: 79.90'
                required
              />
              <p className='text-xs text-gray-500 mt-1'>
                Preço reduzido sem nota fiscal
              </p>
            </div>
          </div>

          {/* Preview da diferença */}
          {formData.preco && formData.precoSemNF && (
            <div className='mt-4 p-3 bg-white rounded border'>
              <h4 className='text-sm font-medium text-gray-800 mb-2'>
                📊 Diferença de Preços:
              </h4>
              <div className='grid grid-cols-2 gap-4 text-sm'>
                <div className='text-center'>
                  <p className='text-blue-600 font-medium'>Com NF</p>
                  <p className='text-xl font-bold text-blue-600'>
                    R$ {parseFloat(formData.preco || 0).toFixed(2)}
                  </p>
                </div>
                <div className='text-center'>
                  <p className='text-green-600 font-medium'>Sem NF</p>
                  <p className='text-xl font-bold text-green-600'>
                    R$ {parseFloat(formData.precoSemNF || 0).toFixed(2)}
                  </p>
                </div>
              </div>
              {formData.preco && formData.precoSemNF && (
                <div className='mt-2 text-center'>
                  <p className='text-xs text-gray-600'>
                    Economia: R${' '}
                    {(
                      parseFloat(formData.preco || 0) -
                      parseFloat(formData.precoSemNF || 0)
                    ).toFixed(2)}
                    {' ('}
                    {(
                      ((parseFloat(formData.preco || 0) -
                        parseFloat(formData.precoSemNF || 0)) /
                        parseFloat(formData.preco || 0)) *
                      100
                    ).toFixed(1)}
                    %)
                  </p>
                </div>
              )}
            </div>
          )}
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
            {editingProduct && selectedFile && (
              <span className='ml-2 text-xs text-yellow-600'>● Será atualizada</span>
            )}
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
            {editingProduct && ' (deixe em branco para manter a imagem atual)'}
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
              ? '⏳ Fazendo upload...'
              : '⏳ Salvando...'
            : editingProduct
            ? modifiedFields.size > 0
              ? `💾 Atualizar ${modifiedFields.size} Campo${modifiedFields.size > 1 ? 's' : ''}`
              : '💾 Atualizar Produto'
            : '✅ Salvar Produto'}
        </button>
      </form>
    </div>
  );
}