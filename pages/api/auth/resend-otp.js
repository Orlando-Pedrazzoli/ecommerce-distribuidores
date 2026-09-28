// pages/api/auth/resend-otp.js - REENVIAR CÓDIGO OTP
// ===================================
// Só funciona com o cookie "otp-pending" (senha já validada).
// Intervalo mínimo entre reenvios: AUTH_CONFIG.OTP_REENVIO_MIN_SEG.

import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import AuthToken from '../../../models/AuthToken';
import { rateLimit, responder429 } from '../../../lib/rateLimit';
import {
  AUTH_CONFIG,
  TIPOS_TOKEN,
  verifyToken,
  criarTokenUsoUnico,
  getClientIp,
  resumirUserAgent,
  mascararEmail,
} from '../../../lib/auth';
import { enviarOtpLogin } from '../../../lib/authEmails';

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

  const limite = rateLimit(`otp-resend:${pendente.uid}`, 3, 10 * 60 * 1000);
  if (!limite.ok) {
    return responder429(res, limite, 'Limite de reenvios atingido. Faça login novamente mais tarde.');
  }

  try {
    await dbConnect();
    const user = await User.findById(pendente.uid);
    if (!user || !user.ativo || !user.email) {
      return res
        .status(401)
        .json({ success: false, message: 'Usuário inválido', reiniciar: true });
    }

    // Respeita o intervalo mínimo desde o último código
    const ultimo = await AuthToken.findOne({
      userId: user._id,
      tipo: TIPOS_TOKEN.OTP_LOGIN,
    }).sort({ createdAt: -1 });

    if (ultimo) {
      const passou = (Date.now() - ultimo.createdAt.getTime()) / 1000;
      if (passou < AUTH_CONFIG.OTP_REENVIO_MIN_SEG) {
        const espera = Math.ceil(AUTH_CONFIG.OTP_REENVIO_MIN_SEG - passou);
        res.setHeader('Retry-After', String(espera));
        return res.status(429).json({
          success: false,
          message: `Aguarde ${espera}s para reenviar o código.`,
          retryAfter: espera,
        });
      }
    }

    const { valor: codigo } = await criarTokenUsoUnico(user, TIPOS_TOKEN.OTP_LOGIN, req);

    await enviarOtpLogin({
      user,
      codigo,
      dispositivo: resumirUserAgent(req.headers['user-agent']),
      ip: getClientIp(req),
    });

    console.log(`📨 OTP reenviado para ${user.usuario}`);
    return res.status(200).json({
      success: true,
      message: 'Novo código enviado',
      emailMascarado: mascararEmail(user.email),
    });
  } catch (error) {
    console.error('💥 Erro ao reenviar OTP:', error);
    return res.status(500).json({ success: false, message: 'Erro ao enviar o código' });
  }
}
