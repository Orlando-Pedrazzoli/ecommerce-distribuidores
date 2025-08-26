// pages/api/seed/index.js - APENAS ADICIONAR NOVAS CATEGORIAS (PRESERVAR DADOS EXISTENTES)
// ===================================

import dbConnect from '../../../lib/mongodb';
import Fornecedor from '../../../models/Fornecedor';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    console.log('🔍 Verificando fornecedores existentes...');

    // 🎯 CATEGORIAS DEFINIDAS PELO USUÁRIO - ALTERE AQUI AS CATEGORIAS QUE VOCÊ QUER ADICIONAR
    const novasCategoriasPorFornecedor = {
      A: [
        // Categorias existentes do Vitor - Pandawa (DECKS)
        'Deck Noronha',
        'Deck Saquarema',
        'Deck J-bay',
        'Deck Fiji',
        'Deck Hawaii',
        'Deck Peniche',
      ],
      B: [
        // Categorias existentes do Mauricio - Maos Acessórios (CAPAS E ACESSÓRIOS)
        'Capa Toalha',
        'Capa Simples',
        'Capa Premium',
        'Capa Sarcófago',
        'Capa Sarcófago/Rodas',
        'Capa Sarcófago Simples',
        'Leash Nó',
        'Acessórios',
      ],
      C: [
        // Categorias existentes do Rodrigo - Godas (LEASHES)
        'Leash Superior 5ft x 5,5mm',
        'Leash Superior 6ft x 6,3mm',
        'Leash Superior 6ft x 7mm',
        'Leash Superior 7ft x 7mm',
        'Leash Superior 8ft x 7,5mm',
      ],
    };

    let fornecedoresAtualizados = 0;
    let novasCategoriasCriadas = 0;

    // Atualizar categorias dos fornecedores existentes
    for (const [codigo, novasCategorias] of Object.entries(
      novasCategoriasPorFornecedor
    )) {
      const fornecedor = await Fornecedor.findOne({ codigo: codigo });

      if (fornecedor) {
        // Verificar se há categorias novas
        const categoriasExistentes = fornecedor.categorias || [];
        const categoriasParaAdicionar = novasCategorias.filter(
          cat => !categoriasExistentes.includes(cat)
        );

        if (categoriasParaAdicionar.length > 0) {
          console.log(
            `🔄 Atualizando fornecedor ${codigo}: ${fornecedor.nome}`
          );
          console.log(
            `   📝 Adicionando ${categoriasParaAdicionar.length} novas categorias:`,
            categoriasParaAdicionar
          );

          // Atualizar com todas as categorias (existentes + novas)
          await Fornecedor.findByIdAndUpdate(fornecedor._id, {
            categorias: novasCategorias,
          });

          fornecedoresAtualizados++;
          novasCategoriasCriadas += categoriasParaAdicionar.length;
        } else {
          console.log(`✅ Fornecedor ${codigo} já possui todas as categorias`);
        }
      } else {
        console.log(
          `⚠️ Fornecedor com código ${codigo} não encontrado no banco`
        );
      }
    }

    // Buscar dados atualizados para retorno
    const fornecedores = await Fornecedor.find({});
    const totalCategorias = fornecedores.reduce(
      (total, f) => total + (f.categorias?.length || 0),
      0
    );

    console.log('✅ Categorias atualizadas com sucesso!');

    return res.status(200).json({
      success: true,
      message: `Categorias atualizadas com sucesso! ${novasCategoriasCriadas} novas categorias adicionadas.`,
      resumo: {
        fornecedoresAtualizados,
        novasCategoriasCriadas,
        totalCategorias,
      },
      detalhes: {
        fornecedores: fornecedores.map(f => ({
          codigo: f.codigo,
          nome: f.nome,
          totalCategorias: f.categorias?.length || 0,
          categorias: f.categorias || [],
        })),
      },
      observacao:
        '🔒 Dados existentes (produtos e usuários) foram preservados. Apenas categorias foram atualizadas.',
    });
  } catch (error) {
    console.error('💥 Erro ao atualizar categorias:', error);
    return res.status(500).json({
      message: 'Erro ao atualizar categorias',
      error: error.message,
    });
  }
}
