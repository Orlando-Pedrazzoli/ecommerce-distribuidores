// components/WhatsAppButton.js - BOTÃO FLUTUANTE DO WHATSAPP (DESIGN PREMIUM)
// ===================================

import { useState, useEffect } from 'react';

export default function WhatsAppButton() {
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isPulsing, setIsPulsing] = useState(true);

  // Número do WhatsApp - Portugal
  const whatsappNumber = '351912164220'; // Portugal: +351 912 164 220
  const message =
    'Olá! Vim pelo sistema Elite Surfing e gostaria de tirar uma dúvida.';

  useEffect(() => {
    // Mostrar o botão após um pequeno delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1000);

    // Parar o pulso após 5 segundos
    const pulseTimer = setTimeout(() => {
      setIsPulsing(false);
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(pulseTimer);
    };
  }, []);

  const handleWhatsAppClick = () => {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <>
      {/* Botão do WhatsApp - Design Premium */}
      <div
        className={`fixed bottom-6 right-6 z-40 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
        } transition-all duration-500`}
      >
        {/* Anel de pulso animado */}
        {isPulsing && (
          <>
            <div className='absolute inset-0 rounded-full bg-green-400 animate-ping opacity-25'></div>
            <div className='absolute inset-0 rounded-full bg-green-400 animate-ping opacity-25 animation-delay-200'></div>
          </>
        )}

        {/* Botão principal */}
        <button
          onClick={handleWhatsAppClick}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className='relative group'
          aria-label='Contato via WhatsApp'
        >
          {/* Container do botão com gradiente */}
          <div className='relative bg-gradient-to-br from-green-400 via-green-500 to-green-600 rounded-full p-4 shadow-2xl hover:shadow-green-500/50 transform hover:scale-110 transition-all duration-300 hover:rotate-12'>
            {/* Efeito de brilho */}
            <div className='absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white to-transparent opacity-30 group-hover:opacity-50 transition-opacity'></div>

            {/* Ícone do WhatsApp */}
            <svg
              className='w-7 h-7 text-white relative z-10'
              fill='currentColor'
              viewBox='0 0 24 24'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.149-.67.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z' />
            </svg>
          </div>

          {/* Badge de status online */}
          <span className='absolute -top-1 -right-1 flex h-4 w-4'>
            <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75'></span>
            <span className='relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white'></span>
          </span>
        </button>

        {/* Tooltip Premium */}
        {showTooltip && (
          <div className='absolute bottom-20 right-0 transform translate-x-0 opacity-100 transition-all duration-300'>
            <div className='bg-gradient-to-r from-gray-800 to-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl relative'>
              <div className='flex items-center gap-3'>
                <div className='flex flex-col'>
                  <span className='text-sm font-semibold'>
                    Precisa de ajuda?
                  </span>
                  <span className='text-xs text-gray-300'>
                    Estamos online agora!
                  </span>
                </div>
                <div className='bg-green-500 rounded-full p-1 animate-pulse'>
                  <svg
                    className='w-4 h-4 text-white'
                    fill='currentColor'
                    viewBox='0 0 20 20'
                  >
                    <path
                      fillRule='evenodd'
                      d='M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z'
                      clipRule='evenodd'
                    />
                  </svg>
                </div>
              </div>
              {/* Seta do tooltip */}
              <div className='absolute -bottom-2 right-8 w-4 h-4 bg-gray-900 transform rotate-45'></div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes ping {
          75%,
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
        }
      `}</style>
    </>
  );
}
