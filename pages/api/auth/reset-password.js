// pages/api/auth/reset-password.js - REDEFINIR / DEFINIR SENHA VIA TOKEN
// ===================================
// GET  ?token=...            -> valida o token (para a página mostrar o formulário)
// POST { token, novaSenha }  -> define a nova senha, invalida sessões antigas,
//                               revoga dispositivos confiáveis e avisa por email

import AuthToken from '../../../models/AuthToken';
import { rateLimit, responder429 } from '../../../lib/rateLimit';
import {
  TIPOS_TOKEN,
  buscarTokenValido,
  validarSenha,
  getClientIp,
  resumirUserAgent,
  cookiesLogout,
  setCookies,
} from '../../../lib/auth';
import { enviarAvisoSenhaAlterada } from '../../../lib/authEmails';

const TIPOS_ACEITES = [TIPOS_TOKEN.RESET_SENHA, TIPOS_TOKEN.CONVITE];
const MENSAGEM_INVALIDO = 'Link inválido ou expirado. Solicite um novo.';

export default async function handler(req, res) {
  const ip = getClientIp(req);
  const limite = rateLimit(`reset:ip:${ip}`, 20, 15 * 60 * 1000);
  if (!limite.ok) return responder429(res, limite);

  // ── GET: validar token ──
  if (req.method === 'GET') {
    const token = String(req.query?.token || '');
    const doc = await buscarTokenValido(token, TIPOS_ACEITES);
    if (!doc) {
      return res.status(400).json({ valido: false, message: MENSAGEM_INVALIDO });
    }
    return res.status(200).json({
      valido: true,
      nome: doc.userId.nome,
      usuario: doc.userId.usuario,
      convite: doc.tipo === TIPOS_TOKEN.CONVITE,
    });
  }

  // ── POST: definir nova senha ──
  if (req.method === 'POST') {
    const token = String(req.body?.token || '');
    const novaSenha = String(req.body?.novaSenha || '');

    const erroSenha = validarSenha(novaSenha);
    if (erroSenha) {
      return res.status(400).json({ success: false, message: erroSenha });
    }

    try {
      const doc = await buscarTokenValido(token, TIPOS_ACEITES);
      if (!doc) {
        return res.status(400).json({ success: false, message: MENSAGEM_INVALIDO });
      }

      const user = doc.userId;

      // Marca o token como usado ANTES de gravar a senha (uso único garantido)
      doc.usadoEm = new Date();
      await doc.save();

      user.password = novaSenha; // pre-save faz o hash e atualiza passwordAlteradaEm
      user.tentativasLogin = 0;
      user.bloqueadoAte = null;
      user.dispositivosConfiaveis = []; // exige OTP em todos os dispositivos
      await user.save();

      // Invalida quaisquer outros tokens pendentes deste usuário
      await AuthToken.deleteMany({ userId: user._id, usadoEm: null });

      // Encerra a sessão atual deste navegador (se houver)
      setCookies(res, cookiesLogout());

      enviarAvisoSenhaAlterada({
        user,
        dispositivo: resumirUserAgent(req.headers['user-agent']),
        ip,
      }).catch(err => console.error('⚠️ Falha ao enviar aviso de senha alterada:', err.message));

      console.log(`🔑 Senha redefinida: ${user.usuario} (IP ${ip})`);
      return res.status(200).json({
        success: true,
        message: 'Senha definida com sucesso. Faça login com a nova senha.',
      });
    } catch (error) {
      console.error('💥 Erro em reset-password:', error);
      return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
