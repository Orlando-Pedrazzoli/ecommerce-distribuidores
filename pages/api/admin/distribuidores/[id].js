// pages/api/admin/distribuidores/[id].js - DETALHE / EDITAR / AÇÕES
// ===================================
// GET    -> detalhe
// PUT    -> editar nome, email, telefone, endereco, ativo
// DELETE -> desativar (soft delete; nunca apaga, os pedidos referenciam o usuário)
// PATCH  { acao } -> 'reenviar-convite' | 'resetar-senha' | 'desbloquear'
//                    | 'revogar-dispositivos' | 'ativar' | 'desativar'

import mongoose from 'mongoose';
import dbConnect from '../../../../lib/mongodb';
import User from '../../../../models/User';
import AuthToken from '../../../../models/AuthToken';
import { requireAdmin, criarTokenUsoUnico, TIPOS_TOKEN } from '../../../../lib/auth';
import { enviarConviteDefinirSenha, enviarResetSenha } from '../../../../lib/authEmails';
import { serializarDistribuidor } from '../../../../lib/usuarios';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handler(req, res) {
  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }

  await dbConnect();
  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ message: 'Usuário não encontrado' });
  }

  const ehProprioAdmin = user._id.toString() === req.user.uid;

  // ── GET ──
  if (req.method === 'GET') {
    return res.status(200).json({ success: true, distribuidor: serializarDistribuidor(user) });
  }

  // ── PUT: editar dados ──
  if (req.method === 'PUT') {
    try {
      const { nome, email, telefone, endereco, ativo } = req.body || {};

      if (nome !== undefined) {
        if (!String(nome).trim()) return res.status(400).json({ message: 'Nome é obrigatório' });
        user.nome = String(nome).trim();
      }
      if (email !== undefined) {
        const novoEmail = String(email).trim().toLowerCase();
        if (!EMAIL_REGEX.test(novoEmail)) return res.status(400).json({ message: 'Email inválido' });
        const duplicado = await User.findOne({ email: novoEmail, _id: { $ne: user._id } });
        if (duplicado) return res.status(409).json({ message: 'Já existe uma conta com este email' });
        user.email = novoEmail;
      }
      if (telefone !== undefined) user.telefone = String(telefone).trim();
      if (endereco !== undefined) user.endereco = endereco;
      if (ativo !== undefined) {
        if (ehProprioAdmin && !ativo) {
          return res.status(400).json({ message: 'Você não pode desativar a sua própria conta' });
        }
        user.ativo = Boolean(ativo);
      }

      await user.save();
      console.log(`✏️ ${user.usuario} editado por ${req.user.usuario}`);
      return res.status(200).json({
        success: true,
        message: 'Dados atualizados',
        distribuidor: serializarDistribuidor(user),
      });
    } catch (error) {
      console.error('❌ Erro ao editar usuário:', error);
      if (error.code === 11000) return res.status(409).json({ message: 'Email já cadastrado' });
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  // ── DELETE: desativar ──
  if (req.method === 'DELETE') {
    if (ehProprioAdmin) {
      return res.status(400).json({ message: 'Você não pode desativar a sua própria conta' });
    }
    user.ativo = false;
    user.dispositivosConfiaveis = [];
    await user.save();
    await AuthToken.deleteMany({ userId: user._id, usadoEm: null });
    console.log(`🚫 ${user.usuario} desativado por ${req.user.usuario}`);
    return res.status(200).json({
      success: true,
      message: 'Conta desativada. As sessões ativas deixam de funcionar.',
      distribuidor: serializarDistribuidor(user),
    });
  }

  // ── PATCH: ações ──
  if (req.method === 'PATCH') {
    const acao = String(req.body?.acao || '');
    try {
      switch (acao) {
        case 'reenviar-convite': {
          if (!user.email) return res.status(400).json({ message: 'Usuário sem email' });
          const { valor } = await criarTokenUsoUnico(user, TIPOS_TOKEN.CONVITE, req);
          await enviarConviteDefinirSenha({ user, token: valor, reenvio: user.senhaDefinida });
          return res.status(200).json({ success: true, message: `Convite enviado para ${user.email}` });
        }

        case 'resetar-senha': {
          // Apaga a senha atual: o usuário só volta a entrar depois de definir uma nova
          if (!user.email) return res.status(400).json({ message: 'Usuário sem email' });
          user.password = undefined;
          user.senhaDefinida = false;
          user.passwordAlteradaEm = new Date(); // derruba sessões abertas
          user.dispositivosConfiaveis = [];
          user.tentativasLogin = 0;
          user.bloqueadoAte = null;
          await user.save();
          const { valor } = await criarTokenUsoUnico(user, TIPOS_TOKEN.CONVITE, req);
          await enviarConviteDefinirSenha({ user, token: valor, reenvio: true });
          console.log(`🔑 Senha de ${user.usuario} resetada por ${req.user.usuario}`);
          return res.status(200).json({
            success: true,
            message: `Senha removida e link de definição enviado para ${user.email}`,
            distribuidor: serializarDistribuidor(user),
          });
        }

        case 'enviar-link-reset': {
          // Mantém a senha atual, só envia o link de 30 min
          if (!user.email) return res.status(400).json({ message: 'Usuário sem email' });
          const { valor } = await criarTokenUsoUnico(user, TIPOS_TOKEN.RESET_SENHA, req);
          await enviarResetSenha({ user, token: valor });
          return res.status(200).json({ success: true, message: `Link de redefinição enviado para ${user.email}` });
        }

        case 'desbloquear': {
          user.bloqueadoAte = null;
          user.tentativasLogin = 0;
          await user.save();
          return res.status(200).json({
            success: true,
            message: 'Conta desbloqueada',
            distribuidor: serializarDistribuidor(user),
          });
        }

        case 'revogar-dispositivos': {
          user.dispositivosConfiaveis = [];
          await user.save();
          return res.status(200).json({
            success: true,
            message: 'Dispositivos confiáveis removidos. Será pedido OTP no próximo login.',
            distribuidor: serializarDistribuidor(user),
          });
        }

        case 'ativar':
        case 'desativar': {
          if (acao === 'desativar' && ehProprioAdmin) {
            return res.status(400).json({ message: 'Você não pode desativar a sua própria conta' });
          }
          user.ativo = acao === 'ativar';
          if (!user.ativo) user.dispositivosConfiaveis = [];
          await user.save();
          return res.status(200).json({
            success: true,
            message: user.ativo ? 'Conta ativada' : 'Conta desativada',
            distribuidor: serializarDistribuidor(user),
          });
        }

        default:
          return res.status(400).json({ message: `Ação desconhecida: ${acao}` });
      }
    } catch (error) {
      console.error(`❌ Erro na ação "${acao}":`, error);
      return res.status(500).json({ message: 'Erro ao executar a ação' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default requireAdmin(handler);
