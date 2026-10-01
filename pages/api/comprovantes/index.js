// pages/api/comprovantes/index.js - UPLOAD DO COMPROVANTE DE PIX
// ===================================
// POST multipart/form-data: arquivo (imagem ou PDF) + finalidade (sinal|royalties)
// Devolve o id do comprovante, que depois é enviado ao criar o pedido
// (/api/pedidos/criar) ou ao registrar o pagamento (/api/user/pagamentos).

import multer from 'multer';
import dbConnect from '../../../lib/mongodb';
import Comprovante from '../../../models/Comprovante';
import { requireDistribuidor } from '../../../lib/auth';
import { rateLimit, responder429 } from '../../../lib/rateLimit';
import { TAMANHO_MAXIMO, detetarTipo, hashDe } from '../../../lib/comprovantes';

export const config = {
  api: {
    bodyParser: false, // o multer lê o corpo
  },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANHO_MAXIMO, files: 1 },
});

const receber = (req, res) =>
  new Promise((resolve, reject) => {
    upload.single('arquivo')(req, res, err => (err ? reject(err) : resolve()));
  });

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const limite = rateLimit(`comprovante:${req.user.usuario}`, 30, 10 * 60 * 1000);
  if (!limite.ok) return responder429(res, limite, 'Muitos envios seguidos. Aguarde um pouco.');

  try {
    await receber(req, res);
  } catch (error) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'Arquivo muito grande (máximo 4 MB)' });
    }
    console.error('❌ Erro no upload do comprovante:', error.message);
    return res.status(400).json({ message: 'Não foi possível ler o arquivo enviado' });
  }

  try {
    const finalidade = String(req.body?.finalidade || '');
    if (!['sinal', 'royalties'].includes(finalidade)) {
      return res.status(400).json({ message: 'Finalidade do comprovante inválida' });
    }
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ message: 'Selecione o comprovante do Pix' });
    }

    const mimetype = detetarTipo(req.file.buffer);
    if (!mimetype) {
      return res.status(415).json({
        message: 'Formato não aceite. Envie o comprovante como imagem (JPG/PNG) ou PDF.',
      });
    }

    await dbConnect();
    const sha256 = hashDe(req.file.buffer);

    // O mesmo arquivo já usado noutro pedido/pagamento não pode ser reutilizado
    const jaUsado = await Comprovante.findOne({ sha256, vinculado: true }).select('_id');
    if (jaUsado) {
      return res.status(409).json({
        message:
          'Este comprovante já foi usado noutro pagamento. Envie o comprovante desta transferência.',
      });
    }

    // Reenvio do mesmo arquivo antes de concluir: reaproveita o registo
    const solto = await Comprovante.findOne({
      sha256,
      userId: req.user.usuario,
      finalidade,
      vinculado: false,
    });

    const doc =
      solto ||
      (await Comprovante.create({
        userId: req.user.usuario,
        finalidade,
        mimetype,
        tamanho: req.file.buffer.length,
        nomeOriginal: String(req.file.originalname || '').slice(0, 120),
        sha256,
        dados: req.file.buffer,
      }));

    return res.status(201).json({
      success: true,
      comprovante: {
        id: doc._id,
        nome: doc.nomeOriginal || 'comprovante',
        mimetype: doc.mimetype,
        tamanho: doc.tamanho,
      },
    });
  } catch (error) {
    console.error('❌ Erro ao gravar comprovante:', error);
    return res.status(500).json({ message: 'Erro ao gravar o comprovante. Tente novamente.' });
  }
}

export default requireDistribuidor(handler);
