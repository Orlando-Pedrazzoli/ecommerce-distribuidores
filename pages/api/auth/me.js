// pages/api/auth/me.js - ATUALIZADO COM SISTEMA HÍBRIDO
// ===================================

import jwt from 'jsonwebtoken';
import dbConnect from '../../../lib/mongodb';
import User from '../../../models/User';

// Função para carregar distribuidores do .env com endereços completos
const getDistribuidores = () => {
  const distribuidores = [];
  for (let i = 1; i <= 20; i++) {
    const distribuidorEnv = process.env[`DISTRIBUIDOR_${i}`];
    if (distribuidorEnv) {
      const parts = distribuidorEnv.split(':');
      if (parts.length >= 12) {
        // Verificar se tem todos os campos
        const [
          usuario,
          password,
          nomeCompleto,
          email,
          telefone,
          rua,
          numero,
          complemento,
          bairro,
          cidade,
          cep,
          estado,
        ] = parts;

        distribuidores.push({
          usuario: usuario.trim(),
          password: password.trim(),
          nomeCompleto: nomeCompleto.trim(),
          email: email.trim(),
          telefone: telefone.trim(),
          endereco: {
            rua: rua.trim(),
            numero: numero.trim(),
            complemento: complemento.trim(),
            bairro: bairro.trim(),
            cidade: cidade.trim(),
            cep: cep.trim(),
            estado: estado.trim(),
          },
        });
      } else {
        console.warn(
          `⚠️ DISTRIBUIDOR_${i} não tem todos os campos necessários`
        );
      }
    }
  }
  return distribuidores;
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

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
          nome: 'Administrador',
          usuario: decoded.usuario,
          tipo: 'admin',
        },
      });
    }

    // Se for distribuidor, buscar dados com sistema híbrido
    if (decoded.tipo === 'distribuidor') {
      const distribuidores = getDistribuidores();
      const distribuidorEnv = distribuidores.find(
        d => d.usuario === decoded.usuario
      );

      if (!distribuidorEnv) {
        return res
          .status(404)
          .json({ message: 'Distribuidor não encontrado no .env' });
      }

      // 🎯 SISTEMA HÍBRIDO: Buscar endereço do banco primeiro, senão usar .env
      let enderecoFinal = distribuidorEnv.endereco; // Padrão do .env

      try {
        const userFromDB = await User.findOne({ usuario: decoded.usuario });
        if (userFromDB && userFromDB.endereco) {
          enderecoFinal = userFromDB.endereco; // Priorizar banco
          console.log(`📍 Endereço carregado do banco para ${decoded.usuario}`);
        } else {
          console.log(`📍 Endereço carregado do .env para ${decoded.usuario}`);
        }
      } catch (dbError) {
        console.warn(
          '⚠️ Erro ao buscar no banco, usando .env:',
          dbError.message
        );
      }

      return res.status(200).json({
        success: true,
        user: {
          id: distribuidorEnv.usuario,
          nome: distribuidorEnv.nomeCompleto,
          usuario: distribuidorEnv.usuario,
          tipo: 'distribuidor',
          email: distribuidorEnv.email,
          telefone: distribuidorEnv.telefone,
          endereco: enderecoFinal, // 🔥 Banco > .env
        },
      });
    }

    return res.status(404).json({ message: 'Usuário não encontrado' });
  } catch (error) {
    console.error('❌ Erro ao verificar usuário:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }
    return res.status(500).json({
      message: 'Erro interno do servidor',
      error: error.message,
    });
  }
}
