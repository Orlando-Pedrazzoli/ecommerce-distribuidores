// components/Navbar.js
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '../pages/_app';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Cart from './Cart';

export default function Navbar() {
  const { cartCount } = useCart();
  const router = useRouter();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    buscarDadosUsuario();
  }, []);

  const buscarDadosUsuario = async () => {
    try {
      setLoadingUser(true);
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Deseja realmente sair?')) {
      document.cookie =
        'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      router.push('/');
    }
  };

  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
  };

  const isActive = path => {
    return router.pathname === path;
  };

  // Se ainda está carregando, não mostra nada
  if (loadingUser) {
    return (
      <nav className='bg-gray-800 text-white shadow-lg'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='flex justify-center items-center py-4'>
            <div className='animate-pulse text-gray-400'>Carregando...</div>
          </div>
        </div>
      </nav>
    );
  }

  // Se não tem usuário, não mostra navbar
  if (!user) {
    return null;
  }

  return (
    <>
      <nav className='sticky top-0 bg-gray-800 text-white shadow-lg z-40'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='flex justify-between items-center py-4'>
            {/* Logo */}
            <Link
              href='/dashboard'
              className='flex items-center hover:opacity-80 transition'
            >
              <div className='relative'>
                {/* Logo para Desktop */}
                <Image
                  src='/logo.png'
                  alt='Elite Surfing Logo'
                  width={180}
                  height={40}
                  className='hidden md:block h-8 w-auto object-contain'
                  priority
                />
                {/* Logo para Mobile */}
                <Image
                  src='/logo.png'
                  alt='Elite Surfing Logo'
                  width={120}
                  height={28}
                  className='block md:hidden h-6 w-auto object-contain'
                  priority
                />
              </div>
            </Link>

            {/* Desktop Menu */}
            <div className='hidden md:flex items-center space-x-6'>
              {/* Navigation Links */}

              {user?.tipo === 'distribuidor' && (
                <Link
                  href='/meus-pedidos'
                  className={`px-3 py-2 rounded transition ${
                    isActive('/meus-pedidos')
                      ? 'bg-green-600 text-white'
                      : 'hover:bg-gray-700'
                  }`}
                >
                  📋 Meus Pedidos
                </Link>
              )}

              {user?.tipo === 'admin' && (
                <Link
                  href='/admin'
                  className={`px-3 py-2 rounded transition ${
                    isActive('/admin')
                      ? 'bg-red-600 text-white'
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  ⚙️ Admin
                </Link>
              )}

              {/* Cart Button - apenas para distribuidores */}
              {user?.tipo === 'distribuidor' && (
                <button
                  onClick={toggleCart}
                  className='relative p-2 hover:bg-gray-700 rounded transition'
                  title='Abrir carrinho'
                >
                  <span className='text-2xl'>🛒</span>
                  {cartCount > 0 && (
                    <span className='absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold animate-pulse'>
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </button>
              )}

              {/* User Info */}
              <div className='text-sm'>
                <span className='text-gray-300'>Olá, </span>
                <span className='font-medium'>{user.nome}</span>
                <div className='text-xs text-gray-400 capitalize'>
                  {user.tipo}
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className='bg-gray-600 px-4 py-2 rounded hover:bg-gray-700 transition flex items-center gap-2'
              >
                <span>🚪</span>
                Sair
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className='md:hidden flex items-center space-x-2'>
              {/* Mobile Cart Button - apenas para distribuidores */}
              {user?.tipo === 'distribuidor' && (
                <button
                  onClick={toggleCart}
                  className='relative p-2 hover:bg-gray-700 rounded transition'
                >
                  <span className='text-xl'>🛒</span>
                  {cartCount > 0 && (
                    <span className='absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold'>
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </button>
              )}

              {/* Hamburger Menu */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className='p-2 hover:bg-gray-700 rounded transition'
              >
                <div className='space-y-1'>
                  <span
                    className={`block w-5 h-0.5 bg-white transition-transform ${
                      isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''
                    }`}
                  ></span>
                  <span
                    className={`block w-5 h-0.5 bg-white transition-opacity ${
                      isMobileMenuOpen ? 'opacity-0' : ''
                    }`}
                  ></span>
                  <span
                    className={`block w-5 h-0.5 bg-white transition-transform ${
                      isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''
                    }`}
                  ></span>
                </div>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          <div
            className={`md:hidden transition-all duration-200 ${
              isMobileMenuOpen ? 'max-h-64 pb-4' : 'max-h-0 overflow-hidden'
            }`}
          >
            <div className='space-y-2 border-t border-gray-700 pt-4'>
              <div className='px-3 py-2 text-sm text-gray-300 border-b border-gray-700 pb-2 mb-2'>
                Olá, <span className='font-medium text-white'>{user.nome}</span>
                <div className='text-xs text-gray-400 capitalize'>
                  {user.tipo}
                </div>
              </div>

              <Link
                href='/dashboard'
                className={`block px-3 py-2 rounded transition ${
                  isActive('/dashboard')
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-700'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                🏠 Dashboard
              </Link>

              {user?.tipo === 'distribuidor' && (
                <Link
                  href='/meus-pedidos'
                  className={`block px-3 py-2 rounded transition ${
                    isActive('/meus-pedidos')
                      ? 'bg-green-600 text-white'
                      : 'hover:bg-gray-700'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  📋 Meus Pedidos
                </Link>
              )}

              {user?.tipo === 'admin' && (
                <Link
                  href='/admin'
                  className={`block px-3 py-2 rounded transition ${
                    isActive('/admin')
                      ? 'bg-red-600 text-white'
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  ⚙️ Admin
                </Link>
              )}

              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className='block w-full text-left px-3 py-2 bg-gray-600 rounded hover:bg-gray-700 transition'
              >
                🚪 Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Cart Sidebar */}
      {user?.tipo === 'distribuidor' && (
        <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      )}
    </>
  );
}
