// COMPONENTS/CART.JS
// ===================================

import { useCart } from '../pages/_app';
import Image from 'next/image';

export default function Cart({ isOpen, onClose }) {
  const { cart, removeFromCart, updateQuantity, cartTotal, cartCount } =
    useCart();

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end'>
      <div className='bg-white w-full max-w-md h-full overflow-y-auto'>
        {/* Header */}
        <div className='sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center'>
          <h2 className='text-xl font-bold'>Carrinho ({cartCount})</h2>
          <button
            onClick={onClose}
            className='text-gray-500 hover:text-gray-700 text-2xl'
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className='p-4'>
          {cart.length === 0 ? (
            <div className='text-center py-8'>
              <div className='text-4xl mb-4'>🛒</div>
              <p className='text-gray-500'>Seu carrinho está vazio</p>
            </div>
          ) : (
            <>
              {/* Items */}
              <div className='space-y-4 mb-6'>
                {cart.map(item => (
                  <div
                    key={item._id}
                    className='border border-gray-200 rounded-lg p-4'
                  >
                    <div className='flex gap-3'>
                      {/* Image */}
                      <div className='w-16 h-16 bg-gray-200 rounded flex-shrink-0'>
                        {item.imagens && item.imagens[0] ? (
                          <Image
                            src={item.imagens[0]}
                            alt={item.nome}
                            width={64}
                            height={64}
                            className='w-full h-full object-cover rounded'
                          />
                        ) : (
                          <div className='w-full h-full flex items-center justify-center text-gray-400 text-xs'>
                            Sem imagem
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className='flex-1 min-w-0'>
                        <h3 className='font-medium text-sm mb-1 truncate'>
                          {item.nome}
                        </h3>
                        <p className='text-green-600 font-bold text-sm'>
                          R$ {item.preco.toFixed(2)}
                        </p>

                        {/* Quantity Controls */}
                        <div className='flex items-center gap-2 mt-2'>
                          <button
                            onClick={() =>
                              updateQuantity(item._id, item.quantidade - 1)
                            }
                            className='w-6 h-6 bg-gray-200 text-gray-700 rounded-full text-sm hover:bg-gray-300'
                          >
                            -
                          </button>
                          <span className='text-sm min-w-[20px] text-center'>
                            {item.quantidade}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item._id, item.quantidade + 1)
                            }
                            className='w-6 h-6 bg-gray-200 text-gray-700 rounded-full text-sm hover:bg-gray-300'
                          >
                            +
                          </button>
                        </div>

                        {/* Subtotal */}
                        <p className='text-xs text-gray-600 mt-1'>
                          Subtotal: R${' '}
                          {(item.preco * item.quantidade).toFixed(2)}
                        </p>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(item._id)}
                        className='text-red-500 hover:text-red-700 text-sm p-1'
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className='border-t border-gray-200 pt-4 mb-6'>
                <div className='flex justify-between items-center mb-2'>
                  <span className='font-medium'>Subtotal:</span>
                  <span>R$ {cartTotal.toFixed(2)}</span>
                </div>
                <div className='flex justify-between items-center mb-2'>
                  <span className='text-sm text-gray-600'>Royalties (5%):</span>
                  <span className='text-sm'>
                    R$ {(cartTotal * 0.05).toFixed(2)}
                  </span>
                </div>
                <div className='flex justify-between items-center font-bold text-lg border-t pt-2'>
                  <span>Total:</span>
                  <span>R$ {(cartTotal * 1.05).toFixed(2)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className='space-y-3'>
                <button
                  onClick={() => {
                    onClose();
                    window.location.href = '/checkout';
                  }}
                  className='w-full bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition'
                >
                  Finalizar Pedido
                </button>
                <button
                  onClick={onClose}
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
