// pages/api/auth/verify-otp.js - LOGIN (PASSO 2: CÓDIGO OTP)
// ===================================

import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import { rateLimit, responder429 } from '../../../lib/rateLimit';
import {
  AUTH_CONFIG,
  verifyToken,
  validarOtp,
  assinarSessao,
  cookieSessao,
  cookieExpirado,
  setCookies,
  getClientIp,
  registarSucessoLogin,
  registarDispositivoConfiavel,
  userPublico,
} from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const pendente = verifyToken(req.cookies?.[AUTH_CONFIG.COOKIE_OTP] || '');
  if (!pendente || pendente.fase !== 'otp' || !pendente.uid) {
    return res.status(401).json({
      success: false,
      message: 'Sessão de verificação expirada. Faça login novamente.',
      reiniciar: true,
    });
  }

  const codigo = String(req.body?.codigo || '').replace(/\D/g, '');
  const lembrarDispositivo = Boolean(req.body?.lembrarDispositivo);

  if (codigo.length !== 6) {
    return res
      .status(400)
      .json({ success: false, message: 'Informe o código de 6 dígitos' });
  }

  const limite = rateLimit(`otp:${pendente.uid}`, 10, 10 * 60 * 1000);
  if (!limite.ok) return responder429(res, limite);

  try {
    await dbConnect();
    const user = await User.findById(pendente.uid);
    if (!user || !user.ativo) {
      return res.status(401).json({
        success: false,
        message: 'Usuário inválido. Faça login novamente.',
        reiniciar: true,
      });
    }

    const resultado = await validarOtp(user, codigo);
    if (!resultado.ok) {
      console.warn(`🔒 OTP inválido: ${user.usuario} (IP ${getClientIp(req)})`);
      return res.status(401).json({ success: false, message: resultado.motivo });
    }

    const cookies = [
      cookieExpirado(AUTH_CONFIG.COOKIE_OTP),
      cookieSessao(assinarSessao(user)),
    ];

    if (lembrarDispositivo) {
      cookies.push(registarDispositivoConfiavel(req, user));
    }

    await registarSucessoLogin(user); // também persiste dispositivosConfiaveis
    setCookies(res, cookies);

    console.log(`✅ Login (OTP): ${user.usuario}`);
    return res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso',
      user: userPublico(user),
    });
  } catch (error) {
    console.error('💥 Erro ao verificar OTP:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}
