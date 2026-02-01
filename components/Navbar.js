// components/Navbar.js
// ===================================
// ATUALIZADO: Link para Tabela de Preços

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
  const [pendencias, setPendencias] = useState(0);

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
        
        if (data.user?.tipo === 'distribuidor') {
          buscarPendencias();
        }
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

  const buscarPendencias = async () => {
    try {
      const response = await fetch('/api/user/pagamentos');
      if (response.ok) {
        const data = await response.json();
        const total = data.resumo?.totalPendente || 0;
        setPendencias(total);
      }
    } catch (error) {
      console.error('Erro ao buscar pendências:', error);
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
                <Image
                  src='/logo.png'
                  alt='Elite Surfing Logo'
                  width={180}
                  height={40}
                  className='hidden md:block h-8 w-auto object-contain'
                  priority
                />
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
            <div className='hidden md:flex items-center space-x-4'>
              {user?.tipo === 'distribuidor' && (
                <>
                  {/* Dashboard */}
                  <Link
                    href='/dashboard'
                    className={`px-3 py-2 rounded transition flex items-center gap-1 ${
                      isActive('/dashboard')
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-700'
                    }`}
                  >
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' />
                    </svg>
                    Início
                  </Link>

                  {/* Meus Pedidos */}
                  <Link
                    href='/meus-pedidos'
                    className={`px-3 py-2 rounded transition flex items-center gap-1 ${
                      isActive('/meus-pedidos')
                        ? 'bg-green-600 text-white'
                        : 'hover:bg-gray-700'
                    }`}
                  >
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' />
                    </svg>
                    Pedidos
                  </Link>

                  {/* Pagamentos */}
                  <Link
                    href='/pagamentos'
                    className={`relative px-3 py-2 rounded transition flex items-center gap-1 ${
                      isActive('/pagamentos')
                        ? 'bg-yellow-600 text-white'
                        : 'hover:bg-gray-700'
                    }`}
                  >
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' />
                    </svg>
                    Pagamentos
                    {pendencias > 0 && (
                      <span className='absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold animate-pulse'>
                        !
                      </span>
                    )}
                  </Link>

                  {/* Tabela de Preços */}
                  <Link
                    href='/tabela-precos'
                    className={`px-3 py-2 rounded transition flex items-center gap-1 ${
                      isActive('/tabela-precos')
                        ? 'bg-purple-600 text-white'
                        : 'hover:bg-gray-700'
                    }`}
                  >
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' />
                    </svg>
                    Tabela de Preços
                  </Link>
                </>
              )}

              {/* Link Admin */}
              {user?.tipo === 'admin' && (
                <Link
                  href='/admin'
                  className={`px-3 py-2 rounded transition ${
                    isActive('/admin')
                      ? 'bg-red-600 text-white'
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  Admin
                </Link>
              )}

              {/* Cart Button */}
              {user?.tipo === 'distribuidor' && (
                <button
                  onClick={toggleCart}
                  className='relative p-2 hover:bg-gray-700 rounded transition'
                  title='Abrir carrinho'
                >
                  <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' />
                  </svg>
                  {cartCount > 0 && (
                    <span className='absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold animate-pulse'>
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </button>
              )}

              {/* User Info */}
              <div className='text-sm border-l border-gray-600 pl-4 ml-2'>
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
                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' />
                </svg>
                Sair
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className='md:hidden flex items-center space-x-2'>
              {user?.tipo === 'distribuidor' && (
                <button
                  onClick={toggleCart}
                  className='relative p-2 hover:bg-gray-700 rounded transition'
                >
                  <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' />
                  </svg>
                  {cartCount > 0 && (
                    <span className='absolute -top-1 -right-1 bg-red-500 text-white rounded-full min-w-5 h-5 px-1 flex items-center justify-center text-xs font-bold'>
                      {cartCount > 99 ? '99+' : cartCount}
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
              isMobileMenuOpen ? 'max-h-96 pb-4' : 'max-h-0 overflow-hidden'
            }`}
          >
            <div className='space-y-2 border-t border-gray-700 pt-4'>
              {/* User Info Mobile */}
              <div className='px-3 py-2 text-sm text-gray-300 border-b border-gray-700 pb-2 mb-2'>
                Olá, <span className='font-medium text-white'>{user.nome}</span>
                <div className='text-xs text-gray-400 capitalize'>
                  {user.tipo}
                </div>
              </div>

              {/* Links para Distribuidores */}
              {user?.tipo === 'distribuidor' && (
                <>
                  <Link
                    href='/dashboard'
                    className={`block px-3 py-2 rounded transition ${
                      isActive('/dashboard')
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-700'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className='flex items-center gap-2'>
                      <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' />
                      </svg>
                      Dashboard
                    </span>
                  </Link>

                  <Link
                    href='/meus-pedidos'
                    className={`block px-3 py-2 rounded transition ${
                      isActive('/meus-pedidos')
                        ? 'bg-green-600 text-white'
                        : 'hover:bg-gray-700'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className='flex items-center gap-2'>
                      <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' />
                      </svg>
                      Meus Pedidos
                    </span>
                  </Link>

                  <Link
                    href='/pagamentos'
                    className={`block px-3 py-2 rounded transition ${
                      isActive('/pagamentos')
                        ? 'bg-yellow-600 text-white'
                        : 'hover:bg-gray-700'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className='flex items-center justify-between'>
                      <span className='flex items-center gap-2'>
                        <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' />
                        </svg>
                        Pagamentos
                      </span>
                      {pendencias > 0 && (
                        <span className='bg-red-500 text-white rounded-full px-2 py-0.5 text-xs font-bold'>
                          Pendente
                        </span>
                      )}
                    </span>
                  </Link>

                  {/* Tabela de Preços - Mobile */}
                  <Link
                    href='/tabela-precos'
                    className={`block px-3 py-2 rounded transition ${
                      isActive('/tabela-precos')
                        ? 'bg-purple-600 text-white'
                        : 'hover:bg-gray-700'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className='flex items-center gap-2'>
                      <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' />
                      </svg>
                      Tabela de Preços
                    </span>
                  </Link>

                  <Link
                    href='/checkout'
                    className={`block px-3 py-2 rounded transition ${
                      isActive('/checkout')
                        ? 'bg-orange-600 text-white'
                        : 'hover:bg-gray-700'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className='flex items-center gap-2'>
                      <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' />
                      </svg>
                      Carrinho {cartCount > 0 && `(${cartCount})`}
                    </span>
                  </Link>
                </>
              )}

              {/* Link Admin */}
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
                  Admin
                </Link>
              )}

              {/* Logout */}
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className='block w-full text-left px-3 py-2 bg-gray-600 rounded hover:bg-gray-700 transition'
              >
                <span className='flex items-center gap-2'>
                  <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' />
                  </svg>
                  Sair
                </span>
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