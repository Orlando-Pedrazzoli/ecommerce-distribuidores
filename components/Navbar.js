// COMPONENTS/NAVBAR.JS - MELHORADO
// ===================================

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '../pages/_app';
import { useRouter } from 'next/router';
import { useState } from 'react';
import Cart from './Cart';

export default function Navbar() {
  const { cartCount } = useCart();
  const router = useRouter();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  return (
    <>
      <nav className='bg-gray-800 text-white shadow-lg relative z-40'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='flex justify-between items-center py-4'>
            {/* Logo */}
            <Link
              href='/dashboard'
              className='flex items-center hover:opacity-80 transition'
            >
              <Image
                src='/logo.png'
                alt='E-commerce Distribuidores'
                width={200}
                height={50}
                className='h-10 w-auto'
                priority
              />
            </Link>

            {/* Desktop Menu */}
            <div className='hidden md:flex items-center space-x-6'>
              {/* Navigation Links */}
              <Link
                href='/dashboard'
                className={`px-3 py-2 rounded transition ${
                  isActive('/dashboard')
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-700'
                }`}
              >
                Dashboard
              </Link>

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

              {/* Cart Button */}
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
              {/* Mobile Cart Button */}
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
              <Link
                href='/dashboard'
                className={`block px-3 py-2 rounded transition ${
                  isActive('/dashboard')
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-700'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                📊 Dashboard
              </Link>

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
      <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
