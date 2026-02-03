// pages/api/seed/index.js
// ===================================
// SEED - Criar/Atualizar fornecedores e categorias
// 🆕 COM SUPORTE A CATEGORIAS ISENTAS DE ROYALTIES

import dbConnect from '../../../lib/mongodb';
import Fornecedor from '../../../models/Fornecedor';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    console.log('🔍 Iniciando seed de fornecedores...');

    // ══════════════════════════════════════════════════════════════
    // 🎯 FORNECEDORES E CATEGORIAS - ADICIONE/EDITE AQUI
    // ══════════════════════════════════════════════════════════════
    const fornecedoresConfig = [
      {
        codigo: 'A',
        nome: 'Vitor - Pandawa',
        email: 'vitaobrasil@hotmail.com',
        especialidade: 'Especialista em Decks',
        descricao: 'Decks premium para todas as condições de surf',
        cor: '#22c55e',
        logo: '/vitor-logo.jpg',
        categorias: [
          'Deck Noronha',
          'Deck Saquarema',
          'Deck J-bay',
          'Deck Fiji Classic',
          'Deck Hawaii',
          'Deck Peniche',
        ],
        // 🆕 Categorias sem royalties (deixe vazio [] se todas pagam)
        categoriasIsentasRoyalty: [],
      },
      {
        codigo: 'B',
        nome: 'Mauricio - Maos Acessórios',
        email: 'mauricio.maos@uol.com.br',
        especialidade: 'Especialista em Capas e Acessórios',
        descricao: 'Capas e acessórios para proteção e transporte',
        cor: '#f59e0b',
        logo: '/maos-logo.jpg',
        categorias: [
          'Capa Toalha',
          'Capa Refletiva Combate',
          'Capa Refletiva Premium',
          'Sarcófago Premium',
          'Sarcófago Premium/Rodas',
          'Sarcófago Combate',
          'Sarcófago Combate/Rodas',
          'Leash Nó',
          'Acessórios',
        ],
        categoriasIsentasRoyalty: [],
      },
      {
        codigo: 'C',
        nome: 'Rodrigo - Godas',
        email: 'godassurfproducts@hotmail.com',
        especialidade: 'Especialista em Leashes',
        descricao: 'Leashes superiores para máxima segurança',
        cor: '#06b6d4',
        logo: '/godas-logo.jpg',
        categorias: [
          'Leash One Piece 5 x 5,5mm',
          'Leash One Piece 6 x 6,3mm',
          'Leash One Piece 6 x 7mm',
          'Leash One Piece 7 x 7mm',
          'Leash One Piece 8 x 7,5mm',
          'Deck Mentawai',
          'Deck Maldivas',
        ],
        categoriasIsentasRoyalty: [],
      },
      {
        codigo: 'D',
        nome: 'Wakum - WKM',
        email: 'wakum@wakum.com.br',
        especialidade: 'Especialista em Capas, Leashes e Decks',
        descricao: 'Qualidade e preço',
        cor: '#ef4444',
        logo: '/wakum-logo.jpg',
        categorias: [
          'Deck Stand Up',
          'Deck Combate',
          'Deck Longboard',
          'Deck Frontal',
          'Deck Tahiti',
          'Deck J-bay',
          'Deck Fiji Classic',
          'Deck Hawaii',
          'Leash Premium 9" CALF KNEE 9 x 7mm',
          'Leash Premium 9"TORNOZELO 9 x 7mm',
          'Leash Premium 10" LONGBOARD 10 x 7mm',
          'Leash Premium STAND UP 10 x 8mm',
          'Leash Premium STAND UP espiral 7mm',
          'Leash Premium Bodyboard espiral 6mm',
          'Capa Toalha',
          'Capa Refletiva Combate',
          'Capa Refletiva Premium',
          'Capa Refletiva Premium SUP',
          'Capa Térmica',
          'Sarcófago Premium',
          'Sarcófago Premium/Rodas',
        ],
        categoriasIsentasRoyalty: [],
      },
      // ══════════════════════════════════════════════════════════════
      // 🆕 EXEMPLO: FORNECEDOR E - PRODUTOS PRÓPRIOS (SEM ROYALTIES)
      // ══════════════════════════════════════════════════════════════
      // Descomente e edite para criar um fornecedor com categorias isentas:
      //
       {
         codigo: 'E',
         nome: 'Elite - Produtos Próprios',
         email: 'contact.elitesurfing@gmail.com',
         especialidade: 'Produtos próprios distribuidores',
         descricao: 'Produtos exclusivos sem royalties',
         cor: '#8b5cf6', // Roxo
         logo: '/elite-logo.jpg',
         categorias: [
           'Quilhas & Acessórios',
           'Skateboard Bags',
         ],
         // 🆕 TODAS as categorias deste fornecedor são isentas de royalties
         categoriasIsentasRoyalty: [
           'Quilhas & Acessórios',
           'Skateboard Bags',
         ],
       },
    ];

    let fornecedoresCriados = 0;
    let fornecedoresAtualizados = 0;

    // Processar cada fornecedor
    for (const config of fornecedoresConfig) {
      const fornecedorExistente = await Fornecedor.findOne({ codigo: config.codigo });

      if (fornecedorExistente) {
        // Atualizar fornecedor existente
        console.log(`🔄 Atualizando ${config.codigo} - ${config.nome}`);

        await Fornecedor.findByIdAndUpdate(fornecedorExistente._id, {
          nome: config.nome,
          email: config.email || fornecedorExistente.email,
          especialidade: config.especialidade,
          descricao: config.descricao,
          cor: config.cor,
          logo: config.logo,
          categorias: config.categorias,
          // 🆕 Atualizar categorias isentas
          categoriasIsentasRoyalty: config.categoriasIsentasRoyalty || [],
        });

        fornecedoresAtualizados++;
      } else {
        // Criar novo fornecedor
        console.log(`🆕 Criando fornecedor ${config.codigo} - ${config.nome}`);

        const novoFornecedor = new Fornecedor({
          codigo: config.codigo,
          nome: config.nome,
          email: config.email,
          especialidade: config.especialidade,
          descricao: config.descricao,
          cor: config.cor,
          logo: config.logo,
          categorias: config.categorias,
          // 🆕 Adicionar categorias isentas
          categoriasIsentasRoyalty: config.categoriasIsentasRoyalty || [],
          ativo: true,
        });

        await novoFornecedor.save();
        fornecedoresCriados++;

        console.log(`   ✅ Criado com ${config.categorias.length} categorias`);
        if (config.categoriasIsentasRoyalty?.length > 0) {
          console.log(`   💰 ${config.categoriasIsentasRoyalty.length} categorias isentas de royalties`);
        }
      }
    }

    // Buscar dados atualizados
    const fornecedores = await Fornecedor.find({}).sort({ codigo: 1 });

    console.log('✅ Seed concluído!');

    return res.status(200).json({
      success: true,
      message: `Seed concluído! ${fornecedoresCriados} criados, ${fornecedoresAtualizados} atualizados.`,
      resumo: {
        fornecedoresCriados,
        fornecedoresAtualizados,
        totalFornecedores: fornecedores.length,
      },
      fornecedores: fornecedores.map(f => ({
        codigo: f.codigo,
        nome: f.nome,
        especialidade: f.especialidade,
        cor: f.cor,
        totalCategorias: f.categorias?.length || 0,
        categorias: f.categorias,
        // 🆕 Mostrar categorias isentas no response
        categoriasIsentasRoyalty: f.categoriasIsentasRoyalty || [],
        totalIsentas: f.categoriasIsentasRoyalty?.length || 0,
      })),
    });

  } catch (error) {
    console.error('💥 Erro no seed:', error);
    return res.status(500).json({
      message: 'Erro no seed',
      error: error.message,
    });
  }
}