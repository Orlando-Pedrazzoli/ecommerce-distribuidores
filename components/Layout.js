// 20. COMPONENTS/LAYOUT.JS
// ===================================

import Navbar from './Navbar';

export default function Layout({ children }) {
  return (
    <div className='min-h-screen bg-gray-50'>
      <Navbar />
      <main>{children}</main>
      <footer className='bg-gray-800 text-white text-center py-4 mt-auto'>
        <p>
          &copy; 2025 E-commerce Distribuidores. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
