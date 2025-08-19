// COMPONENTS/CART.JS - MELHORADO
// ===================================

import { useCart } from '../pages/_app';
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
  } = useCart();
  const [isAnimating, setIsAnimating] = useState(false);

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
      if (confirm('Deseja remover este item do carrinho?')) {
        removeFromCart(itemId);
      }
      return;
    }
    updateQuantity(itemId, newQuantity);
  };

  const handleClearCart = () => {
    if (confirm('Deseja limpar todo o carrinho?')) {
      clearCart();
    }
  };

  const royalties = cartTotal * 0.05;
  const total = cartTotal + royalties;

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
          </div>
          <button
            onClick={handleClose}
            className='text-gray-500 hover:text-gray-700 text-2xl p-1 hover:bg-gray-100 rounded-full transition'
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
                Adicione produtos para começar suas compras
              </p>
              <button
                onClick={handleClose}
                className='bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition'
              >
                Continuar Comprando
              </button>
            </div>
          ) : (
            <>
              {/* Botão Limpar Carrinho */}
              {cart.length > 1 && (
                <div className='mb-4'>
                  <button
                    onClick={handleClearCart}
                    className='text-red-500 hover:text-red-700 text-sm underline'
                  >
                    Limpar carrinho
                  </button>
                </div>
              )}

              {/* Items agrupados por fornecedor */}
              <div className='space-y-6 mb-6'>
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
                        {items.map(item => (
                          <div
                            key={item._id}
                            className='flex gap-3 p-2 hover:bg-gray-50 rounded transition'
                          >
                            {/* Image */}
                            <div className='w-16 h-16 bg-gray-200 rounded flex-shrink-0 overflow-hidden'>
                              {item.imagens && item.imagens[0] ? (
                                <Image
                                  src={item.imagens[0]}
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
                                style={{
                                  display:
                                    item.imagens && item.imagens[0]
                                      ? 'none'
                                      : 'flex',
                                }}
                              >
                                Sem imagem
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
                              <p className='text-green-600 font-bold text-sm mb-2'>
                                R$ {item.preco?.toFixed(2) || '0.00'}
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
                                  className='w-7 h-7 bg-gray-200 text-gray-700 rounded-full text-sm hover:bg-gray-300 transition flex items-center justify-center'
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

                              {/* Subtotal */}
                              <p className='text-xs text-gray-600 mt-1'>
                                Subtotal: R${' '}
                                {((item.preco || 0) * item.quantidade).toFixed(
                                  2
                                )}
                              </p>
                            </div>

                            {/* Remove Button */}
                            <button
                              onClick={() => {
                                if (confirm('Remover item do carrinho?')) {
                                  removeFromCart(item._id);
                                }
                              }}
                              className='text-red-500 hover:text-red-700 text-sm p-1 hover:bg-red-50 rounded transition self-start'
                              title='Remover item'
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Total */}
              <div className='border-t border-gray-200 pt-4 mb-6 bg-gray-50 p-4 rounded-lg'>
                <div className='space-y-2'>
                  <div className='flex justify-between items-center'>
                    <span className='font-medium'>Subtotal:</span>
                    <span>R$ {cartTotal.toFixed(2)}</span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600'>
                      Royalties (5%):
                    </span>
                    <span className='text-sm'>R$ {royalties.toFixed(2)}</span>
                  </div>
                  <div className='flex justify-between items-center font-bold text-lg border-t pt-2'>
                    <span>Total:</span>
                    <span className='text-green-600'>
                      R$ {total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className='space-y-3 sticky bottom-0 bg-white pt-4'>
                <button
                  onClick={() => {
                    handleClose();
                    window.location.href = '/checkout';
                  }}
                  className='w-full bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition flex items-center justify-center gap-2'
                >
                  <span>🛒</span>
                  Finalizar Pedido
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
