// pages/api/auth/change-password.js - ALTERAR SENHA (USUÁRIO LOGADO)
// ===================================
// Exige a senha atual. Depois de alterar, emite uma NOVA sessão para este
// navegador (as outras sessões ficam inválidas via passwordAlteradaEm).

import User from '../../../models/User';
import { rateLimit, responder429 } from '../../../lib/rateLimit';
import {
  requireAuth,
  validarSenha,
  assinarSessao,
  cookieSessao,
  setCookies,
  getClientIp,
  resumirUserAgent,
} from '../../../lib/auth';
import { enviarAvisoSenhaAlterada } from '../../../lib/authEmails';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const limite = rateLimit(`change-pw:${req.user.uid}`, 5, 15 * 60 * 1000);
  if (!limite.ok) return responder429(res, limite);

  const senhaAtual = String(req.body?.senhaAtual || '');
  const novaSenha = String(req.body?.novaSenha || '');

  const erroSenha = validarSenha(novaSenha);
  if (erroSenha) {
    return res.status(400).json({ success: false, message: erroSenha });
  }
  if (senhaAtual === novaSenha) {
    return res
      .status(400)
      .json({ success: false, message: 'A nova senha deve ser diferente da atual' });
  }

  try {
    const user = await User.findById(req.user.uid).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
    }

    const ok = await user.comparePassword(senhaAtual);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Senha atual incorreta' });
    }

    user.password = novaSenha;
    await user.save();

    // Reemite a sessão deste navegador (iat >= passwordAlteradaEm)
    setCookies(res, [cookieSessao(assinarSessao(user))]);

    enviarAvisoSenhaAlterada({
      user,
      dispositivo: resumirUserAgent(req.headers['user-agent']),
      ip: getClientIp(req),
    }).catch(err => console.error('⚠️ Falha ao enviar aviso de senha alterada:', err.message));

    console.log(`🔑 Senha alterada: ${user.usuario}`);
    return res.status(200).json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('💥 Erro em change-password:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

export default requireAuth(handler);
