// 4. TESTE DE EMAIL: pages/api/test-email.js
// ===================================

import { testarEmail } from '../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('🧪 Testando configuração de email...');

    const resultado = await testarEmail();

    if (resultado.sucesso) {
      return res.status(200).json({
        success: true,
        message: 'Email de teste enviado com sucesso!',
        messageId: resultado.messageId,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar email de teste',
        erro: resultado.erro,
      });
    }
  } catch (error) {
    console.error('💥 Erro no teste de email:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno',
      erro: error.message,
    });
  }
}
