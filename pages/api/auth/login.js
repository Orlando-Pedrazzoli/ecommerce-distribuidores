// 12. PAGES/API/AUTH/LOGIN.JS
// ===================================

import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { username, password } = req.body;

  // Verificação simples com .env
  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign(
      { username, role: 'distribuidor' },
      process.env.NEXTAUTH_SECRET,
      { expiresIn: '24h' }
    );

    res.setHeader(
      'Set-Cookie',
      `auth-token=${token}; HttpOnly; Path=/; Max-Age=86400`
    );
    return res
      .status(200)
      .json({ success: true, message: 'Login realizado com sucesso' });
  }

  return res
    .status(401)
    .json({ success: false, message: 'Credenciais inválidas' });
}
