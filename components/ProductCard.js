// COMPONENTS/PRODUCTCARD.JS - SIMPLIFICADO
// ===================================

import { useState } from 'react';
import { useCart } from '../pages/_app';
import Image from 'next/image';

export default function ProductCard({ produto }) {
  const [quantidade, setQuantidade] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { addToCart } = useCart();

  const handleAddToCart = async () => {
    setIsLoading(true);
    try {
      await addToCart(produto, quantidade);
      setQuantidade(1);

      // Notificação simples
      const toast = document.createElement('div');
      toast.className =
        'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = '✅ Adicionado ao carrinho!';
      document.body.appendChild(toast);

      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 3000);
    } catch (error) {
      console.error('Erro ao adicionar ao carrinho:', error);
      alert('Erro ao adicionar produto ao carrinho');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow'>
      {/* Imagem */}
      <div className='h-48 bg-gray-200 relative'>
        {produto.imagem ? (
          <Image
            src={produto.imagem}
            alt={produto.nome}
            fill
            className='object-cover'
            onError={e => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className='h-full flex items-center justify-center text-gray-500 bg-gray-100'
          style={{ display: produto.imagem ? 'none' : 'flex' }}
        >
          <div className='text-center'>
            <span className='text-3xl block mb-2'>📦</span>
            <span className='text-sm'>Sem imagem</span>
          </div>
        </div>
      </div>

      <div className='p-4'>
        {/* Código e categoria */}
        <div className='flex justify-between items-center mb-2'>
          <span className='bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium'>
            {produto.codigo}
          </span>
          <span className='text-xs text-gray-500'>{produto.categoria}</span>
        </div>

        {/* Nome */}
        <h3 className='font-bold text-gray-800 mb-2 text-lg line-clamp-2'>
          {produto.nome}
        </h3>

        {/* Descrição */}
        <p className='text-gray-600 text-sm mb-3 line-clamp-2'>
          {produto.descricao}
        </p>

        {/* Preço */}
        <div className='mb-4'>
          <p className='text-green-600 font-bold text-xl'>
            R$ {produto.preco?.toFixed(2) || '0.00'}
          </p>
        </div>

        {/* Controles de quantidade */}
        <div className='flex items-center gap-3 mb-4'>
          <label className='text-sm text-gray-600 font-medium'>
            Quantidade:
          </label>
          <div className='flex items-center border border-gray-300 rounded'>
            <button
              onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
              className='w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition'
            >
              -
            </button>
            <input
              type='number'
              min='1'
              max='99'
              value={quantidade}
              onChange={e =>
                setQuantidade(Math.max(1, parseInt(e.target.value) || 1))
              }
              className='w-12 text-center border-0 focus:outline-none py-1'
            />
            <button
              onClick={() => setQuantidade(Math.min(99, quantidade + 1))}
              className='w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition'
            >
              +
            </button>
          </div>
        </div>

        {/* Subtotal */}
        {quantidade > 1 && (
          <div className='mb-4 text-sm text-gray-600'>
            Subtotal:{' '}
            <span className='font-medium'>
              R$ {((produto.preco || 0) * quantidade).toFixed(2)}
            </span>
          </div>
        )}

        {/* Botão adicionar ao carrinho */}
        <button
          onClick={handleAddToCart}
          disabled={isLoading}
          className={`w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
            isLoading
              ? 'bg-blue-400 text-white cursor-wait'
              : 'bg-green-500 text-white hover:bg-green-600 active:transform active:scale-95'
          }`}
        >
          {isLoading ? (
            <>
              <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
              Adicionando...
            </>
          ) : (
            <>
              <span>🛒</span>
              Adicionar ao Carrinho
            </>
          )}
        </button>

        {/* Info do fornecedor */}
        <div className='mt-3 pt-3 border-t border-gray-100'>
          <p className='text-xs text-gray-500'>
            Fornecedor: {produto.fornecedorId?.nome || 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
}
