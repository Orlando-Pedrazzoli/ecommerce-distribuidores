// COMPONENTS/PRODUCTCARD.JS - COM CAROUSEL E DETALHAMENTO DE PREÇOS
// ===================================
import { useState, useEffect } from 'react';
import { useCart } from '../pages/_app';
import { useToastContext } from '../pages/_app';
import Image from 'next/image';

export default function ProductCard({ produto }) {
  const [quantidade, setQuantidade] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { addToCart } = useCart();
  const toast = useToastContext();

  // 🆕 Estado do Carousel
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  // 🆕 Obter array de imagens (compatível com formato antigo e novo)
  const getImages = () => {
    const imgs = [];
    if (produto.imagens && produto.imagens.length > 0) {
      imgs.push(...produto.imagens);
    } else if (produto.imagem) {
      imgs.push(produto.imagem);
    }
    return imgs;
  };

  const images = getImages();
  const hasMultipleImages = images.length > 1;

  // 🆕 Auto-play do carousel quando hover
  useEffect(() => {
    if (!hasMultipleImages || !isHovering) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [hasMultipleImages, isHovering, images.length]);

  // 🆕 Navegação manual do carousel
  const goToImage = (index) => {
    setCurrentImageIndex(index);
  };

  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

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

  // Calcular preços
  const precoBase = produto.preco || 0;
  const precoEtiqueta = produto.precoEtiqueta || 0;
  const precoEmbalagem = produto.precoEmbalagem || 0;
  const precoTotal = precoBase + precoEtiqueta + precoEmbalagem;
  const temAcrescimos = precoEtiqueta > 0 || precoEmbalagem > 0;

  const subtotal = precoTotal * quantidade;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* 🆕 CAROUSEL DE IMAGENS */}
      <div
        className="aspect-square bg-gray-200 relative group"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {images.length > 0 ? (
          <>
            {/* Imagem atual */}
            <Image
              src={images[currentImageIndex]}
              alt={`${produto.nome} - Imagem ${currentImageIndex + 1}`}
              fill
              className="object-cover transition-opacity duration-300"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />

            {/* Navegação do Carousel (só aparece com múltiplas imagens) */}
            {hasMultipleImages && (
              <>
                {/* Setas de navegação */}
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  aria-label="Imagem anterior"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  aria-label="Próxima imagem"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Indicadores (bolinhas) */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        goToImage(index);
                      }}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex
                          ? 'bg-white w-4'
                          : 'bg-white/50 hover:bg-white/75'
                      }`}
                      aria-label={`Ir para imagem ${index + 1}`}
                    />
                  ))}
                </div>

                {/* Contador de imagens */}
                <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  {currentImageIndex + 1}/{images.length}
                </span>
              </>
            )}
          </>
        ) : (
          // Placeholder quando não tem imagem
          <div className="h-full flex items-center justify-center text-gray-500 bg-gray-100">
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
        )}

        {/* Miniaturas (opcional - para desktop) */}
        {hasMultipleImages && images.length <= 5 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
            <div className="flex justify-center gap-1">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToImage(index);
                  }}
                  className={`w-10 h-10 rounded overflow-hidden border-2 transition ${
                    index === currentImageIndex
                      ? 'border-white'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Miniatura ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
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

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* 🆕 SEÇÃO DE PREÇOS DETALHADA */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="mb-4">
          <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-4 border border-blue-100">
            {/* Se tem acréscimos, mostra detalhamento */}
            {temAcrescimos ? (
              <div className="space-y-2">
                {/* Cabeçalho */}
                <p className="text-xs text-gray-500 font-medium text-center mb-2">
                  Composição do preço
                </p>

                {/* Preço Base */}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 flex items-center gap-1.5">
                    <span className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center text-xs">
                      💵
                    </span>
                    Produto
                  </span>
                  <span className="font-medium text-gray-800">
                    R$ {precoBase.toFixed(2)}
                  </span>
                </div>

                {/* Etiqueta (se houver) */}
                {precoEtiqueta > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 flex items-center gap-1.5">
                      <span className="w-5 h-5 bg-yellow-100 rounded flex items-center justify-center text-xs">
                        🏷️
                      </span>
                      Etiqueta
                    </span>
                    <span className="font-medium text-yellow-600">
                      + R$ {precoEtiqueta.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Embalagem (se houver) */}
                {precoEmbalagem > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 flex items-center gap-1.5">
                      <span className="w-5 h-5 bg-purple-100 rounded flex items-center justify-center text-xs">
                        📦
                      </span>
                      Embalagem
                    </span>
                    <span className="font-medium text-purple-600">
                      + R$ {precoEmbalagem.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Linha divisória */}
                <div className="border-t border-gray-200 my-2"></div>

                {/* Total */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-semibold">Total unitário</span>
                  <span className="text-xl font-bold text-green-600">
                    R$ {precoTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              // Se não tem acréscimos, mostra só o preço
              <div className="text-center">
                <p className="text-xs text-blue-600 font-medium mb-1">Preço unitário</p>
                <p className="text-2xl font-bold text-blue-600">
                  R$ {precoTotal.toFixed(2)}
                </p>
              </div>
            )}
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
            <div className="bg-gray-50 rounded-lg p-3">
              {/* Detalhamento do subtotal */}
              <div className="text-xs text-gray-500 mb-1 text-center">
                {quantidade}x R$ {precoTotal.toFixed(2)}
              </div>
              <div className="text-center">
                <span className="text-sm text-gray-600">Subtotal: </span>
                <span className="font-bold text-lg text-green-600">
                  R$ {subtotal.toFixed(2)}
                </span>
              </div>
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
            <>
              🛒 Adicionar ao Carrinho
            </>
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