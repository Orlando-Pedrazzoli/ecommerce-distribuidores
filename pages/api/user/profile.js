// PAGES/API/USER/PROFILE.JS - ENDPOINT PARA ATUALIZAR PERFIL
// ===================================

import jwt from 'jsonwebtoken';
import User from '../../../models/User';
import dbConnect from '../../../lib/mongodb';

export default async function handler(req, res) {
  await dbConnect();

  try {
    const token = req.cookies['auth-token'];

    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);

    if (decoded.tipo === 'admin') {
      return res
        .status(403)
        .json({ message: 'Admin não pode atualizar perfil' });
    }

    if (req.method === 'PUT') {
      const { nome, telefone, endereco } = req.body;

      const user = await User.findByIdAndUpdate(
        decoded.id,
        { nome, telefone, endereco },
        { new: true, select: '-password' }
      );

      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      return res.status(200).json({
        success: true,
        message: 'Perfil atualizado com sucesso',
        user: {
          id: user._id,
          nome: user.nome,
          email: user.email,
          telefone: user.telefone,
          endereco: user.endereco,
          tipo: user.tipo,
        },
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
