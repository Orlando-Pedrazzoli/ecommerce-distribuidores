// 1. COMPONENTE: components/Toast.js
// ===================================

import { useState, useEffect } from 'react';

const Toast = ({ message, type = 'success', duration = 4000, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animação de entrada
    setIsVisible(true);

    // Auto-close depois do tempo especificado
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Esperar animação terminar
  };

  const getToastStyles = () => {
    const baseStyles = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border-l-4 min-w-[300px] max-w-md transform transition-all duration-300 ease-in-out`;

    if (!isVisible) {
      return `${baseStyles} translate-x-full opacity-0`;
    }

    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-50 border-green-500 text-green-800`;
      case 'error':
        return `${baseStyles} bg-red-50 border-red-500 text-red-800`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 border-yellow-500 text-yellow-800`;
      case 'info':
        return `${baseStyles} bg-blue-50 border-blue-500 text-blue-800`;
      default:
        return `${baseStyles} bg-gray-50 border-gray-500 text-gray-800`;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '📢';
    }
  };

  return (
    <div className={getToastStyles()}>
      <div className='flex items-start'>
        <div className='flex-shrink-0 text-xl mr-3'>{getIcon()}</div>
        <div className='flex-1'>
          <p className='font-medium text-sm leading-relaxed'>{message}</p>
        </div>
        <button
          onClick={handleClose}
          className='flex-shrink-0 ml-3 text-lg opacity-70 hover:opacity-100 transition-opacity'
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Toast;
