// PAGES/API/AUTH/LOGIN.JS - ATUALIZADO PARA USUARIOS
// ===================================

import jwt from 'jsonwebtoken';
import User from '../../../models/User';
import dbConnect from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await dbConnect();

  const { email, password } = req.body;

  try {
    // Verificar se é login admin (fallback)
    if (
      email === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = jwt.sign(
        { id: 'admin', email, tipo: 'admin', nome: 'Admin' },
        process.env.NEXTAUTH_SECRET,
        { expiresIn: '24h' }
      );

      res.setHeader(
        'Set-Cookie',
        `auth-token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`
      );

      return res.status(200).json({
        success: true,
        message: 'Login admin realizado com sucesso',
        user: { tipo: 'admin', nome: 'Admin' },
      });
    }

    // Login de usuário distribuidor
    const user = await User.findOne({ email, ativo: true });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos',
      });
    }

    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha incorretos',
      });
    }

    // Atualizar último login
    user.ultimoLogin = new Date();
    await user.save();

    // Criar token JWT
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        tipo: user.tipo,
        nome: user.nome,
      },
      process.env.NEXTAUTH_SECRET,
      { expiresIn: '24h' }
    );

    res.setHeader(
      'Set-Cookie',
      `auth-token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`
    );

    return res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso',
      user: {
        id: user._id,
        nome: user.nome,
        email: user.email,
        tipo: user.tipo,
      },
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
    });
  }
}
