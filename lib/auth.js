// lib/auth.js - NÚCLEO DE AUTENTICAÇÃO (SERVER-SIDE)
// ===================================
// Sessão JWT em cookie HttpOnly, OTP por email, dispositivos confiáveis,
// bloqueio por tentativas, tokens de reset/convite e wrappers de proteção
// para as API routes (requireAuth / requireAdmin).

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dbConnect from './mongodb';
import User from '../models/User';
import AuthToken, { TIPOS_TOKEN } from '../models/AuthToken';

// ══════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ══════════════════════════════════════════════════════════════
export const AUTH_CONFIG = {
  COOKIE_SESSAO: 'auth-token',
  COOKIE_OTP: 'otp-pending',
  COOKIE_DISPOSITIVO: 'trusted-device',

  SESSAO_DURACAO_SEG: 24 * 60 * 60, // 24h
  OTP_DURACAO_SEG: 10 * 60, // 10 min
  OTP_MAX_TENTATIVAS: 5,
  OTP_REENVIO_MIN_SEG: 60, // intervalo mínimo entre reenvios
  RESET_DURACAO_SEG: 30 * 60, // 30 min
  CONVITE_DURACAO_SEG: 7 * 24 * 60 * 60, // 7 dias
  DISPOSITIVO_DURACAO_SEG: 30 * 24 * 60 * 60, // 30 dias
  DISPOSITIVOS_MAX: 5,

  LOGIN_MAX_TENTATIVAS: 5,
  LOGIN_BLOQUEIO_MIN: 15,

  SENHA_MIN: 8,
  SENHA_MAX: 72, // limite do bcrypt
};

const isProd = process.env.NODE_ENV === 'production';

export const getSecret = () => {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET (ou NEXTAUTH_SECRET) não definido ou com menos de 32 caracteres'
    );
  }
  return secret;
};

// ══════════════════════════════════════════════════════════════
// COOKIES
// ══════════════════════════════════════════════════════════════
export const serializeCookie = (nome, valor, { maxAge } = {}) => {
  const partes = [
    `${nome}=${encodeURIComponent(valor)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (isProd) partes.push('Secure');
  if (typeof maxAge === 'number') partes.push(`Max-Age=${maxAge}`);
  return partes.join('; ');
};

export const cookieExpirado = nome => serializeCookie(nome, '', { maxAge: 0 });

/** Define vários cookies numa só resposta */
export const setCookies = (res, cookies) => {
  const existentes = res.getHeader('Set-Cookie');
  const lista = Array.isArray(existentes)
    ? existentes
    : existentes
    ? [existentes]
    : [];
  res.setHeader('Set-Cookie', [...lista, ...cookies]);
};

export const getClientIp = req => {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
};

export const resumirUserAgent = ua => {
  if (!ua) return 'Dispositivo desconhecido';
  const so = /Windows/i.test(ua)
    ? 'Windows'
    : /Android/i.test(ua)
    ? 'Android'
    : /iPhone|iPad/i.test(ua)
    ? 'iOS'
    : /Mac OS/i.test(ua)
    ? 'macOS'
    : /Linux/i.test(ua)
    ? 'Linux'
    : 'Outro';
  const nav = /Edg\//i.test(ua)
    ? 'Edge'
    : /OPR\//i.test(ua)
    ? 'Opera'
    : /Chrome\//i.test(ua)
    ? 'Chrome'
    : /Safari\//i.test(ua)
    ? 'Safari'
    : /Firefox\//i.test(ua)
    ? 'Firefox'
    : 'Navegador';
  return `${nav} em ${so}`;
};

// ══════════════════════════════════════════════════════════════
// HASH / TOKENS
// ══════════════════════════════════════════════════════════════
export const hashToken = valor =>
  crypto.createHmac('sha256', getSecret()).update(String(valor)).digest('hex');

export const compararHash = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

export const gerarOtp = () => {
  // 6 dígitos, criptograficamente seguro, sem viés
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
};

export const gerarTokenAleatorio = () => crypto.randomBytes(32).toString('hex');

export const mascararEmail = email => {
  if (!email || !email.includes('@')) return '';
  const [local, dominio] = email.split('@');
  const visivel = local.slice(0, 2);
  return `${visivel}${'*'.repeat(Math.max(3, local.length - 2))}@${dominio}`;
};

// ══════════════════════════════════════════════════════════════
// POLÍTICA DE SENHA
// ══════════════════════════════════════════════════════════════
export const validarSenha = senha => {
  if (typeof senha !== 'string') return 'Senha inválida';
  if (senha.length < AUTH_CONFIG.SENHA_MIN) {
    return `A senha deve ter pelo menos ${AUTH_CONFIG.SENHA_MIN} caracteres`;
  }
  if (senha.length > AUTH_CONFIG.SENHA_MAX) {
    return `A senha deve ter no máximo ${AUTH_CONFIG.SENHA_MAX} caracteres`;
  }
  if (!/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha)) {
    return 'A senha deve conter letras e números';
  }
  return null;
};

// ══════════════════════════════════════════════════════════════
// SESSÃO (JWT)
// ══════════════════════════════════════════════════════════════
// Payload compatível com o formato antigo (id = usuario, usuario, tipo, nome)
// + uid (ObjectId) para consultas ao banco.
export const criarPayloadSessao = user => ({
  id: user.usuario,
  uid: user._id.toString(),
  usuario: user.usuario,
  tipo: user.tipo,
  nome: user.nome,
});

export const assinarSessao = user =>
  jwt.sign(criarPayloadSessao(user), getSecret(), {
    expiresIn: AUTH_CONFIG.SESSAO_DURACAO_SEG,
  });

export const cookieSessao = token =>
  serializeCookie(AUTH_CONFIG.COOKIE_SESSAO, token, {
    maxAge: AUTH_CONFIG.SESSAO_DURACAO_SEG,
  });

export const cookiesLogout = () => [
  cookieExpirado(AUTH_CONFIG.COOKIE_SESSAO),
  cookieExpirado(AUTH_CONFIG.COOKIE_OTP),
];

export const verifyToken = token => {
  try {
    return jwt.verify(token, getSecret());
  } catch {
    return null;
  }
};

/** Converte um documento User no objeto público devolvido ao cliente */
export const userPublico = user => ({
  id: user.usuario,
  uid: user._id.toString(),
  nome: user.nome,
  usuario: user.usuario,
  tipo: user.tipo,
  email: user.email,
  telefone: user.telefone || '',
  endereco: user.endereco && user.endereco.rua ? user.endereco : null,
});

/**
 * Lê o cookie de sessão, valida o JWT e confirma no banco que o usuário
 * continua ativo e que a senha não foi alterada depois da emissão do token.
 * @returns {Promise<{user: object, payload: object} | null>}
 */
export const getSessao = async req => {
  const token = req.cookies?.[AUTH_CONFIG.COOKIE_SESSAO];
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  await dbConnect();

  const user = payload.uid
    ? await User.findById(payload.uid)
    : await User.findOne({ usuario: payload.usuario });

  if (!user || !user.ativo) return null;

  if (
    user.passwordAlteradaEm &&
    payload.iat &&
    payload.iat * 1000 < user.passwordAlteradaEm.getTime() - 1000
  ) {
    return null; // sessão emitida antes da última troca de senha
  }

  return { user, payload };
};

// ══════════════════════════════════════════════════════════════
// WRAPPERS PARA API ROUTES
// ══════════════════════════════════════════════════════════════
/**
 * requireAuth(handler, { tipos: ['admin'] })
 * Injeta req.user = { id, uid, usuario, tipo, nome, email, telefone }
 * e req.userDoc (documento Mongoose) para quem precisar.
 */
export const requireAuth = (handler, { tipos } = {}) => {
  return async (req, res) => {
    try {
      const sessao = await getSessao(req);
      if (!sessao) {
        return res.status(401).json({ message: 'Não autenticado' });
      }
      if (tipos && !tipos.includes(sessao.user.tipo)) {
        return res.status(403).json({ message: 'Acesso negado' });
      }
      req.user = {
        id: sessao.user.usuario,
        uid: sessao.user._id.toString(),
        usuario: sessao.user.usuario,
        tipo: sessao.user.tipo,
        nome: sessao.user.nome,
        email: sessao.user.email,
        telefone: sessao.user.telefone || '',
      };
      req.userDoc = sessao.user;
      return handler(req, res);
    } catch (error) {
      console.error('❌ Erro de autenticação:', error.message);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  };
};

export const requireAdmin = handler => requireAuth(handler, { tipos: ['admin'] });
export const requireDistribuidor = handler =>
  requireAuth(handler, { tipos: ['distribuidor'] });

// ══════════════════════════════════════════════════════════════
// BLOQUEIO POR TENTATIVAS
// ══════════════════════════════════════════════════════════════
export const contaBloqueada = user =>
  Boolean(user.bloqueadoAte && user.bloqueadoAte.getTime() > Date.now());

export const minutosRestantesBloqueio = user =>
  Math.max(1, Math.ceil((user.bloqueadoAte.getTime() - Date.now()) / 60000));

export const registarFalhaLogin = async user => {
  user.tentativasLogin = (user.tentativasLogin || 0) + 1;
  if (user.tentativasLogin >= AUTH_CONFIG.LOGIN_MAX_TENTATIVAS) {
    user.bloqueadoAte = new Date(
      Date.now() + AUTH_CONFIG.LOGIN_BLOQUEIO_MIN * 60 * 1000
    );
    user.tentativasLogin = 0;
  }
  await user.save();
};

export const registarSucessoLogin = async user => {
  user.tentativasLogin = 0;
  user.bloqueadoAte = null;
  user.ultimoLogin = new Date();
  await user.save();
};

// Usado quando o usuário não existe, para o tempo de resposta ser igual
let hashDummy = null;
export const compararSenhaDummy = async senha => {
  if (!hashDummy) hashDummy = await bcrypt.hash('dummy-password', 12);
  await bcrypt.compare(String(senha || ''), hashDummy);
  return false;
};

// ══════════════════════════════════════════════════════════════
// DISPOSITIVOS CONFIÁVEIS (pular OTP)
// ══════════════════════════════════════════════════════════════
export const dispositivoConfiavel = async (req, user) => {
  const cookie = req.cookies?.[AUTH_CONFIG.COOKIE_DISPOSITIVO];
  if (!cookie) return false;

  const payload = verifyToken(cookie);
  if (!payload || payload.uid !== user._id.toString() || !payload.did) {
    return false;
  }

  const agora = Date.now();
  const didHash = hashToken(payload.did);
  const dispositivo = (user.dispositivosConfiaveis || []).find(
    d => d.did === didHash && d.expiraEm.getTime() > agora
  );
  if (!dispositivo) return false;

  dispositivo.ultimoUso = new Date();
  return true;
};

/** Regista o dispositivo atual como confiável e devolve o cookie */
export const registarDispositivoConfiavel = (req, user) => {
  const did = gerarTokenAleatorio();
  const agora = Date.now();
  const expiraEm = new Date(agora + AUTH_CONFIG.DISPOSITIVO_DURACAO_SEG * 1000);

  const lista = (user.dispositivosConfiaveis || []).filter(
    d => d.expiraEm.getTime() > agora
  );
  lista.push({
    did: hashToken(did),
    nome: resumirUserAgent(req.headers['user-agent']),
    criadoEm: new Date(agora),
    ultimoUso: new Date(agora),
    expiraEm,
  });
  // Mantém só os N mais recentes
  user.dispositivosConfiaveis = lista.slice(-AUTH_CONFIG.DISPOSITIVOS_MAX);

  const token = jwt.sign({ uid: user._id.toString(), did }, getSecret(), {
    expiresIn: AUTH_CONFIG.DISPOSITIVO_DURACAO_SEG,
  });

  return serializeCookie(AUTH_CONFIG.COOKIE_DISPOSITIVO, token, {
    maxAge: AUTH_CONFIG.DISPOSITIVO_DURACAO_SEG,
  });
};

// ══════════════════════════════════════════════════════════════
// TOKENS DE USO ÚNICO (OTP / RESET / CONVITE)
// ══════════════════════════════════════════════════════════════
/** Invalida tokens pendentes do mesmo tipo e cria um novo. Devolve o valor em claro. */
export const criarTokenUsoUnico = async (user, tipo, req) => {
  await dbConnect();

  const valor = tipo === TIPOS_TOKEN.OTP_LOGIN ? gerarOtp() : gerarTokenAleatorio();
  const duracao =
    tipo === TIPOS_TOKEN.OTP_LOGIN
      ? AUTH_CONFIG.OTP_DURACAO_SEG
      : tipo === TIPOS_TOKEN.RESET_SENHA
      ? AUTH_CONFIG.RESET_DURACAO_SEG
      : AUTH_CONFIG.CONVITE_DURACAO_SEG;

  await AuthToken.deleteMany({ userId: user._id, tipo, usadoEm: null });

  const doc = await AuthToken.create({
    userId: user._id,
    tipo,
    tokenHash: hashToken(valor),
    expiraEm: new Date(Date.now() + duracao * 1000),
    meta: {
      ip: req ? getClientIp(req) : undefined,
      userAgent: req ? req.headers['user-agent'] : undefined,
    },
  });

  return { valor, doc };
};

/**
 * Valida um OTP para um usuário. Conta tentativas e marca como usado.
 * @returns {{ ok: boolean, motivo?: string }}
 */
export const validarOtp = async (user, codigo) => {
  await dbConnect();

  const doc = await AuthToken.findOne({
    userId: user._id,
    tipo: TIPOS_TOKEN.OTP_LOGIN,
    usadoEm: null,
  }).sort({ createdAt: -1 });

  if (!doc || doc.expiraEm.getTime() < Date.now()) {
    return { ok: false, motivo: 'Código expirado. Solicite um novo.' };
  }
  if (doc.tentativas >= AUTH_CONFIG.OTP_MAX_TENTATIVAS) {
    return {
      ok: false,
      motivo: 'Número máximo de tentativas excedido. Solicite um novo código.',
    };
  }

  const valido = compararHash(doc.tokenHash, hashToken(String(codigo).trim()));
  if (!valido) {
    doc.tentativas += 1;
    await doc.save();
    const restantes = AUTH_CONFIG.OTP_MAX_TENTATIVAS - doc.tentativas;
    return {
      ok: false,
      motivo:
        restantes > 0
          ? `Código incorreto. ${restantes} tentativa(s) restante(s).`
          : 'Número máximo de tentativas excedido. Solicite um novo código.',
    };
  }

  doc.usadoEm = new Date();
  await doc.save();
  return { ok: true };
};

/** Procura um token de reset/convite válido pelo valor em claro */
export const buscarTokenValido = async (valor, tipos) => {
  await dbConnect();
  if (!valor || typeof valor !== 'string' || valor.length !== 64) return null;

  const doc = await AuthToken.findOne({
    tokenHash: hashToken(valor),
    tipo: { $in: tipos },
    usadoEm: null,
    expiraEm: { $gt: new Date() },
  }).populate('userId');

  if (!doc || !doc.userId || !doc.userId.ativo) return null;
  return doc;
};

export { TIPOS_TOKEN };
