// 22. COMPONENTS/PRODUCTCARD.JS
// ===================================

import { useState } from 'react';
import { useCart } from '../pages/_app';
import Image from 'next/image';

export default function ProductCard({ produto }) {
  const [quantidade, setQuantidade] = useState(1);
  const { addToCart } = useCart();

  const handleAddToCart = () => {
    addToCart(produto, quantidade);
    setQuantidade(1);
    alert('Produto adicionado ao carrinho!');
  };

  return (
    <div className='bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition'>
      <div className='h-48 bg-gray-200 relative'>
        {produto.imagens && produto.imagens[0] ? (
          <Image
            src={produto.imagens[0]}
            alt={produto.nome}
            fill
            className='object-cover'
          />
        ) : (
          <div className='flex items-center justify-center h-full text-gray-500'>
            Sem imagem
          </div>
        )}
      </div>

      <div className='p-4'>
        <h3 className='font-bold text-gray-800 mb-2'>{produto.nome}</h3>
        <p className='text-gray-600 text-sm mb-3 line-clamp-2'>
          {produto.descricao}
        </p>
        <p className='text-red-500 font-bold text-lg mb-4'>
          R$ {produto.preco.toFixed(2)}
        </p>

        <div className='flex items-center gap-2 mb-4'>
          <button
            onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
            className='bg-gray-300 text-gray-700 w-8 h-8 rounded-full hover:bg-gray-400'
          >
            -
          </button>
          <input
            type='number'
            min='1'
            value={quantidade}
            onChange={e =>
              setQuantidade(Math.max(1, parseInt(e.target.value) || 1))
            }
            className='w-16 text-center border border-gray-300 rounded px-2 py-1'
          />
          <button
            onClick={() => setQuantidade(quantidade + 1)}
            className='bg-gray-300 text-gray-700 w-8 h-8 rounded-full hover:bg-gray-400'
          >
            +
          </button>
        </div>

        <button
          onClick={handleAddToCart}
          className='w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 transition'
        >
          Adicionar ao Carrinho
        </button>
      </div>
    </div>
  );
}
