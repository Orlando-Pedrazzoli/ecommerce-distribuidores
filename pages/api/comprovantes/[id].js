// pages/api/comprovantes/[id].js - VER / BAIXAR UM COMPROVANTE
// ===================================
// GET -> devolve o arquivo (imagem ou PDF). Só o distribuidor que o enviou
// ou o admin conseguem abrir. ?download=1 força o download.

import dbConnect from '../../../lib/mongodb';
import Comprovante from '../../../models/Comprovante';
import { requireAuth } from '../../../lib/auth';
import { extensaoDe, idValido } from '../../../lib/comprovantes';

export const config = {
  api: {
    responseLimit: '8mb',
  },
};

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id, download } = req.query;
  if (!idValido(id)) return res.status(404).json({ message: 'Comprovante não encontrado' });

  try {
    await dbConnect();
    const doc = await Comprovante.findById(id).select('+dados');

    // Distribuidor só vê os seus (404 em vez de 403 para não revelar que existe)
    if (!doc || (req.user.tipo !== 'admin' && doc.userId !== req.user.usuario)) {
      return res.status(404).json({ message: 'Comprovante não encontrado' });
    }

    const nome = `comprovante-${String(doc._id).slice(-8)}.${extensaoDe(doc.mimetype)}`;
    const buffer = Buffer.from(doc.dados);

    res.setHeader('Content-Type', doc.mimetype);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader(
      'Content-Disposition',
      `${download === '1' ? 'attachment' : 'inline'}; filename="${nome}"`,
    );
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(buffer);
  } catch (error) {
    console.error('❌ Erro ao ler comprovante:', error);
    return res.status(500).json({ message: 'Erro ao abrir o comprovante' });
  }
}

export default requireAuth(handler);
