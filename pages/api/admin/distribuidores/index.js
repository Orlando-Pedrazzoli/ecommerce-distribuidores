// pages/api/admin/distribuidores/index.js - LISTAR / CRIAR DISTRIBUIDORES
// ===================================
// GET  -> lista (sem campos sensíveis)
// POST -> cria distribuidor e envia email de convite para definir a senha

import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';
import { requireAdmin, criarTokenUsoUnico, TIPOS_TOKEN } from '../../../../lib/auth';
import { enviarConviteDefinirSenha } from '../../../../lib/authEmails';
import { serializarDistribuidor } from '../../../../lib/usuarios';

const USUARIO_REGEX = /^[a-z0-9._-]{3,30}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handler(req, res) {
  await dbConnect();

  // ── GET: listar ──
  if (req.method === 'GET') {
    try {
      const { tipo = 'distribuidor', busca = '' } = req.query;
      const filtro = {};
      if (tipo !== 'todos') filtro.tipo = tipo;
      if (busca) {
        const re = new RegExp(String(busca).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filtro.$or = [{ usuario: re }, { nome: re }, { email: re }];
      }

      const usuarios = await User.find(filtro).sort({ nome: 1 });
      const lista = usuarios.map(serializarDistribuidor);

      return res.status(200).json({
        success: true,
        total: lista.length,
        ativos: lista.filter(u => u.ativo).length,
        semSenha: lista.filter(u => !u.senhaDefinida).length,
        distribuidores: lista,
      });
    } catch (error) {
      console.error('❌ Erro ao listar distribuidores:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  // ── POST: criar ──
  if (req.method === 'POST') {
    try {
      const usuario = String(req.body?.usuario || '').trim().toLowerCase();
      const nome = String(req.body?.nome || '').trim();
      const email = String(req.body?.email || '').trim().toLowerCase();
      const telefone = String(req.body?.telefone || '').trim();
      const endereco = req.body?.endereco || undefined;
      const enviarConvite = req.body?.enviarConvite !== false;

      if (!USUARIO_REGEX.test(usuario)) {
        return res.status(400).json({
          message: 'Usuário inválido: use 3-30 caracteres (letras minúsculas, números, ponto, hífen ou underscore)',
        });
      }
      if (!nome) return res.status(400).json({ message: 'Nome é obrigatório' });
      if (!EMAIL_REGEX.test(email)) return res.status(400).json({ message: 'Email inválido' });

      const existente = await User.findOne({ $or: [{ usuario }, { email }] });
      if (existente) {
        return res.status(409).json({
          message:
            existente.usuario === usuario
              ? 'Já existe uma conta com este usuário'
              : 'Já existe uma conta com este email',
        });
      }

      const user = await User.create({
        usuario,
        nome,
        email,
        telefone,
        endereco,
        tipo: 'distribuidor',
        ativo: true,
        senhaDefinida: false,
      });

      let conviteEnviado = false;
      if (enviarConvite) {
        try {
          const { valor } = await criarTokenUsoUnico(user, TIPOS_TOKEN.CONVITE, req);
          await enviarConviteDefinirSenha({ user, token: valor });
          conviteEnviado = true;
        } catch (emailError) {
          console.error('⚠️ Distribuidor criado, mas falhou o envio do convite:', emailError.message);
        }
      }

      console.log(`👤 Distribuidor criado por ${req.user.usuario}: ${usuario}`);
      return res.status(201).json({
        success: true,
        message: conviteEnviado
          ? 'Distribuidor criado. Email de convite enviado.'
          : 'Distribuidor criado. O convite NÃO foi enviado — use "Reenviar convite".',
        conviteEnviado,
        distribuidor: serializarDistribuidor(user),
      });
    } catch (error) {
      console.error('❌ Erro ao criar distribuidor:', error);
      if (error.code === 11000) {
        return res.status(409).json({ message: 'Usuário ou email já cadastrado' });
      }
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default requireAdmin(handler);
