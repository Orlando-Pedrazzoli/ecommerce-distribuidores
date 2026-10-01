// pages/api/admin/configuracoes.js - CONFIGURAÇÕES GERAIS (ADMIN)
// ===================================
// GET -> configuração atual
// PUT { pixRoyalties: { tipo, chave, titular, cidade } }
//     chave Pix onde os distribuidores pagam os royalties. Chave vazia desliga
//     o pagamento por Pix em /pagamentos.

import dbConnect from '../../../lib/mongodb';
import Configuracao, { obterConfiguracao } from '../../../models/Configuracao';
import { requireAdmin } from '../../../lib/auth';
import { validarDadosPix, pixConfigurado } from '../../../lib/pix';

const PIX_VAZIO = { tipo: '', chave: '', titular: '', cidade: '' };

async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    const config = await obterConfiguracao();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      pixRoyalties: { ...PIX_VAZIO, ...(config.pixRoyalties || {}) },
      pixConfigurado: pixConfigurado(config.pixRoyalties),
    });
  }

  if (req.method === 'PUT') {
    try {
      const validacao = validarDadosPix(req.body?.pixRoyalties || {});
      if (!validacao.ok) return res.status(400).json({ message: validacao.erro });

      const pixRoyalties = validacao.dados || PIX_VAZIO;
      await Configuracao.findByIdAndUpdate(
        'geral',
        { $set: { pixRoyalties, atualizadoPor: req.user.usuario } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      console.log(`⚙️ Chave Pix de royalties atualizada por ${req.user.usuario}`);
      return res.status(200).json({
        success: true,
        message: validacao.dados
          ? 'Chave Pix de royalties salva'
          : 'Chave Pix removida. O pagamento por Pix ficou desligado.',
        pixRoyalties,
        pixConfigurado: pixConfigurado(pixRoyalties),
      });
    } catch (error) {
      console.error('❌ Erro ao salvar configuração:', error);
      return res.status(500).json({ message: 'Erro ao salvar a configuração' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default requireAdmin(handler);
