// 17. PAGES/_APP.JS - CORRIGIDO
// ===================================

import '../styles/globals.css';
import { useState, useEffect, createContext, useContext } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export default function App({ Component, pageProps }) {
  const [cart, setCart] = useState([]);
  const [isClient, setIsClient] = useState(false);

  // Verificar se estamos no cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Carregar carrinho do localStorage apenas no cliente
  useEffect(() => {
    if (isClient) {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch (error) {
          console.error('Erro ao carregar carrinho:', error);
          localStorage.removeItem('cart');
        }
      }
    }
  }, [isClient]);

  // Salvar carrinho no localStorage apenas no cliente
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('cart', JSON.stringify(cart));
    }
  }, [cart, isClient]);

  const addToCart = (produto, quantidade) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item._id === produto._id);

      if (existingItem) {
        return prevCart.map(item =>
          item._id === produto._id
            ? { ...item, quantidade: item.quantidade + quantidade }
            : item
        );
      } else {
        return [...prevCart, { ...produto, quantidade }];
      }
    });
  };

  const removeFromCart = produtoId => {
    setCart(prevCart => prevCart.filter(item => item._id !== produtoId));
  };

  const updateQuantity = (produtoId, quantidade) => {
    if (quantidade <= 0) {
      removeFromCart(produtoId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item._id === produtoId ? { ...item, quantidade } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartValue = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal: cart.reduce(
      (total, item) => total + item.preco * item.quantidade,
      0
    ),
    cartCount: cart.reduce((count, item) => count + item.quantidade, 0),
    isClient,
  };

  return (
    <CartContext.Provider value={cartValue}>
      <Component {...pageProps} />
    </CartContext.Provider>
  );
}
