// COMPONENTS/CART.JS - SIMPLIFICADO (SEM OPÇÃO COM/SEM NF)
// ===================================
// Removido: lógica COM/SEM NF
// Preço único: base + etiqueta + embalagem
// Royalties: 5% apenas sobre preço BASE

import { useCart } from '../pages/_app';
import { useToastContext } from '../pages/_app';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function Cart({ isOpen, onClose }) {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    cartTotal,
    cartCount,
    clearCart,
    currentUser,
  } = useCart();

  const toast = useToastContext();
  const [isAnimating, setIsAnimating] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const [pendingClearCart, setPendingClearCart] = useState(false);

  // Animação de entrada
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    }
  }, [isOpen]);

  // Prevenir scroll do body quando cart está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      const item = cart.find(item => item._id === itemId);
      if (pendingRemoval === itemId) {
        removeFromCart(itemId);
        setPendingRemoval(null);
        toast.info(`${item?.nome} removido do carrinho`);
      } else {
        setPendingRemoval(itemId);
        toast.warning(
          `Clique novamente no "-" para remover ${item?.nome}`,
          3000
        );
        setTimeout(() => setPendingRemoval(null), 3000);
      }
      return;
    }
    updateQuantity(itemId, newQuantity);
    setPendingRemoval(null);
  };

  const handleClearCart = () => {
    if (pendingClearCart) {
      clearCart();
      setPendingClearCart(false);
    } else {
      setPendingClearCart(true);
      toast.warning(
        'Clique novamente em "Limpar carrinho" para confirmar',
        4000
      );
      setTimeout(() => setPendingClearCart(false), 4000);
    }
  };

  const handleRemoveItem = itemId => {
    const item = cart.find(item => item._id === itemId);
    if (pendingRemoval === itemId) {
      removeFromCart(itemId);
      setPendingRemoval(null);
      toast.info(`${item?.nome} removido do carrinho`);
    } else {
      setPendingRemoval(itemId);
      toast.warning(`Clique novamente no 🗑️ para remover ${item?.nome}`, 3000);
      setTimeout(() => setPendingRemoval(null), 3000);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // CÁLCULOS SIMPLIFICADOS
  // ══════════════════════════════════════════════════════════════

  // Subtotal BASE (para cálculo de royalties)
  const subtotalBase = cart.reduce(
    (total, item) => total + (item.preco || 0) * item.quantidade,
    0
  );

  // Total de etiquetas
  const totalEtiquetas = cart.reduce(
    (total, item) => total + (item.precoEtiqueta || 0) * item.quantidade,
    0
  );

  // Total de embalagens
  const totalEmbalagens = cart.reduce(
    (total, item) => total + (item.precoEmbalagem || 0) * item.quantidade,
    0
  );

  // Subtotal dos produtos (base + etiqueta + embalagem)
  const subtotalProdutos = subtotalBase + totalEtiquetas + totalEmbalagens;

  // Royalties = 5% APENAS do subtotal BASE
  const royalties = subtotalBase * 0.05;

  // Total final
  const total = subtotalProdutos + royalties;

  // Agrupar itens por fornecedor
  const itemsPorFornecedor = cart.reduce((acc, item) => {
    const fornecedorNome =
      item.fornecedorId?.nome || 'Fornecedor não identificado';
    if (!acc[fornecedorNome]) {
      acc[fornecedorNome] = [];
    }
    acc[fornecedorNome].push(item);
    return acc;
  }, {});

  // Função para calcular preço total unitário do item
  const getPrecoTotalItem = item => {
    return (item.preco || 0) + (item.precoEtiqueta || 0) + (item.precoEmbalagem || 0);
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end'>
      <div
        className={`bg-white w-full max-w-md h-full overflow-y-auto transform transition-transform duration-200 ${
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className='sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm z-10'>
          <div>
            <h2 className='text-xl font-bold'>Carrinho</h2>
            <p className='text-sm text-gray-600'>
              {cartCount} {cartCount === 1 ? 'item' : 'itens'}
            </p>
            {currentUser && (
              <p className='text-xs text-blue-600 font-medium'>
                👤 {currentUser.nome}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className='text-gray-500 hover:text-gray-700 text-2xl p-1 hover:bg-gray-100 rounded-full transition'
            aria-label='Fechar carrinho'
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className='p-4'>
          {cart.length === 0 ? (
            <div className='text-center py-12'>
              <div className='text-6xl mb-4 opacity-50'>🛒</div>
              <h3 className='text-lg font-medium text-gray-900 mb-2'>
                Seu carrinho está vazio
              </h3>
              <p className='text-gray-500 mb-6'>
                {currentUser
                  ? 'Adicione produtos para começar suas compras'
                  : 'Faça login para adicionar produtos ao carrinho'}
              </p>
              <button
                onClick={handleClose}
                className='bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition'
              >
                {currentUser ? 'Continuar Comprando' : 'Voltar'}
              </button>
            </div>
          ) : (
            <>
              {/* Botão Limpar Carrinho */}
              {cart.length > 1 && (
                <div className='mb-4'>
                  <button
                    onClick={handleClearCart}
                    className={`text-sm underline transition ${
                      pendingClearCart
                        ? 'text-red-700 font-medium animate-pulse'
                        : 'text-red-500 hover:text-red-700'
                    }`}
                  >
                    {pendingClearCart
                      ? '⚠️ Clique novamente para confirmar'
                      : 'Limpar carrinho'}
                  </button>
                </div>
              )}

              {/* Items agrupados por fornecedor */}
              <div className='space-y-4 mb-6'>
                {Object.entries(itemsPorFornecedor).map(
                  ([fornecedor, items]) => (
                    <div
                      key={fornecedor}
                      className='border border-gray-200 rounded-lg p-3'
                    >
                      <h3 className='font-medium text-gray-800 mb-3 border-b pb-2'>
                        {fornecedor}
                      </h3>

                      <div className='space-y-3'>
                        {items.map(item => {
                          const precoTotal = getPrecoTotalItem(item);
                          const subtotalItem = precoTotal * item.quantidade;

                          return (
                            <div
                              key={item._id}
                              className={`flex gap-3 p-2 rounded transition ${
                                pendingRemoval === item._id
                                  ? 'bg-red-50 border border-red-200'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              {/* Image */}
                              <div className='w-14 h-14 sm:w-16 sm:h-16 bg-gray-200 rounded flex-shrink-0 overflow-hidden'>
                                {item.imagem ? (
                                  <Image
                                    src={item.imagem}
                                    alt={item.nome}
                                    width={64}
                                    height={64}
                                    className='w-full h-full object-cover'
                                    onError={e => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div
                                  className='w-full h-full flex items-center justify-center text-gray-400 text-xs'
                                  style={{ display: item.imagem ? 'none' : 'flex' }}
                                >
                                  📦
                                </div>
                              </div>

                              {/* Details */}
                              <div className='flex-1 min-w-0'>
                                <h4
                                  className='font-medium text-sm mb-1 truncate'
                                  title={item.nome}
                                >
                                  {item.nome}
                                </h4>

                                {/* Preço unitário */}
                                <p className='text-xs text-gray-500 mb-1'>
                                  R$ {precoTotal.toFixed(2)} /un
                                </p>

                                {/* Quantity Controls */}
                                <div className='flex items-center gap-2'>
                                  <button
                                    onClick={() =>
                                      handleQuantityChange(
                                        item._id,
                                        item.quantidade - 1
                                      )
                                    }
                                    className={`w-7 h-7 rounded-full text-sm transition flex items-center justify-center ${
                                      pendingRemoval === item._id
                                        ? 'bg-red-200 text-red-700 animate-pulse'
                                        : item.quantidade <= 1
                                        ? 'bg-red-200 text-red-700 hover:bg-red-300'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                  >
                                    -
                                  </button>
                                  <span className='text-sm min-w-[25px] text-center font-medium'>
                                    {item.quantidade}
                                  </span>
                                  <button
                                    onClick={() =>
                                      handleQuantityChange(
                                        item._id,
                                        item.quantidade + 1
                                      )
                                    }
                                    className='w-7 h-7 bg-gray-200 text-gray-700 rounded-full text-sm hover:bg-gray-300 transition flex items-center justify-center'
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {/* Subtotal e Remove */}
                              <div className='flex flex-col items-end justify-between'>
                                <button
                                  onClick={() => handleRemoveItem(item._id)}
                                  className={`text-sm p-1 rounded transition ${
                                    pendingRemoval === item._id
                                      ? 'text-red-700 bg-red-100 animate-pulse'
                                      : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                                  }`}
                                  title={
                                    pendingRemoval === item._id
                                      ? 'Clique novamente para confirmar'
                                      : 'Remover item'
                                  }
                                >
                                  {pendingRemoval === item._id ? '⚠️' : '🗑️'}
                                </button>

                                <p className='font-bold text-green-600 text-sm'>
                                  R$ {subtotalItem.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* ══════════════════════════════════════════════════════════════ */}
              {/* RESUMO FINANCEIRO SIMPLIFICADO */}
              {/* ══════════════════════════════════════════════════════════════ */}
              <div className='border-t border-gray-200 pt-4 mb-6'>
                <div className='bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border'>
                  <h3 className='text-base font-bold text-gray-800 mb-3'>
                    📊 Resumo
                  </h3>

                  <div className='space-y-2 text-sm'>
                    <div className='flex justify-between'>
                      <span className='text-gray-600'>Subtotal Produtos:</span>
                      <span className='font-medium'>
                        R$ {subtotalProdutos.toFixed(2)}
                      </span>
                    </div>

                    <div className='flex justify-between text-gray-500'>
                      <span>Taxa de serviço (5%):</span>
                      <span>R$ {royalties.toFixed(2)}</span>
                    </div>

                    <div className='border-t pt-2 mt-2'>
                      <div className='flex justify-between font-bold text-lg'>
                        <span>Total:</span>
                        <span className='text-green-600'>
                          R$ {total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className='space-y-3 sticky bottom-0 bg-white pt-4 pb-2'>
                <button
                  onClick={() => {
                    handleClose();
                    window.location.href = '/checkout';
                  }}
                  disabled={!currentUser}
                  className='w-full bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <span>🛒</span>
                  {currentUser
                    ? `Finalizar Pedido - R$ ${total.toFixed(2)}`
                    : 'Faça Login para Continuar'}
                </button>

                <button
                  onClick={handleClose}
                  className='w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition'
                >
                  Continuar Comprando
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}