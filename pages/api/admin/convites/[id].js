// pages/api/admin/convites/[id].js - REENVIAR / CANCELAR CONVITE
// ===================================
// PATCH  { acao: 'reenviar' } -> gera novo token (renova 7 dias) e reenvia o email
// DELETE                       -> cancela (o link deixa de funcionar)

import mongoose from 'mongoose';
import dbConnect from '../../../../lib/mongodb';
import Convite, { STATUS_CONVITE } from '../../../../models/Convite';
import { requireAdmin, AUTH_CONFIG, hashToken, gerarTokenAleatorio } from '../../../../lib/auth';
import { enviarConviteCadastro } from '../../../../lib/authEmails';
import { serializarConvite } from '../../../../lib/convites';

async function handler(req, res) {
  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }

  await dbConnect();
  const convite = await Convite.findById(id);
  if (!convite) return res.status(404).json({ message: 'Convite não encontrado' });

  // ── PATCH: reenviar ──
  if (req.method === 'PATCH') {
    const acao = String(req.body?.acao || '');
    if (acao !== 'reenviar') return res.status(400).json({ message: `Ação desconhecida: ${acao}` });

    if (convite.status === STATUS_CONVITE.ACEITE) {
      return res.status(400).json({ message: 'Este convite já foi aceite' });
    }

    try {
      const token = gerarTokenAleatorio();
      convite.tokenHash = hashToken(token);
      convite.expiraEm = new Date(Date.now() + AUTH_CONFIG.CONVITE_DURACAO_SEG * 1000);
      convite.status = STATUS_CONVITE.PENDENTE;
      convite.canceladoEm = null;
      convite.reenvios = (convite.reenvios || 0) + 1;

      await enviarConviteCadastro({ convite, token, adminNome: req.user.nome, reenvio: true });
      convite.enviadoEm = new Date();
      convite.ultimoErroEnvio = '';
      await convite.save();

      return res.status(200).json({
        success: true,
        message: `Convite reenviado para ${convite.email}`,
        convite: serializarConvite(convite),
      });
    } catch (error) {
      console.error('❌ Erro ao reenviar convite:', error);
      convite.ultimoErroEnvio = error.message;
      await convite.save();
      return res.status(500).json({ message: `Falha ao enviar o email: ${error.message}` });
    }
  }

  // ── DELETE: cancelar ──
  if (req.method === 'DELETE') {
    if (convite.status === STATUS_CONVITE.ACEITE) {
      return res
        .status(400)
        .json({ message: 'Convite já aceite: gira a conta na lista de distribuidores' });
    }
    convite.status = STATUS_CONVITE.CANCELADO;
    convite.canceladoEm = new Date();
    await convite.save();
    return res
      .status(200)
      .json({ success: true, message: 'Convite cancelado', convite: serializarConvite(convite) });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default requireAdmin(handler);
