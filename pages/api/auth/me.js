// pages/api/auth/me.js - USUÁRIO DA SESSÃO ATUAL
// ===================================
// Lê tudo do Mongo (sem .env). Devolve o mesmo formato que as páginas já
// consomem: { success, user: { id, nome, usuario, tipo, email, telefone, endereco } }.
// Também confirma que a conta continua ativa e que a sessão não foi revogada.

import { getSessao, userPublico } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const sessao = await getSessao(req);
    if (!sessao) {
      return res.status(401).json({ success: false, message: 'Não autenticado' });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      user: userPublico(sessao.user),
    });
  } catch (error) {
    console.error('❌ Erro ao verificar usuário:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}
