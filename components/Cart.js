// COMPONENTS/CART.JS - ATUALIZADO COM CÁLCULO DUPLO DE PREÇOS
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
        setTimeout(() => {
          setPendingRemoval(null);
        }, 3000);
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
      setTimeout(() => {
        setPendingClearCart(false);
      }, 4000);
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
      setTimeout(() => {
        setPendingRemoval(null);
      }, 3000);
    }
  };

  // 🆕 CÁLCULOS DUPLOS
  const subtotalComNF = cart.reduce(
    (total, item) => total + (item.preco || 0) * item.quantidade,
    0
  );

  const subtotalSemNF = cart.reduce(
    (total, item) => total + (item.precoSemNF || 0) * item.quantidade,
    0
  );

  const royaltiesComNF = subtotalComNF * 0.05;
  const royaltiesSemNF = subtotalSemNF * 0.05;

  const totalComNF = subtotalComNF + royaltiesComNF;
  const totalSemNF = subtotalSemNF + royaltiesSemNF;

  const economiaTotal = totalComNF - totalSemNF;

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

                              {/* 🆕 PREÇOS DUPLOS NO CARRINHO */}
                              <div className='mb-2'>
                                <div className='grid grid-cols-2 gap-2 text-xs'>
                                  <div className='text-center bg-blue-50 rounded p-1'>
                                    <p className='text-blue-600 font-medium'>
                                      COM NF
                                    </p>
                                    <p className='font-bold text-blue-600'>
                                      R$ {(item.preco || 0).toFixed(2)}
                                    </p>
                                  </div>
                                  <div className='text-center bg-green-50 rounded p-1'>
                                    <p className='text-green-600 font-medium'>
                                      SEM NF
                                    </p>
                                    <p className='font-bold text-green-600'>
                                      R$ {(item.precoSemNF || 0).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              </div>

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

                              {/* 🆕 SUBTOTAIS DUPLOS */}
                              <div className='text-xs text-gray-600 mt-2 space-y-1'>
                                <div className='flex justify-between'>
                                  <span>Subtotal COM NF:</span>
                                  <span className='font-medium text-blue-600'>
                                    R${' '}
                                    {(
                                      (item.preco || 0) * item.quantidade
                                    ).toFixed(2)}
                                  </span>
                                </div>
                                <div className='flex justify-between'>
                                  <span>Subtotal SEM NF:</span>
                                  <span className='font-medium text-green-600'>
                                    R${' '}
                                    {(
                                      (item.precoSemNF || 0) * item.quantidade
                                    ).toFixed(2)}
                                  </span>
                                </div>
                                <div className='flex justify-between pt-1 border-t'>
                                  <span>💰 Economia:</span>
                                  <span className='font-bold text-red-600'>
                                    R${' '}
                                    {(
                                      ((item.preco || 0) -
                                        (item.precoSemNF || 0)) *
                                      item.quantidade
                                    ).toFixed(2)}
                                  </span>
                                </div>
                              </div>
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

              {/* 🆕 TOTAIS DUPLOS - DESIGN MELHORADO */}
              <div className='border-t border-gray-200 pt-4 mb-6'>
                <div className='bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border'>
                  <h3 className='text-lg font-bold text-gray-800 mb-3 text-center'>
                    📊 Resumo de Preços
                  </h3>

                  <div className='grid grid-cols-2 gap-4 mb-4'>
                    {/* Coluna COM NF */}
                    <div className='text-center bg-blue-100 rounded-lg p-3'>
                      <h4 className='text-sm font-bold text-blue-800 mb-2'>
                        💳 COM NF
                      </h4>
                      <div className='space-y-1 text-sm'>
                        <div className='flex justify-between'>
                          <span>Subtotal:</span>
                          <span className='font-medium'>
                            R$ {subtotalComNF.toFixed(2)}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Royalties (5%):</span>
                          <span>R$ {royaltiesComNF.toFixed(2)}</span>
                        </div>
                        <div className='border-t pt-1'>
                          <div className='flex justify-between font-bold text-blue-600'>
                            <span>Total:</span>
                            <span>R$ {totalComNF.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Coluna SEM NF */}
                    <div className='text-center bg-green-100 rounded-lg p-3'>
                      <h4 className='text-sm font-bold text-green-800 mb-2'>
                        🏷️ SEM NF
                      </h4>
                      <div className='space-y-1 text-sm'>
                        <div className='flex justify-between'>
                          <span>Subtotal:</span>
                          <span className='font-medium'>
                            R$ {subtotalSemNF.toFixed(2)}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span>Royalties (5%):</span>
                          <span>R$ {royaltiesSemNF.toFixed(2)}</span>
                        </div>
                        <div className='border-t pt-1'>
                          <div className='flex justify-between font-bold text-green-600'>
                            <span>Total:</span>
                            <span>R$ {totalSemNF.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Economia Total */}
                  <div className='bg-white rounded-lg p-3 text-center border-2 border-red-200'>
                    <h4 className='text-lg font-bold text-red-600 mb-1'>
                      💰 ECONOMIA TOTAL
                    </h4>
                    <p className='text-2xl font-bold text-red-600'>
                      R$ {economiaTotal.toFixed(2)}
                    </p>
                    <p className='text-xs text-gray-600'>
                      {((economiaTotal / totalComNF) * 100).toFixed(1)}% de
                      desconto
                    </p>
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

                {/* Nota importante sobre escolha de preço */}
                <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-3'>
                  <p className='text-xs text-yellow-800 text-center'>
                    💡 <strong>Importante:</strong> Você escolherá entre preço
                    COM ou SEM NF durante o checkout.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
