// pages/api/auth/forgot-password.js - ESQUECI MINHA SENHA
// ===================================
// Aceita usuário OU email. Responde SEMPRE com a mesma mensagem (200) para
// não revelar se a conta existe. Se existir, envia link de redefinição.

import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';
import { rateLimit, responder429 } from '../../../lib/rateLimit';
import { TIPOS_TOKEN, criarTokenUsoUnico, getClientIp } from '../../../lib/auth';
import { enviarResetSenha, enviarConviteDefinirSenha } from '../../../lib/authEmails';

const MENSAGEM_PADRAO =
  'Se a conta existir, você receberá um email com as instruções para redefinir a senha.';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const identificador = String(req.body?.identificador || '').trim();
  if (!identificador) {
    return res
      .status(400)
      .json({ success: false, message: 'Informe seu usuário ou email' });
  }

  const ip = getClientIp(req);
  const limiteIp = rateLimit(`forgot:ip:${ip}`, 10, 60 * 60 * 1000);
  if (!limiteIp.ok) return responder429(res, limiteIp);
  const limiteId = rateLimit(`forgot:id:${identificador.toLowerCase()}`, 3, 60 * 60 * 1000);
  if (!limiteId.ok) {
    // Não revela nada: responde como sucesso, mas não envia
    return res.status(200).json({ success: true, message: MENSAGEM_PADRAO });
  }

  try {
    await dbConnect();

    const user = await User.findOne({
      $or: [{ usuario: identificador }, { email: identificador.toLowerCase() }],
    });

    if (user && user.ativo && user.email) {
      // Senha nunca definida -> convite (7 dias). Caso normal -> reset (30 min).
      if (!user.senhaDefinida) {
        const { valor } = await criarTokenUsoUnico(user, TIPOS_TOKEN.CONVITE, req);
        await enviarConviteDefinirSenha({ user, token: valor, reenvio: true });
      } else {
        const { valor } = await criarTokenUsoUnico(user, TIPOS_TOKEN.RESET_SENHA, req);
        await enviarResetSenha({ user, token: valor });
      }
      console.log(`📨 Reset de senha enviado para ${user.usuario} (IP ${ip})`);
    } else {
      console.log(`ℹ️ Pedido de reset para conta inexistente/inativa: "${identificador}" (IP ${ip})`);
    }

    return res.status(200).json({ success: true, message: MENSAGEM_PADRAO });
  } catch (error) {
    console.error('💥 Erro em forgot-password:', error);
    // Mesmo em erro de email não expõe detalhes ao cliente
    return res.status(200).json({ success: true, message: MENSAGEM_PADRAO });
  }
}
