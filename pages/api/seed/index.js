// pages/api/seed/index.js - ATUALIZADO COM PREÇOS SEM NF
// ===================================

import dbConnect from '../../../lib/mongodb';
import Fornecedor from '../../../models/Fornecedor';
import User from '../../../models/User';
import Produto from '../../../models/Produto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await dbConnect();

    console.log('🧹 Limpando dados existentes...');
    // Limpar dados existentes
    await Fornecedor.deleteMany({});
    await User.deleteMany({});
    await Produto.deleteMany({});

    console.log('👥 Criando fornecedores...');
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
        email: 'mauricio.maos@uol.com.br',
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
        email: 'godassurfproducts@hotmail.com',
        categorias: [
          'Leash Superior 5ft x 5,5mm',
          'Leash Superior 6ft x 6,3mm',
          'Leash Superior 6ft x 7mm',
          'Leash Superior 7ft x 7mm',
          'Leash Superior 8ft x 7,5mm',
        ],
      },
    ]);

    console.log('🙋‍♂️ Criando usuários distribuidores...');
    // Criar usuários distribuidores de exemplo
    const usuarios = await User.insertMany([
      {
        nome: 'João Silva',
        email: 'joao@distribuidora.com',
        password: '123456',
        telefone: '(11) 99999-1111',
        endereco: {
          rua: 'Rua das Flores',
          numero: '123',
          bairro: 'Centro',
          cidade: 'São Paulo',
          cep: '01000-000',
          estado: 'SP',
        },
        tipo: 'distribuidor',
      },
      {
        nome: 'Maria Santos',
        email: 'maria@distribuidora.com',
        password: '123456',
        telefone: '(11) 99999-2222',
        endereco: {
          rua: 'Av. Paulista',
          numero: '456',
          bairro: 'Bela Vista',
          cidade: 'São Paulo',
          cep: '01310-000',
          estado: 'SP',
        },
        tipo: 'distribuidor',
      },
      {
        nome: 'Pedro Costa',
        email: 'pedro@distribuidora.com',
        password: '123456',
        telefone: '(21) 99999-3333',
        endereco: {
          rua: 'Rua da Praia',
          numero: '789',
          bairro: 'Copacabana',
          cidade: 'Rio de Janeiro',
          cep: '22000-000',
          estado: 'RJ',
        },
        tipo: 'distribuidor',
      },
      {
        nome: 'Administrador do Sistema',
        email: 'contact.elitesurfing@gmail.com',
        password: 'senha123',
        telefone: '(11) 99999-0000',
        endereco: {
          rua: 'Rua Admin',
          numero: '1',
          bairro: 'Centro',
          cidade: 'São Paulo',
          cep: '01000-000',
          estado: 'SP',
        },
        tipo: 'admin',
      },
    ]);

    console.log('📦 Criando produtos com preços duplos...');

    // 🆕 PRODUTOS COM PREÇO COM E SEM NF
    // Produtos do Vitor - Pandawa (Decks)
    const produtosPandawa = [
      {
        fornecedorId: fornecedores[0]._id,
        codigo: 'DECK-P-001',
        nome: 'Deck Noronha Pro',
        descricao:
          'Deck premium inspirado nas ondas de Fernando de Noronha com grip superior.',
        categoria: 'Deck Noronha',
        preco: 189.9, // COM NF
        precoSemNF: 159.9, // SEM NF (16% desconto)
      },
      {
        fornecedorId: fornecedores[0]._id,
        codigo: 'DECK-P-002',
        nome: 'Deck Saquarema Classic',
        descricao: 'Deck clássico com design inspirado nas ondas de Saquarema.',
        categoria: 'Deck Saquarema',
        preco: 179.9,
        precoSemNF: 149.9,
      },
      {
        fornecedorId: fornecedores[0]._id,
        codigo: 'DECK-P-003',
        nome: 'Deck J-bay Performance',
        descricao: 'Deck de alta performance para ondas longas como J-bay.',
        categoria: 'Deck J-bay',
        preco: 199.9,
        precoSemNF: 169.9,
      },
      {
        fornecedorId: fornecedores[0]._id,
        codigo: 'DECK-P-004',
        nome: 'Deck Fiji Tropical',
        descricao: 'Deck tropical com design exótico inspirado em Fiji.',
        categoria: 'Deck Fiji',
        preco: 209.9,
        precoSemNF: 179.9,
      },
    ];

    // Produtos do Mauricio - Maos Acessórios (Capas e Acessórios)
    const produtosMaos = [
      {
        fornecedorId: fornecedores[1]._id,
        codigo: 'CAPA-M-001',
        nome: 'Capa Toalha Absorvente',
        descricao:
          'Capa que funciona como toalha, absorve água rapidamente e protege a prancha.',
        categoria: 'Capa Toalha',
        preco: 79.9,
        precoSemNF: 69.9,
      },
      {
        fornecedorId: fornecedores[1]._id,
        codigo: 'CAPA-M-002',
        nome: 'Capa Simples Básica',
        descricao: 'Capa simples e funcional para proteção básica da prancha.',
        categoria: 'Capa Simples',
        preco: 49.9,
        precoSemNF: 42.9,
      },
      {
        fornecedorId: fornecedores[1]._id,
        codigo: 'CAPA-M-003',
        nome: 'Capa Premium Refletiva',
        descricao:
          'Capa premium com material refletivo e proteção UV avançada.',
        categoria: 'Capa Premium',
        preco: 139.9,
        precoSemNF: 119.9,
      },
      {
        fornecedorId: fornecedores[1]._id,
        codigo: 'CAPA-M-004',
        nome: 'Capa Sarcófago Completa',
        descricao: 'Capa sarcófago com proteção total e acolchoamento interno.',
        categoria: 'Capa Sarcófago',
        preco: 199.9,
        precoSemNF: 169.9,
      },
    ];

    // Produtos do Rodrigo - Godas (Leashes)
    const produtosGodas = [
      {
        fornecedorId: fornecedores[2]._id,
        codigo: 'LEASH-G-001',
        nome: 'Leash Superior 5ft x 5,5mm',
        descricao:
          'Leash superior de 5 pés por 5,5mm, ideal para ondas pequenas e médias.',
        categoria: 'Leash Superior 5ft x 5,5mm',
        preco: 79.9,
        precoSemNF: 69.9,
      },
      {
        fornecedorId: fornecedores[2]._id,
        codigo: 'LEASH-G-002',
        nome: 'Leash Superior 6ft x 6,3mm',
        descricao:
          'Leash superior de 6 pés por 6,3mm, versátil para várias condições de surf.',
        categoria: 'Leash Superior 6ft x 6,3mm',
        preco: 89.9,
        precoSemNF: 79.9,
      },
      {
        fornecedorId: fornecedores[2]._id,
        codigo: 'LEASH-G-003',
        nome: 'Leash Superior 6ft x 7mm',
        descricao: 'Leash reforçado de 6 pés por 7mm para ondas mais fortes.',
        categoria: 'Leash Superior 6ft x 7mm',
        preco: 99.9,
        precoSemNF: 84.9,
      },
      {
        fornecedorId: fornecedores[2]._id,
        codigo: 'LEASH-G-004',
        nome: 'Leash Superior 7ft x 7mm',
        descricao: 'Leash longo de 7 pés por 7mm, ideal para pranchas longas.',
        categoria: 'Leash Superior 7ft x 7mm',
        preco: 109.9,
        precoSemNF: 94.9,
      },
      {
        fornecedorId: fornecedores[2]._id,
        codigo: 'LEASH-G-005',
        nome: 'Leash Superior 8ft x 7,5mm',
        descricao: 'Leash extra longo de 8 pés por 7,5mm para ondas grandes.',
        categoria: 'Leash Superior 8ft x 7,5mm',
        preco: 129.9,
        precoSemNF: 109.9,
      },
    ];

    // Criar todos os produtos
    const todosProdutos = [
      ...produtosPandawa,
      ...produtosMaos,
      ...produtosGodas,
    ];
    const produtos = await Produto.insertMany(todosProdutos);

    console.log('✅ Sistema inicializado com sucesso!');

    return res.status(200).json({
      success: true,
      message: 'Sistema inicializado com preços duplos (COM/SEM NF)!',
      dados: {
        fornecedores: fornecedores.length,
        usuarios: usuarios.length,
        produtos: produtos.length,
      },
      // 🆕 MOSTRAR EXEMPLO DE PREÇOS DUPLOS
      exemploPrecos: {
        produto: produtos[0].nome,
        precoComNF: `R$ ${produtos[0].preco.toFixed(2)}`,
        precoSemNF: `R$ ${produtos[0].precoSemNF.toFixed(2)}`,
        economia: `R$ ${(produtos[0].preco - produtos[0].precoSemNF).toFixed(
          2
        )}`,
        percentualDesconto: `${(
          ((produtos[0].preco - produtos[0].precoSemNF) / produtos[0].preco) *
          100
        ).toFixed(1)}%`,
      },
      credenciais: {
        admin: {
          tipo: 'Admin (via .env)',
          username: process.env.ADMIN_USERNAME || 'admin',
          password: process.env.ADMIN_PASSWORD || 'senha123',
        },
        distribuidores: [
          { email: 'elitesurfingrj@yahoo.com.br', senha: '0123456789' },
          { email: 'amaurysoulsurf@bol.com.br', senha: '0123456789' },
        ],
      },
    });
  } catch (error) {
    console.error('💥 Erro ao inicializar sistema:', error);
    return res.status(500).json({
      message: 'Erro ao inicializar sistema',
      error: error.message,
    });
  }
}
