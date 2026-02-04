// COMPONENTS/ADMIN/PRODUCTFORM.JS - ATUALIZADO COM DRAG AND DROP
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
    precoEtiqueta: editingProduct?.precoEtiqueta || 0,
    precoEmbalagem: editingProduct?.precoEmbalagem || 0,
  });

  // 🆕 MÚLTIPLAS IMAGENS
  const [selectedFiles, setSelectedFiles] = useState([]); // Array de novos arquivos
  const [currentImages, setCurrentImages] = useState([]); // Array de URLs existentes
  const [imagesToRemove, setImagesToRemove] = useState([]); // URLs marcadas para remoção

  // Estado para rastrear campos modificados
  const [modifiedFields, setModifiedFields] = useState(new Set());

  // 🆕 Estado para drag and drop
  const [isDragging, setIsDragging] = useState(false);

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

      // 🆕 Carregar imagens existentes (compatível com formato antigo e novo)
      const existingImages = [];
      if (editingProduct.imagens && editingProduct.imagens.length > 0) {
        existingImages.push(...editingProduct.imagens);
      } else if (editingProduct.imagem) {
        existingImages.push(editingProduct.imagem);
      }
      setCurrentImages(existingImages);

      setSelectedFiles([]);
      setImagesToRemove([]);
      setModifiedFields(new Set());
    } else {
      // Modo criação - limpar tudo
      setCurrentImages([]);
      setSelectedFiles([]);
      setImagesToRemove([]);
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

    if (editingProduct) {
      setModifiedFields(prev => new Set([...prev, name]));
    }
  };

  // 🆕 VALIDAR E PROCESSAR ARQUIVOS
  const processFiles = (files) => {
    const validFiles = files.filter(file => {
      // Validar tipo
      if (!file.type.startsWith('image/')) {
        alert(`Arquivo ${file.name} não é uma imagem válida.`);
        return false;
      }

      // Validar tamanho
      if (file.size > 5 * 1024 * 1024) {
        alert(`Arquivo ${file.name} é muito grande. Máximo 5MB.`);
        return false;
      }

      return true;
    });

    // Limitar total de imagens
    const totalImages = currentImages.length - imagesToRemove.length + selectedFiles.length + validFiles.length;
    if (totalImages > 10) {
      alert('Máximo de 10 imagens por produto.');
      const available = 10 - (currentImages.length - imagesToRemove.length + selectedFiles.length);
      return validFiles.slice(0, available);
    }

    return validFiles;
  };

  // 🆕 SELEÇÃO DE MÚLTIPLOS ARQUIVOS
  const handleFileSelect = e => {
    const files = Array.from(e.target.files);
    const validFiles = processFiles(files);

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      
      if (editingProduct) {
        setModifiedFields(prev => new Set([...prev, 'imagens']));
      }
    }

    // Limpar input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  // 🆕 DRAG AND DROP - HANDLERS
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Verificar se realmente saiu da área (não apenas mudou de elemento filho)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = processFiles(files);

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      
      if (editingProduct) {
        setModifiedFields(prev => new Set([...prev, 'imagens']));
      }

      // Feedback visual
      console.log(`✅ ${validFiles.length} imagem(ns) adicionada(s)`);
    }
  };

  // 🆕 REMOVER IMAGEM EXISTENTE
  const handleRemoveCurrentImage = (imageUrl) => {
    setImagesToRemove(prev => [...prev, imageUrl]);
    if (editingProduct) {
      setModifiedFields(prev => new Set([...prev, 'imagens']));
    }
  };

  // 🆕 RESTAURAR IMAGEM MARCADA PARA REMOÇÃO
  const handleRestoreImage = (imageUrl) => {
    setImagesToRemove(prev => prev.filter(url => url !== imageUrl));
  };

  // 🆕 REMOVER ARQUIVO SELECIONADO (ainda não enviado)
  const handleRemoveSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 🆕 REORDENAR IMAGENS (arrastar)
  const handleMoveImage = (fromIndex, direction) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= currentImages.length) return;

    const newImages = [...currentImages];
    [newImages[fromIndex], newImages[toIndex]] = [newImages[toIndex], newImages[fromIndex]];
    setCurrentImages(newImages);

    if (editingProduct) {
      setModifiedFields(prev => new Set([...prev, 'imagens']));
    }
  };

  // 🆕 UPLOAD DE MÚLTIPLAS IMAGENS
  const uploadImages = async () => {
    if (selectedFiles.length === 0) {
      // Retornar apenas as imagens existentes (menos as removidas)
      return currentImages.filter(url => !imagesToRemove.includes(url));
    }

    setUploadingImage(true);
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
      const newImageUrls = data.imageUrls || [];

      // Combinar: imagens existentes (menos removidas) + novas
      const finalImages = [
        ...currentImages.filter(url => !imagesToRemove.includes(url)),
        ...newImageUrls,
      ];

      return finalImages;
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload das imagens');
      return currentImages.filter(url => !imagesToRemove.includes(url));
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
      // Upload das imagens
      const imageUrls = await uploadImages();

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

        // 🆕 Verificar se imagens foram modificadas
        if (modifiedFields.has('imagens')) {
          productData.imagens = imageUrls;
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
          imagens: imageUrls, // 🆕 Array de imagens
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
          setCurrentImages([]);
          setSelectedFiles([]);
          setImagesToRemove([]);
          setSelectedFornecedor(null);
          setModifiedFields(new Set());

          const fileInput = document.getElementById('imageFiles');
          if (fileInput) fileInput.value = '';
        } else {
          setModifiedFields(new Set());
          setSelectedFiles([]);
          setImagesToRemove([]);
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

  // 🆕 Contagem de imagens
  const totalImagesCount = currentImages.length - imagesToRemove.length + selectedFiles.length;

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
            <strong>ℹ️ Modo Edição:</strong> Modifique apenas os campos que deseja atualizar.
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
        {/* SEÇÃO DE PREÇOS */}
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

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* 🆕 SEÇÃO DE IMAGENS - COM DRAG AND DROP */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className='bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4'>
          <h3 className='text-base sm:text-lg font-semibold text-purple-800 mb-2 flex items-center gap-2'>
            <span>🖼️</span>
            Imagens do Produto
            <span className='text-xs font-normal bg-purple-200 px-2 py-1 rounded-full'>
              {totalImagesCount}/10
            </span>
            {editingProduct && modifiedFields.has('imagens') && (
              <span className='ml-2 text-xs text-yellow-600'>● Modificado</span>
            )}
          </h3>
          <p className='text-xs sm:text-sm text-purple-700 mb-4'>
            Adicione até 10 imagens. A primeira será a imagem principal exibida no catálogo.
          </p>

          {/* Imagens Atuais */}
          {currentImages.length > 0 && (
            <div className='mb-4'>
              <label className='block text-gray-700 font-medium mb-2 text-sm'>
                Imagens Atuais ({currentImages.length - imagesToRemove.length})
              </label>
              <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3'>
                {currentImages.map((imageUrl, index) => {
                  const isMarkedForRemoval = imagesToRemove.includes(imageUrl);
                  return (
                    <div
                      key={imageUrl}
                      className={`relative group rounded-lg overflow-hidden border-2 ${
                        isMarkedForRemoval
                          ? 'border-red-400 opacity-50'
                          : index === 0
                          ? 'border-green-400'
                          : 'border-gray-200'
                      }`}
                    >
                      <img
                        src={imageUrl}
                        alt={`Imagem ${index + 1}`}
                        className='w-full aspect-square object-cover'
                      />

                      {/* Badge de principal */}
                      {index === 0 && !isMarkedForRemoval && (
                        <span className='absolute top-1 left-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded'>
                          Principal
                        </span>
                      )}

                      {/* Controles */}
                      <div className='absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1'>
                        {isMarkedForRemoval ? (
                          <button
                            type='button'
                            onClick={() => handleRestoreImage(imageUrl)}
                            className='bg-green-500 text-white p-1.5 rounded-full hover:bg-green-600'
                            title='Restaurar'
                          >
                            ↩️
                          </button>
                        ) : (
                          <>
                            {/* Mover para esquerda */}
                            {index > 0 && (
                              <button
                                type='button'
                                onClick={() => handleMoveImage(index, -1)}
                                className='bg-white text-gray-800 p-1.5 rounded-full hover:bg-gray-200'
                                title='Mover para esquerda'
                              >
                                ◀
                              </button>
                            )}
                            {/* Mover para direita */}
                            {index < currentImages.length - 1 && (
                              <button
                                type='button'
                                onClick={() => handleMoveImage(index, 1)}
                                className='bg-white text-gray-800 p-1.5 rounded-full hover:bg-gray-200'
                                title='Mover para direita'
                              >
                                ▶
                              </button>
                            )}
                            {/* Remover */}
                            <button
                              type='button'
                              onClick={() => handleRemoveCurrentImage(imageUrl)}
                              className='bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600'
                              title='Remover'
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {imagesToRemove.length > 0 && (
                <p className='text-xs text-red-600 mt-2'>
                  ⚠️ {imagesToRemove.length} imagem(ns) marcada(s) para remoção
                </p>
              )}
            </div>
          )}

          {/* Preview de Novos Arquivos */}
          {selectedFiles.length > 0 && (
            <div className='mb-4'>
              <label className='block text-gray-700 font-medium mb-2 text-sm'>
                Novas Imagens ({selectedFiles.length})
              </label>
              <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3'>
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className='relative group rounded-lg overflow-hidden border-2 border-blue-400'
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Nova ${index + 1}`}
                      className='w-full aspect-square object-cover'
                    />
                    <span className='absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-0.5 rounded'>
                      Nova
                    </span>
                    <button
                      type='button'
                      onClick={() => handleRemoveSelectedFile(index)}
                      className='absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs'
                      title='Remover'
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🆕 ÁREA DE DRAG AND DROP */}
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`relative transition-all duration-200 ${
              totalImagesCount >= 10 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <label
              htmlFor='imageFiles'
              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
                totalImagesCount >= 10
                  ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                  : isDragging
                  ? 'border-purple-500 bg-purple-100 scale-105 shadow-lg'
                  : 'border-purple-300 bg-purple-50 hover:bg-purple-100 hover:border-purple-400'
              }`}
            >
              <div className='flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none'>
                {isDragging ? (
                  <>
                    <svg
                      className='w-10 h-10 mb-2 text-purple-600 animate-bounce'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
                      />
                    </svg>
                    <p className='text-base font-semibold text-purple-700'>
                      Solte as imagens aqui! 📸
                    </p>
                  </>
                ) : (
                  <>
                    <svg
                      className='w-8 h-8 mb-2 text-purple-500'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
                      />
                    </svg>
                    <p className='text-sm text-purple-600 font-medium'>
                      {totalImagesCount >= 10
                        ? 'Limite de imagens atingido'
                        : 'Arraste imagens aqui ou clique para selecionar'}
                    </p>
                    <p className='text-xs text-gray-500 mt-1'>
                      PNG, JPG, WEBP até 5MB cada
                    </p>
                  </>
                )}
              </div>
              <input
                type='file'
                id='imageFiles'
                accept='image/*'
                multiple
                onChange={handleFileSelect}
                disabled={totalImagesCount >= 10}
                className='hidden'
              />
            </label>

            {/* Overlay visual durante drag */}
            {isDragging && (
              <div className='absolute inset-0 pointer-events-none rounded-lg ring-4 ring-purple-400 ring-opacity-50' />
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type='submit'
          disabled={loading || uploadingImage}
          className='w-full bg-blue-500 text-white py-3 rounded font-medium hover:bg-blue-600 transition disabled:opacity-50 text-sm sm:text-base'
        >
          {loading || uploadingImage
            ? uploadingImage
              ? `⏳ Fazendo upload de ${selectedFiles.length} imagem(ns)...`
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