// COMPONENTS/PRODUCTCARD.JS - SIMPLIFICADO (APENAS PREÇO BASE)
// ===================================

import { useState } from 'react';
import { useCart } from '../pages/_app';
import { useToastContext } from '../pages/_app';
import Image from 'next/image';

export default function ProductCard({ produto }) {
  const [quantidade, setQuantidade] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { addToCart } = useCart();
  const toast = useToastContext();

  const handleAddToCart = async () => {
    setIsLoading(true);
    try {
      await addToCart(produto, quantidade);
      setQuantidade(1);
    } catch (error) {
      console.error('Erro ao adicionar ao carrinho:', error);
      toast.error('Erro ao adicionar produto ao carrinho');
    } finally {
      setIsLoading(false);
    }
  };

  const descricaoCompleta = produto.descricao || '';

  // Calcular preço total (base + etiqueta + embalagem)
  const precoTotal =
    (produto.preco || 0) +
    (produto.precoEtiqueta || 0) +
    (produto.precoEmbalagem || 0);

  const subtotal = precoTotal * quantidade;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Imagem */}
      <div className="aspect-square bg-gray-200 relative">
        {produto.imagem ? (
          <Image
            src={produto.imagem}
            alt={produto.nome}
            fill
            className="object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="h-full flex items-center justify-center text-gray-500 bg-gray-100"
          style={{ display: produto.imagem ? 'none' : 'flex' }}
        >
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-gray-300 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <span className="text-sm text-gray-400">Sem imagem</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Código e categoria */}
        <div className="flex justify-between items-center mb-2">
          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-medium">
            {produto.codigo}
          </span>
          <span className="text-xs text-gray-500">{produto.categoria}</span>
        </div>

        {/* Nome */}
        <h3 className="font-bold text-gray-800 mb-2 text-lg line-clamp-2">
          {produto.nome}
        </h3>

        {/* Descrição com botão expansível */}
        <div className="mb-3">
          <button
            onClick={() => setShowFullDescription(!showFullDescription)}
            className="w-full flex items-center justify-between p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <span className="text-sm text-gray-700 font-medium flex items-center gap-2">
              📄 Ver descrição
            </span>
            <span
              className={`text-gray-500 transition-transform duration-200 ${
                showFullDescription ? 'rotate-180' : ''
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </span>
          </button>

          {showFullDescription && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-200">
              <p className="text-gray-600 text-sm leading-relaxed">
                {descricaoCompleta || 'Sem descrição disponível'}
              </p>
            </div>
          )}
        </div>

        {/* PREÇO ÚNICO */}
        <div className="mb-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-100">
            <p className="text-xs text-blue-600 font-medium mb-1">Preço unitário</p>
            <p className="text-2xl font-bold text-blue-600">
              R$ {precoTotal.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Controles de quantidade */}
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-gray-600 font-medium">Quantidade:</label>
          <div className="flex items-center border border-gray-300 rounded">
            <button
              onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
              className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
            >
              -
            </button>
            <input
              type="number"
              min="1"
              max="99"
              value={quantidade}
              onChange={(e) =>
                setQuantidade(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="w-12 text-center border-0 focus:outline-none py-1"
            />
            <button
              onClick={() => setQuantidade(Math.min(99, quantidade + 1))}
              className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition"
            >
              +
            </button>
          </div>
        </div>

        {/* Subtotal (apenas se quantidade > 1) */}
        {quantidade > 1 && (
          <div className="mb-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-sm text-gray-600">
                Subtotal: <span className="font-bold text-blue-600">R$ {subtotal.toFixed(2)}</span>
              </p>
            </div>
          </div>
        )}

        {/* Botão adicionar ao carrinho */}
        <button
          onClick={handleAddToCart}
          disabled={isLoading}
          className={`w-full py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
            isLoading
              ? 'bg-gray-400 text-white cursor-wait'
              : 'bg-green-500 text-white hover:bg-green-600 active:transform active:scale-95'
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Adicionando...
            </>
          ) : (
            'Adicionar ao Carrinho'
          )}
        </button>

        {/* Info do fornecedor */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Fornecedor: {produto.fornecedorId?.nome || 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
}