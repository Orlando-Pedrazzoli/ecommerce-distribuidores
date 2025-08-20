// COMPONENTS/CART.JS - ATUALIZADO COM TOAST SYSTEM
// ===================================

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

  const toast = useToastContext(); // ✅ Hook do toast
  const [isAnimating, setIsAnimating] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState(null); // ✅ Para controlar remoção
  const [pendingClearCart, setPendingClearCart] = useState(false); // ✅ Para controlar limpeza

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
      // ✅ NOVO: Sistema de confirmação com toast
      const item = cart.find(item => item._id === itemId);
      if (pendingRemoval === itemId) {
        // Segunda vez clicando - confirmar remoção
        removeFromCart(itemId);
        setPendingRemoval(null);
        toast.info(`${item?.nome} removido do carrinho`);
      } else {
        // Primeira vez - mostrar aviso
        setPendingRemoval(itemId);
        toast.warning(
          `Clique novamente no "-" para remover ${item?.nome}`,
          3000
        );
        // Auto-cancelar após 3 segundos
        setTimeout(() => {
          setPendingRemoval(null);
        }, 3000);
      }
      return;
    }
    updateQuantity(itemId, newQuantity);
    setPendingRemoval(null); // Cancelar remoção pendente se aumentar quantidade
  };

  const handleClearCart = () => {
    if (pendingClearCart) {
      // Segunda vez clicando - confirmar limpeza
      clearCart();
      setPendingClearCart(false);
      // Toast já é chamado automaticamente no clearCart
    } else {
      // Primeira vez - mostrar aviso
      setPendingClearCart(true);
      toast.warning(
        'Clique novamente em "Limpar carrinho" para confirmar',
        4000
      );
      // Auto-cancelar após 4 segundos
      setTimeout(() => {
        setPendingClearCart(false);
      }, 4000);
    }
  };

  const handleRemoveItem = itemId => {
    const item = cart.find(item => item._id === itemId);
    if (pendingRemoval === itemId) {
      // Segunda vez clicando - confirmar remoção
      removeFromCart(itemId);
      setPendingRemoval(null);
      toast.info(`${item?.nome} removido do carrinho`);
    } else {
      // Primeira vez - mostrar aviso
      setPendingRemoval(itemId);
      toast.warning(`Clique novamente no 🗑️ para remover ${item?.nome}`, 3000);
      // Auto-cancelar após 3 segundos
      setTimeout(() => {
        setPendingRemoval(null);
      }, 3000);
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
            {currentUser && (
              <p className='text-xs text-blue-600 font-medium'>
                👤 {currentUser.nome}
              </p>
            )}
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
                            className={`flex gap-3 p-2 rounded transition ${
                              pendingRemoval === item._id
                                ? 'bg-red-50 border border-red-200'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            {/* Image */}
                            <div className='w-16 h-16 bg-gray-200 rounded flex-shrink-0 overflow-hidden'>
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
                                style={{
                                  display: item.imagem ? 'none' : 'flex',
                                }}
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
                              onClick={() => handleRemoveItem(item._id)}
                              className={`text-sm p-1 rounded transition self-start ${
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
                  disabled={!currentUser}
                  className='w-full bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  <span>🛒</span>
                  {currentUser
                    ? 'Finalizar Pedido'
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
