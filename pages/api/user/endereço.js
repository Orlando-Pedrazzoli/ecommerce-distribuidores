// pages/api/user/endereco.js - NOVA API PARA SALVAR ENDEREÇOS
// ===================================

import jwt from 'jsonwebtoken';
import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verificar autenticação
    const token = req.cookies['auth-token'];
    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
    if (decoded.tipo !== 'distribuidor') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const { endereco } = req.body;

    if (!endereco) {
      return res.status(400).json({ message: 'Endereço é obrigatório' });
    }

    // Validar campos obrigatórios do endereço
    const camposObrigatorios = [
      'rua',
      'numero',
      'bairro',
      'cidade',
      'cep',
      'estado',
    ];
    const camposFaltando = camposObrigatorios.filter(
      campo => !endereco[campo] || !endereco[campo].trim()
    );

    if (camposFaltando.length > 0) {
      return res.status(400).json({
        message: 'Campos obrigatórios faltando',
        campos: camposFaltando,
      });
    }

    // Buscar usuário existente ou criar novo
    let user = await User.findOne({ usuario: decoded.usuario });

    if (!user) {
      // Criar novo registro do distribuidor
      user = new User({
        usuario: decoded.usuario,
        nome: decoded.nome,
        email: decoded.email || `${decoded.usuario}@distribuidora.com`,
        telefone: decoded.telefone || '(11) 99999-9999',
        tipo: 'distribuidor',
        endereco: endereco,
        // Password fictício (distribuidor não faz login por senha no banco)
        password: 'senha_ficticias_123',
      });
    } else {
      // Atualizar endereço existente
      user.endereco = endereco;
    }

    await user.save();

    console.log(`📍 Endereço salvo para ${decoded.usuario}:`, endereco);

    return res.status(200).json({
      success: true,
      message: 'Endereço salvo com sucesso',
      endereco: user.endereco,
    });
  } catch (error) {
    console.error('❌ Erro ao salvar endereço:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message,
    });
  }
}
