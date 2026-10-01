// pages/api/user/pix-royalties.js - GERAR O PIX PARA PAGAR ROYALTIES
// ===================================
// POST { valor } -> Pix Copia e Cola + QR Code para a chave Pix de royalties
// (configurada pelo admin em /admin/financeiro). O valor pode ser o total em
// aberto ou qualquer valor menor. Não grava nada: o pagamento só é registrado
// em POST /api/user/pagamentos, com o comprovante.

import dbConnect from '../../../lib/mongodb';
import { requireDistribuidor } from '../../../lib/auth';
import { obterConfiguracao } from '../../../models/Configuracao';
import { montarCobrancaPix, pixConfigurado } from '../../../lib/pix';
import { saldoRoyalties } from '../../../lib/pagamentos';
import { arred } from '../../../lib/financeiro';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const config = await obterConfiguracao();
    if (!pixConfigurado(config.pixRoyalties)) {
      return res.status(409).json({
        message:
          'O pagamento de royalties por Pix ainda não está disponível. Fale com o administrador.',
      });
    }

    const saldo = await saldoRoyalties(req.user.usuario);
    if (saldo <= 0) {
      return res.status(409).json({ message: 'Não há royalties em aberto para pagar' });
    }

    const valor = arred(req.body?.valor);
    if (!(valor >= 0.01)) {
      return res.status(400).json({ message: 'Informe o valor que deseja pagar' });
    }
    if (valor > saldo) {
      return res.status(400).json({
        message: 'O valor é maior do que o total de royalties em aberto',
        saldo,
      });
    }

    const pix = await montarCobrancaPix({
      pix: config.pixRoyalties,
      valor,
      prefixo: 'RY',
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ success: true, pix, saldo });
  } catch (error) {
    console.error('❌ Erro ao gerar Pix de royalties:', error);
    return res.status(500).json({ message: 'Erro ao gerar o Pix. Tente novamente.' });
  }
}

export default requireDistribuidor(handler);
