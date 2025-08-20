// 2. HOOK: hooks/useToast.js
// ===================================

import { useState, useCallback } from 'react';

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback(
    (message, type = 'success', duration = 4000) => {
      const id = Date.now() + Math.random();
      const newToast = { id, message, type, duration };

      setToasts(prev => [...prev, newToast]);
    },
    []
  );

  const removeToast = useCallback(id => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback(
    (message, duration) => showToast(message, 'success', duration),
    [showToast]
  );
  const error = useCallback(
    (message, duration) => showToast(message, 'error', duration),
    [showToast]
  );
  const warning = useCallback(
    (message, duration) => showToast(message, 'warning', duration),
    [showToast]
  );
  const info = useCallback(
    (message, duration) => showToast(message, 'info', duration),
    [showToast]
  );

  return {
    toasts,
    removeToast,
    showToast,
    success,
    error,
    warning,
    info,
  };
};
