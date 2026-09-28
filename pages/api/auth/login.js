// pages/api/auth/login.js - LOGIN (PASSO 1: USUÁRIO + SENHA)
// ===================================
// Fluxo:
//   1. rate limit por IP e por usuário
//   2. busca no Mongo, bcrypt, bloqueio após N falhas
//   3. dispositivo confiável? -> emite sessão diretamente
//      senão -> gera OTP, envia por email, emite cookie "otp-pending"

import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import { rateLimit, responder429 } from '../../../lib/rateLimit';
import {
  AUTH_CONFIG,
  TIPOS_TOKEN,
  assinarSessao,
  cookieSessao,
  serializeCookie,
  setCookies,
  getClientIp,
  resumirUserAgent,
  mascararEmail,
  contaBloqueada,
  minutosRestantesBloqueio,
  registarFalhaLogin,
  registarSucessoLogin,
  compararSenhaDummy,
  dispositivoConfiavel,
  criarTokenUsoUnico,
  userPublico,
  getSecret,
} from '../../../lib/auth';
import { enviarOtpLogin } from '../../../lib/authEmails';
import jwt from 'jsonwebtoken';

const MENSAGEM_CREDENCIAIS = 'Usuário ou senha incorretos';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');

  if (!username || !password) {
    return res
      .status(400)
      .json({ success: false, message: 'Informe usuário e senha' });
  }

  // ── Rate limit (IP: 20/15min · usuário: 10/15min) ──
  const ip = getClientIp(req);
  const limiteIp = rateLimit(`login:ip:${ip}`, 20, 15 * 60 * 1000);
  if (!limiteIp.ok) return responder429(res, limiteIp);
  const limiteUser = rateLimit(
    `login:user:${username.toLowerCase()}`,
    10,
    15 * 60 * 1000
  );
  if (!limiteUser.ok) return responder429(res, limiteUser);

  try {
    await dbConnect();

    const user = await User.findOne({ usuario: username }).select('+password');

    // Usuário inexistente: gasta o mesmo tempo que um bcrypt real
    if (!user) {
      await compararSenhaDummy(password);
      return res.status(401).json({ success: false, message: MENSAGEM_CREDENCIAIS });
    }

    if (!user.ativo) {
      await compararSenhaDummy(password);
      return res.status(403).json({
        success: false,
        message: 'Conta desativada. Entre em contato com o administrador.',
      });
    }

    if (contaBloqueada(user)) {
      return res.status(423).json({
        success: false,
        message: `Conta temporariamente bloqueada por excesso de tentativas. Tente novamente em ${minutosRestantesBloqueio(
          user
        )} min.`,
      });
    }

    if (!user.senhaDefinida || !user.password) {
      await compararSenhaDummy(password);
      return res.status(403).json({
        success: false,
        message:
          'Sua senha ainda não foi definida. Use "Esqueci minha senha" para criar uma.',
      });
    }

    const senhaOk = await user.comparePassword(password);
    if (!senhaOk) {
      await registarFalhaLogin(user);
      console.warn(`🔒 Falha de login: ${username} (IP ${ip})`);
      return res.status(401).json({ success: false, message: MENSAGEM_CREDENCIAIS });
    }

    // ── Senha correta ──
    const confiavel = await dispositivoConfiavel(req, user);

    if (confiavel) {
      await registarSucessoLogin(user);
      setCookies(res, [cookieSessao(assinarSessao(user))]);
      console.log(`✅ Login (dispositivo confiável): ${user.usuario}`);
      return res.status(200).json({
        success: true,
        otpRequired: false,
        message: 'Login realizado com sucesso',
        user: userPublico(user),
      });
    }

    if (!user.email) {
      return res.status(403).json({
        success: false,
        message:
          'Sua conta não tem email cadastrado para verificação. Entre em contato com o administrador.',
      });
    }

    // ── Segundo fator: OTP por email ──
    const { valor: codigo } = await criarTokenUsoUnico(
      user,
      TIPOS_TOKEN.OTP_LOGIN,
      req
    );

    try {
      await enviarOtpLogin({
        user,
        codigo,
        dispositivo: resumirUserAgent(req.headers['user-agent']),
        ip,
      });
    } catch (emailError) {
      console.error('❌ Falha ao enviar OTP:', emailError.message);
      return res.status(502).json({
        success: false,
        message:
          'Não foi possível enviar o código de verificação. Tente novamente em instantes.',
      });
    }

    // Cookie de "login pendente" — só permite chamar verify-otp / resend-otp
    const otpPending = jwt.sign(
      { uid: user._id.toString(), fase: 'otp' },
      getSecret(),
      { expiresIn: AUTH_CONFIG.OTP_DURACAO_SEG }
    );
    setCookies(res, [
      serializeCookie(AUTH_CONFIG.COOKIE_OTP, otpPending, {
        maxAge: AUTH_CONFIG.OTP_DURACAO_SEG,
      }),
    ]);

    // Zera tentativas (senha correta) sem marcar login concluído
    user.tentativasLogin = 0;
    user.bloqueadoAte = null;
    await user.save();

    console.log(`📨 OTP enviado para ${user.usuario}`);
    return res.status(200).json({
      success: true,
      otpRequired: true,
      message: 'Código de verificação enviado por email',
      emailMascarado: mascararEmail(user.email),
      expiraEmSeg: AUTH_CONFIG.OTP_DURACAO_SEG,
    });
  } catch (error) {
    console.error('💥 Erro no login:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
    });
  }
}
