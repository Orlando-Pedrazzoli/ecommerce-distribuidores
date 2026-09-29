// pages/api/convites/[token].js - VALIDAR CONVITE E CRIAR CONTA (PÚBLICO)
// ===================================
// GET  -> { valido, email, nome, expiraEm }  (usado pela página /cadastro/[token])
// POST { usuario, nome, telefone, senha, endereco? }
//      -> cria o User distribuidor, marca o convite como aceite e inicia a
//         sessão (o email foi verificado pelo próprio link, por isso o
//         dispositivo fica como confiável sem OTP).

import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import Convite, { STATUS_CONVITE } from '../../../models/Convite';
import {
  AUTH_CONFIG,
  hashToken,
  validarSenha,
  assinarSessao,
  cookieSessao,
  setCookies,
  registarDispositivoConfiavel,
  registarSucessoLogin,
  userPublico,
  getClientIp,
} from '../../../lib/auth';
import { rateLimit } from '../../../lib/rateLimit';

const USUARIO_REGEX = /^[a-z0-9._-]{3,30}$/;

const buscarConvite = async token => {
  if (!token || typeof token !== 'string' || token.length !== 64) return null;
  const convite = await Convite.findOne({
    tokenHash: hashToken(token),
    status: STATUS_CONVITE.PENDENTE,
  });
  if (!convite || convite.expiraEm.getTime() < Date.now()) return null;
  return convite;
};

export default async function handler(req, res) {
  const { token } = req.query;
  const ip = getClientIp(req);

  const limite = rateLimit(`convite:ip:${ip}`, 30, 15 * 60 * 1000);
  if (!limite.ok) {
    return res.status(429).json({ message: 'Muitas tentativas. Tente novamente mais tarde.' });
  }

  await dbConnect();

  // ── GET: validar ──
  if (req.method === 'GET') {
    const convite = await buscarConvite(token);
    if (!convite) return res.status(200).json({ valido: false });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      valido: true,
      email: convite.email,
      nome: convite.nome || '',
      expiraEm: convite.expiraEm,
    });
  }

  // ── POST: criar conta ──
  if (req.method === 'POST') {
    try {
      const convite = await buscarConvite(token);
      if (!convite) {
        return res.status(400).json({ message: 'Convite inválido, expirado ou já utilizado' });
      }

      const usuario = String(req.body?.usuario || '')
        .trim()
        .toLowerCase();
      const nome = String(req.body?.nome || '').trim();
      const telefone = String(req.body?.telefone || '').trim();
      const senha = req.body?.senha;
      const enderecoBody = req.body?.endereco || {};

      if (!USUARIO_REGEX.test(usuario)) {
        return res.status(400).json({
          message:
            'Usuário inválido: use 3-30 caracteres (letras minúsculas, números, ponto, hífen ou underscore)',
        });
      }
      if (!nome) return res.status(400).json({ message: 'Nome é obrigatório' });
      if (!telefone) return res.status(400).json({ message: 'Telefone é obrigatório' });

      const erroSenha = validarSenha(senha);
      if (erroSenha) return res.status(400).json({ message: erroSenha });

      const [usuarioOcupado, emailOcupado] = await Promise.all([
        User.findOne({ usuario }),
        User.findOne({ email: convite.email }),
      ]);
      if (usuarioOcupado)
        return res
          .status(409)
          .json({ message: 'Este nome de usuário já está em uso. Escolha outro.' });
      if (emailOcupado) {
        convite.status = STATUS_CONVITE.CANCELADO;
        convite.canceladoEm = new Date();
        await convite.save();
        return res
          .status(409)
          .json({
            message:
              'Já existe uma conta com este email. Use "Esqueci minha senha" na tela de login.',
          });
      }

      // Endereço opcional: só guarda se a rua vier preenchida
      const limpar = v => String(v || '').trim();
      const endereco = limpar(enderecoBody.rua)
        ? {
            rua: limpar(enderecoBody.rua),
            numero: limpar(enderecoBody.numero),
            complemento: limpar(enderecoBody.complemento),
            bairro: limpar(enderecoBody.bairro),
            cidade: limpar(enderecoBody.cidade),
            cep: limpar(enderecoBody.cep),
            estado: limpar(enderecoBody.estado).toUpperCase().slice(0, 2),
          }
        : undefined;

      const user = new User({
        usuario,
        nome,
        email: convite.email,
        telefone,
        endereco,
        password: senha, // hash feito no pre('save')
        tipo: 'distribuidor',
        ativo: true,
      });
      await user.save();

      convite.status = STATUS_CONVITE.ACEITE;
      convite.aceiteEm = new Date();
      convite.userId = user._id;
      await convite.save();

      // Sessão + dispositivo confiável (email verificado pelo link)
      const cookies = [cookieSessao(assinarSessao(user)), registarDispositivoConfiavel(req, user)];
      await registarSucessoLogin(user);
      setCookies(res, cookies);

      console.log(`🎉 Distribuidor auto-cadastrado via convite: ${usuario} (${convite.email})`);
      return res.status(201).json({
        success: true,
        message: 'Conta criada com sucesso',
        user: userPublico(user),
      });
    } catch (error) {
      console.error('❌ Erro ao concluir cadastro por convite:', error);
      if (error.code === 11000)
        return res.status(409).json({ message: 'Usuário ou email já cadastrado' });
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
