// PAGES/API/ADMIN/MIGRAR-IMAGENS.JS
// ===================================
// Rota para executar a migração de imagens
// Acesse: /api/admin/migrar-imagens
// IMPORTANTE: Remova este arquivo após a migração!

import dbConnect from '../../../lib/mongodb';
import Produto from '../../../models/Produto';

export default async function handler(req, res) {
  // Apenas POST para evitar execução acidental
  if (req.method !== 'POST') {
    return res.status(200).json({
      message: 'API de migração de imagens',
      instrucoes: 'Envie um POST para executar a migração',
      aviso: '⚠️ Remova este arquivo após a migração!'
    });
  }

  console.log('🚀 Iniciando migração de imagens...');

  const resultado = {
    migrados: 0,
    jaAtualizados: 0,
    semImagem: 0,
    erros: 0,
    detalhes: []
  };

  try {
    await dbConnect();

    const produtos = await Produto.find({});
    resultado.total = produtos.length;

    for (const produto of produtos) {
      try {
        // Já tem array de imagens
        if (produto.imagens && produto.imagens.length > 0) {
          resultado.jaAtualizados++;
          resultado.detalhes.push({
            codigo: produto.codigo,
            status: 'ja_atualizado',
            imagens: produto.imagens.length
          });
          continue;
        }

        // Tem imagem única para migrar
        if (produto.imagem) {
          produto.imagens = [produto.imagem];
          await produto.save();
          resultado.migrados++;
          resultado.detalhes.push({
            codigo: produto.codigo,
            status: 'migrado',
            imagem: produto.imagem
          });
        } else {
          // Sem imagem
          produto.imagens = [];
          await produto.save();
          resultado.semImagem++;
          resultado.detalhes.push({
            codigo: produto.codigo,
            status: 'sem_imagem'
          });
        }
      } catch (error) {
        resultado.erros++;
        resultado.detalhes.push({
          codigo: produto.codigo,
          status: 'erro',
          erro: error.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: '✅ Migração concluída!',
      aviso: '⚠️ Remova este arquivo (/pages/api/admin/migrar-imagens.js) após verificar!',
      ...resultado
    });

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro na migração',
      error: error.message
    });
  }
}