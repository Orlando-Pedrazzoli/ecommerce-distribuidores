// 21. COMPONENTS/NAVBAR.JS
// ===================================

import Link from 'next/link';
import { useCart } from '../pages/_app';
import { useRouter } from 'next/router';

export default function Navbar() {
  const { cartCount } = useCart();
  const router = useRouter();

  const handleLogout = () => {
    document.cookie =
      'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/');
  };

  return (
    <nav className='bg-gray-800 text-white shadow-lg'>
      <div className='max-w-7xl mx-auto px-4'>
        <div className='flex justify-between items-center py-4'>
          <Link href='/dashboard' className='text-xl font-bold'>
            E-commerce Distribuidores
          </Link>

          <div className='flex items-center space-x-4'>
            <Link href='/checkout' className='relative'>
              <span className='text-2xl'>🛒</span>
              {cartCount > 0 && (
                <span className='absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm'>
                  {cartCount}
                </span>
              )}
            </Link>

            <Link
              href='/admin'
              className='bg-red-500 px-3 py-1 rounded hover:bg-red-600'
            >
              Admin
            </Link>

            <button
              onClick={handleLogout}
              className='bg-gray-600 px-3 py-1 rounded hover:bg-gray-700'
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
