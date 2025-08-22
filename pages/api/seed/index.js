// CORREÇÃO: pages/api/seed/index.js - USUÁRIOS CORRETOS
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
    // Criar usuários distribuidores de exemplo - SENHAS CORRETAS
    const usuarios = await User.insertMany([
      {
        nome: 'João Silva',
        email: 'joao@distribuidora.com',
        password: '123456', // Será hasheado automaticamente
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
      // ADICIONAR USUÁRIO ADMIN NO BANCO TAMBÉM
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

    console.log('📦 Criando produtos...');
    // [resto do código dos produtos permanece igual...]

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
        codigo: 'DECK-P-003',
        nome: 'Deck J-bay Performance',
        descricao: 'Deck de alta performance para ondas longas como J-bay.',
        categoria: 'Deck J-bay',
        preco: 199.9,
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
        codigo: 'CAPA-M-003',
        nome: 'Capa Premium Refletiva',
        descricao: 'Capa premium com material refletivo e proteção UV.',
        categoria: 'Capa Premium',
        preco: 139.9,
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
      message: 'Sistema inicializado com usuários corretos!',
      dados: {
        fornecedores: fornecedores.length,
        usuarios: usuarios.length,
        produtos: produtos.length,
      },
      credenciais: {
        admin: {
          tipo: 'Admin (via .env)',
          username: process.env.ADMIN_USERNAME || 'distribuidor',
          password: process.env.ADMIN_PASSWORD || 'senha123',
        },
        adminBanco: {
          tipo: 'Admin (no banco)',
          email: 'admin@sistema.com',
          password: 'senha123',
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
