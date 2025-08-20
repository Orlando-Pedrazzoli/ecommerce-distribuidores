// PAGES/API/AUTH/ME.JS - NOVO ENDPOINT PARA DADOS DO USUARIO
// ===================================

import jwt from 'jsonwebtoken';
import User from '../../../models/User';
import dbConnect from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = req.cookies['auth-token'];

    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);

    // Se for admin
    if (decoded.tipo === 'admin') {
      return res.status(200).json({
        success: true,
        user: {
          id: 'admin',
          nome: 'Admin',
          email: decoded.email,
          tipo: 'admin',
        },
      });
    }

    // Se for usuário distribuidor
    await dbConnect();
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
        endereco: user.endereco,
        tipo: user.tipo,
      },
    });
  } catch (error) {
    console.error('Erro ao verificar usuário:', error);
    return res.status(401).json({ message: 'Token inválido' });
  }
}
