// pages/api/admin/convites/index.js - LISTAR / ENVIAR CONVITES DE CADASTRO
// ===================================
// GET  -> lista de convites (mais recentes primeiro) + contagens
// POST { email, nome?, mensagem? } -> cria convite e envia o email
//
// Regras:
// - não convida um email que já tem conta (User)
// - um convite pendente para o mesmo email é substituído (token antigo invalidado)

import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';
import Convite, { STATUS_CONVITE } from '../../../../models/Convite';
import { requireAdmin, AUTH_CONFIG, hashToken, gerarTokenAleatorio } from '../../../../lib/auth';
import { enviarConviteCadastro } from '../../../../lib/authEmails';
import { serializarConvite } from '../../../../lib/convites';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handler(req, res) {
  await dbConnect();

  // ── GET ──
  if (req.method === 'GET') {
    try {
      const convites = await Convite.find({})
        .populate('userId', 'usuario nome')
        .populate('criadoPor', 'usuario nome')
        .sort({ createdAt: -1 })
        .limit(200);
      const lista = convites.map(serializarConvite);
      return res.status(200).json({
        success: true,
        total: lista.length,
        pendentes: lista.filter(c => c.status === 'pendente').length,
        aceites: lista.filter(c => c.status === 'aceite').length,
        expirados: lista.filter(c => c.status === 'expirado').length,
        convites: lista,
      });
    } catch (error) {
      console.error('❌ Erro ao listar convites:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  // ── POST ──
  if (req.method === 'POST') {
    try {
      const email = String(req.body?.email || '')
        .trim()
        .toLowerCase();
      const nome = String(req.body?.nome || '')
        .trim()
        .slice(0, 120);
      const mensagem = String(req.body?.mensagem || '')
        .trim()
        .slice(0, 1000);

      if (!EMAIL_REGEX.test(email)) return res.status(400).json({ message: 'Email inválido' });

      const jaExiste = await User.findOne({ email });
      if (jaExiste) {
        return res.status(409).json({
          message: `Já existe uma conta com este email (usuário "${jaExiste.usuario}"). Use "Reenviar convite" na lista de distribuidores.`,
        });
      }

      // Substitui convite pendente anterior para o mesmo email
      await Convite.updateMany(
        { email, status: STATUS_CONVITE.PENDENTE },
        { $set: { status: STATUS_CONVITE.CANCELADO, canceladoEm: new Date() } },
      );

      const token = gerarTokenAleatorio();
      const convite = await Convite.create({
        email,
        nome,
        mensagem,
        tokenHash: hashToken(token),
        expiraEm: new Date(Date.now() + AUTH_CONFIG.CONVITE_DURACAO_SEG * 1000),
        criadoPor: req.user.uid,
      });

      let enviado = false;
      try {
        await enviarConviteCadastro({ convite, token, adminNome: req.user.nome });
        convite.enviadoEm = new Date();
        convite.ultimoErroEnvio = '';
        enviado = true;
      } catch (emailError) {
        console.error('⚠️ Convite criado, mas o email falhou:', emailError.message);
        convite.ultimoErroEnvio = emailError.message;
      }
      await convite.save();

      console.log(`✉️ Convite de cadastro para ${email} criado por ${req.user.usuario}`);
      return res.status(201).json({
        success: true,
        enviado,
        message: enviado
          ? `Convite enviado para ${email}`
          : `Convite criado, mas o email NÃO foi enviado (${convite.ultimoErroEnvio}). Use "Reenviar".`,
        convite: serializarConvite(convite),
      });
    } catch (error) {
      console.error('❌ Erro ao criar convite:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default requireAdmin(handler);
