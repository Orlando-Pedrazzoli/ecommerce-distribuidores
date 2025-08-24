// pages/_app.js - ATUALIZADO COM SUPORTE A PREÇO SEM NF
// ===================================

import '../styles/globals.css';
import { useState, useEffect, createContext, useContext } from 'react';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ToastContainer';

const CartContext = createContext();
const ToastContext = createContext();

export const useCart = () => useContext(CartContext);
export const useToastContext = () => useContext(ToastContext);

export default function App({ Component, pageProps }) {
  const [cart, setCart] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isClient, setIsClient] = useState(false);

  const toast = useToast();

  // Verificar se estamos no cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Verificar usuário atual e carregar carrinho específico
  useEffect(() => {
    if (isClient) {
      verificarUsuarioAtual();
    }
  }, [isClient]);

  // Verificar usuário logado
  const verificarUsuarioAtual = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        const novoUsuario = data.user;

        // Se mudou de usuário, limpar carrinho anterior e carregar novo
        if (currentUser?.id !== novoUsuario?.id) {
          console.log(
            '👤 Usuário mudou:',
            currentUser?.nome,
            '→',
            novoUsuario?.nome
          );
          setCurrentUser(novoUsuario);
          carregarCarrinhoDoUsuario(novoUsuario.id);
        }
      } else {
        // Não logado - limpar tudo
        if (currentUser) {
          console.log('🚪 Usuário deslogado');
          setCurrentUser(null);
          setCart([]);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
      setCurrentUser(null);
      setCart([]);
    }
  };

  // Carregar carrinho específico do usuário
  const carregarCarrinhoDoUsuario = userId => {
    if (!userId) {
      setCart([]);
      return;
    }

    const chaveCarrinho = `cart_${userId}`;
    const savedCart = localStorage.getItem(chaveCarrinho);

    if (savedCart) {
      try {
        const carrinhoCarregado = JSON.parse(savedCart);
        console.log(
          `🛒 Carrinho carregado para ${userId}:`,
          carrinhoCarregado.length,
          'itens'
        );
        setCart(carrinhoCarregado);
      } catch (error) {
        console.error('Erro ao carregar carrinho:', error);
        localStorage.removeItem(chaveCarrinho);
        setCart([]);
      }
    } else {
      setCart([]);
    }
  };

  // Salvar carrinho específico do usuário
  useEffect(() => {
    if (isClient && currentUser?.id) {
      const chaveCarrinho = `cart_${currentUser.id}`;
      localStorage.setItem(chaveCarrinho, JSON.stringify(cart));
      console.log(
        `💾 Carrinho salvo para ${currentUser.id}:`,
        cart.length,
        'itens'
      );
    }
  }, [cart, currentUser, isClient]);

  // Verificar mudança de usuário periodicamente
  useEffect(() => {
    if (!isClient) return;

    const interval = setInterval(() => {
      verificarUsuarioAtual();
    }, 5000); // Verificar a cada 5 segundos

    return () => clearInterval(interval);
  }, [isClient, currentUser]);

  const addToCart = (produto, quantidade) => {
    if (!currentUser) {
      toast.warning('Você precisa estar logado para adicionar ao carrinho');
      return;
    }

    // 🆕 VALIDAÇÃO: Verificar se produto tem precoSemNF
    if (!produto.precoSemNF && produto.precoSemNF !== 0) {
      console.warn('⚠️ Produto sem precoSemNF:', produto.nome);
      toast.warning('Este produto não possui preço sem NF definido');
      return;
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item._id === produto._id);

      if (existingItem) {
        toast.success(`${produto.nome} - quantidade atualizada!`);
        return prevCart.map(item =>
          item._id === produto._id
            ? { ...item, quantidade: item.quantidade + quantidade }
            : item
        );
      } else {
        toast.success(`${produto.nome} adicionado ao carrinho!`);
        // 🆕 GARANTIR QUE precoSemNF SEJA INCLUÍDO NO CARRINHO
        return [
          ...prevCart,
          {
            ...produto,
            quantidade,
            // Garantir que ambos os preços existam
            preco: produto.preco || 0,
            precoSemNF: produto.precoSemNF || 0,
          },
        ];
      }
    });
  };

  const removeFromCart = produtoId => {
    setCart(prevCart => prevCart.filter(item => item._id !== produtoId));
    toast.info('Item removido do carrinho');
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
    // Também limpar do localStorage
    if (currentUser?.id) {
      const chaveCarrinho = `cart_${currentUser.id}`;
      localStorage.removeItem(chaveCarrinho);
    }
    toast.info('Carrinho limpo com sucesso');
  };

  // 🆕 CÁLCULOS ATUALIZADOS COM AMBOS OS PREÇOS
  const cartTotalComNF = cart.reduce(
    (total, item) => total + (item.preco || 0) * item.quantidade,
    0
  );

  const cartTotalSemNF = cart.reduce(
    (total, item) => total + (item.precoSemNF || 0) * item.quantidade,
    0
  );

  const cartValue = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    currentUser,
    // Manter compatibilidade com código existente (usa preço com NF como padrão)
    cartTotal: cartTotalComNF,
    // 🆕 NOVOS VALORES PARA AMBOS OS PREÇOS
    cartTotalComNF,
    cartTotalSemNF,
    cartCount: cart.reduce((count, item) => count + item.quantidade, 0),
    isClient,
  };

  return (
    <CartContext.Provider value={cartValue}>
      <ToastContext.Provider value={toast}>
        <Component {...pageProps} />
        <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      </ToastContext.Provider>
    </CartContext.Provider>
  );
}
