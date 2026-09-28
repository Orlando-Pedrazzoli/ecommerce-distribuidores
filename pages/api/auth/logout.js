// pages/api/auth/logout.js - ENCERRAR SESSÃO
// ===================================
// Cookies HttpOnly só podem ser apagados pelo servidor.
// POST { esquecerDispositivo: true } também remove o cookie de dispositivo confiável.

import { AUTH_CONFIG, cookiesLogout, cookieExpirado, setCookies } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const cookies = cookiesLogout();
  if (req.body?.esquecerDispositivo) {
    cookies.push(cookieExpirado(AUTH_CONFIG.COOKIE_DISPOSITIVO));
  }

  setCookies(res, cookies);
  return res.status(200).json({ success: true, message: 'Sessão encerrada' });
}
