// PAGES/API/SEED/INDEX.JS - ATUALIZADO COM FORNECEDORES REAIS
// ===================================

import dbConnect from '../../../lib/mongodb';
import Fornecedor from '../../../models/Fornecedor';
import Distribuidor from '../../../models/Distribuidor';
import Produto from '../../../models/Produto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    // Limpar dados existentes
    await Fornecedor.deleteMany({});
    await Distribuidor.deleteMany({});
    await Produto.deleteMany({});

    // Criar fornecedores reais com suas categorias específicas
    const fornecedores = await Fornecedor.insertMany([
      {
        nome: 'Vitor - Pandawa',
        codigo: 'A',
        email: 'vitor@pandawa.com.br',
        categorias: [
          'Deck Noronha',
          'Deck Saquarema',
          'Deck J-bay',
          'Deck Fiji',
          'Deck Hawaii',
          'Deck Peniche',
        ],
      },
      {
        nome: 'Mauricio - Maos Acessórios',
        codigo: 'B',
        email: 'mauricio@maosacessorios.com.br',
        categorias: [
          'Capa Toalha',
          'Capa Simples',
          'Capa Premium',
          'Capa Sarcófago',
          'Acessórios',
        ],
      },
      {
        nome: 'Rodrigo - Godas',
        codigo: 'C',
        email: 'rodrigo@godas.com.br',
        categorias: [
          'Leash Superior 5ft x 5,5mm',
          'Leash Superior 6ft x 6,3mm',
          'Leash Superior 6ft x 7mm',
          'Leash Superior 7ft x 7mm',
          'Leash Superior 8ft x 7,5mm',
        ],
      },
    ]);

    // Criar distribuidor padrão
    const distribuidor = await Distribuidor.create({
      nome: 'Distribuidor Padrão',
      email: 'distribuidor@empresa.com',
      telefone: '(11) 99999-9999',
      endereco: {
        rua: 'Rua Exemplo',
        numero: '123',
        bairro: 'Centro',
        cidade: 'São Paulo',
        cep: '01000-000',
        estado: 'SP',
      },
    });

    // Produtos do Vitor - Pandawa (Decks)
    const produtosPandawa = [
      {
        fornecedorId: fornecedores[0]._id,
        codigo: 'DECK-P-001',
        nome: 'Deck Noronha Pro',
        descricao: 'Deck premium inspirado nas ondas de Fernando de Noronha.',
        categoria: 'Deck Noronha',
        preco: 189.9,
      },
      {
        fornecedorId: fornecedores[0]._id,
        codigo: 'DECK-P-002',
        nome: 'Deck Saquarema Classic',
        descricao: 'Deck clássico para as ondas pesadas de Saquarema.',
        categoria: 'Deck Saquarema',
        preco: 169.9,
      },
      {
        fornecedorId: fornecedores[0]._id,
        codigo: 'DECK-P-003',
        nome: 'Deck J-bay Performance',
        descricao: 'Deck de alta performance para ondas longas como J-bay.',
        categoria: 'Deck J-bay',
        preco: 199.9,
      },
      {
        fornecedorId: fornecedores[0]._id,
        codigo: 'DECK-P-004',
        nome: 'Deck Fiji Power',
        descricao: 'Deck resistente para as poderosas ondas de Fiji.',
        categoria: 'Deck Fiji',
        preco: 219.9,
      },
      {
        fornecedorId: fornecedores[0]._id,
        codigo: 'DECK-P-005',
        nome: 'Deck Hawaii Legend',
        descricao: 'Deck lendário inspirado nas ondas do Hawaii.',
        categoria: 'Deck Hawaii',
        preco: 249.9,
      },
      {
        fornecedorId: fornecedores[0]._id,
        codigo: 'DECK-P-006',
        nome: 'Deck Peniche Euro',
        descricao: 'Deck europeu para as ondas frias de Peniche.',
        categoria: 'Deck Peniche',
        preco: 179.9,
      },
    ];

    // Produtos do Mauricio - Maos Acessórios (Capas e Acessórios)
    const produtosMaos = [
      {
        fornecedorId: fornecedores[1]._id,
        codigo: 'CAPA-M-001',
        nome: 'Capa Toalha Absorvente',
        descricao: 'Capa que funciona como toalha, absorve água rapidamente.',
        categoria: 'Capa Toalha',
        preco: 79.9,
      },
      {
        fornecedorId: fornecedores[1]._id,
        codigo: 'CAPA-M-002',
        nome: 'Capa Simples Básica',
        descricao: 'Capa simples e econômica para proteção básica.',
        categoria: 'Capa Simples',
        preco: 49.9,
      },
      {
        fornecedorId: fornecedores[1]._id,
        codigo: 'CAPA-M-003',
        nome: 'Capa Premium Refletiva',
        descricao: 'Capa premium com material refletivo e proteção UV.',
        categoria: 'Capa Premium',
        preco: 139.9,
      },
      {
        fornecedorId: fornecedores[1]._id,
        codigo: 'CAPA-M-004',
        nome: 'Capa Sarcófago Proteção Total',
        descricao: 'Capa com proteção total, ideal para transporte.',
        categoria: 'Capa Sarcófago',
        preco: 199.9,
      },
      {
        fornecedorId: fornecedores[1]._id,
        codigo: 'ACC-M-001',
        nome: 'Kit Reparo Completo',
        descricao: 'Kit completo com cola, lixa, patches e espátula.',
        categoria: 'Acessórios',
        preco: 59.9,
      },
      {
        fornecedorId: fornecedores[1]._id,
        codigo: 'ACC-M-002',
        nome: 'Suporte Rack Duplo',
        descricao: 'Suporte para 2 pranchas, ideal para carro.',
        categoria: 'Acessórios',
        preco: 89.9,
      },
    ];

    // Produtos do Rodrigo - Godas (Leashes)
    const produtosGodas = [
      {
        fornecedorId: fornecedores[2]._id,
        codigo: 'LEASH-G-001',
        nome: 'Leash Superior 5ft x 5,5mm',
        descricao:
          'Leash superior de 5 pés por 5,5mm, ideal para ondas pequenas.',
        categoria: 'Leash Superior 5ft x 5,5mm',
        preco: 79.9,
      },
      {
        fornecedorId: fornecedores[2]._id,
        codigo: 'LEASH-G-002',
        nome: 'Leash Superior 6ft x 6,3mm',
        descricao:
          'Leash superior de 6 pés por 6,3mm, versátil para várias condições.',
        categoria: 'Leash Superior 6ft x 6,3mm',
        preco: 89.9,
      },
      {
        fornecedorId: fornecedores[2]._id,
        codigo: 'LEASH-G-003',
        nome: 'Leash Superior 6ft x 7mm',
        descricao: 'Leash superior de 6 pés por 7mm, mais resistente.',
        categoria: 'Leash Superior 6ft x 7mm',
        preco: 99.9,
      },
      {
        fornecedorId: fornecedores[2]._id,
        codigo: 'LEASH-G-004',
        nome: 'Leash Superior 7ft x 7mm',
        descricao: 'Leash superior de 7 pés por 7mm, para ondas médias.',
        categoria: 'Leash Superior 7ft x 7mm',
        preco: 109.9,
      },
      {
        fornecedorId: fornecedores[2]._id,
        codigo: 'LEASH-G-005',
        nome: 'Leash Superior 8ft x 7,5mm',
        descricao: 'Leash superior de 8 pés por 7,5mm, para ondas grandes.',
        categoria: 'Leash Superior 8ft x 7,5mm',
        preco: 129.9,
      },
    ];

    // Criar todos os produtos
    const todosProdutos = [
      ...produtosPandawa,
      ...produtosMaos,
      ...produtosGodas,
    ];
    const produtos = await Produto.insertMany(todosProdutos);

    return res.status(200).json({
      success: true,
      message: 'Sistema inicializado com fornecedores reais!',
      dados: {
        fornecedores: fornecedores.length,
        distribuidores: 1,
        produtos: produtos.length,
        detalhes: {
          'Vitor - Pandawa': produtosPandawa.length,
          'Mauricio - Maos Acessórios': produtosMaos.length,
          'Rodrigo - Godas': produtosGodas.length,
        },
      },
    });
  } catch (error) {
    console.error('Erro ao inicializar sistema:', error);
    return res.status(500).json({
      message: 'Erro ao inicializar sistema',
      error: error.message,
    });
  }
}
