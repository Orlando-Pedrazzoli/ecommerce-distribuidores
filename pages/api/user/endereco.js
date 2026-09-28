// pages/api/user/endereco.js - SALVAR ENDEREÇO DO DISTRIBUIDOR
// ===================================
// O usuário já existe sempre no Mongo (fonte de verdade das contas),
// por isso só atualiza o endereço do documento da sessão.

import dbConnect from '../../../lib/mongodb';
import { requireDistribuidor } from '../../../lib/auth';

async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const { endereco } = req.body || {};
    if (!endereco) {
      return res.status(400).json({ message: 'Endereço é obrigatório' });
    }

    const camposObrigatorios = ['rua', 'numero', 'bairro', 'cidade', 'cep', 'estado'];
    const camposFaltando = camposObrigatorios.filter(
      campo => !endereco[campo] || !String(endereco[campo]).trim()
    );
    if (camposFaltando.length > 0) {
      return res.status(400).json({
        message: 'Campos obrigatórios faltando',
        campos: camposFaltando,
      });
    }

    const user = req.userDoc; // documento carregado por requireDistribuidor
    user.endereco = {
      rua: String(endereco.rua).trim(),
      numero: String(endereco.numero).trim(),
      complemento: String(endereco.complemento || '').trim(),
      bairro: String(endereco.bairro).trim(),
      cidade: String(endereco.cidade).trim(),
      cep: String(endereco.cep).trim(),
      estado: String(endereco.estado).trim(),
    };
    await user.save();

    console.log(`📍 Endereço salvo para ${user.usuario}`);
    return res.status(200).json({
      success: true,
      message: 'Endereço salvo com sucesso',
      endereco: user.endereco,
    });
  } catch (error) {
    console.error('❌ Erro ao salvar endereço:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
    });
  }
}

export default requireDistribuidor(handler);
