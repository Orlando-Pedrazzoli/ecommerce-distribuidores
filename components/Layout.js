// components/Layout.js - COM FOOTER NAVEGÁVEL E WHATSAPP
// ===================================

import Navbar from './Navbar';
import WhatsAppButton from './WhatsAppButton';

export default function Layout({ children }) {
  // Função para rolar até o footer
  const scrollToFooter = () => {
    const footer = document.getElementById('footer');
    if (footer) {
      footer.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 flex flex-col'>
      <Navbar />
      <main className='flex-grow'>{children}</main>

      {/* Footer com ID para navegação */}
      <footer
        id='footer'
        className='bg-gray-800 text-white text-center py-6 mt-auto'
      >
        <div className='max-w-6xl mx-auto px-4'>
          <p className='mb-2'>
            &copy; 2025 E-commerce Distribuidores. Todos os direitos reservados.
          </p>
          <p>
            <a
              href='https://orlandopedrazzoli.com'
              target='_blank'
              rel='noopener noreferrer'
              className='text-blue-400 hover:text-blue-300 transition-colors underline'
            >
              orlandopedrazzoli.com
            </a>
          </p>
        </div>
      </footer>

      {/* Botão do WhatsApp */}
      <WhatsAppButton />
    </div>
  );
}
