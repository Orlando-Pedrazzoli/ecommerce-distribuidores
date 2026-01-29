// SCRIPTS/MIGRACAO.JS - ATUALIZAR DADOS EXISTENTES
// ===================================
// Execute com: node scripts/migracao.js
// Atualiza produtos e pedidos para o novo formato

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// ══════════════════════════════════════════════════════════════
// SCHEMAS PARA MIGRAÇÃO
// ══════════════════════════════════════════════════════════════

const ProdutoSchema = new mongoose.Schema(
  {
    fornecedorId: mongoose.Schema.Types.ObjectId,
    codigo: String,
    nome: String,
    descricao: String,
    categoria: String,
    preco: Number,
    precoSemNF: Number, // Campo antigo que será removido
    precoEtiqueta: { type: Number, default: 0 },
    precoEmbalagem: { type: Number, default: 0 },
    imagem: String,
    ativo: Boolean,
  },
  { timestamps: true }
);

const PedidoSchema = new mongoose.Schema(
  {
    userId: String,
    fornecedorId: mongoose.Schema.Types.ObjectId,
    itens: Array,
    subtotal: Number,
    totalEtiquetas: { type: Number, default: 0 },
    totalEmbalagens: { type: Number, default: 0 },
    royalties: Number,
    totalFornecedor: Number,
    total: Number,
    formaPagamento: String,
    endereco: Object,
    status: String,
    controleFinanceiro: {
      royalties: { status: String, dataPagamento: Date, observacao: String },
      etiquetas: { status: String, dataPagamento: Date, observacao: String },
      embalagens: { status: String, dataPagamento: Date, observacao: String },
    },
  },
  { timestamps: true }
);

const Produto = mongoose.model('Produto', ProdutoSchema);
const Pedido = mongoose.model('Pedido', PedidoSchema);

// ══════════════════════════════════════════════════════════════
// FUNÇÕES DE MIGRAÇÃO
// ══════════════════════════════════════════════════════════════

async function migrarProdutos() {
  console.log('\n📦 MIGRANDO PRODUTOS...');

  const produtos = await Produto.find({});
  console.log(`   Encontrados: ${produtos.length} produtos`);

  let atualizados = 0;
  let jaAtualizados = 0;

  for (const produto of produtos) {
    const updates = {};

    // Se não tem precoEtiqueta, adicionar com 0
    if (produto.precoEtiqueta === undefined || produto.precoEtiqueta === null) {
      updates.precoEtiqueta = 0;
    }

    // Se não tem precoEmbalagem, adicionar com 0
    if (produto.precoEmbalagem === undefined || produto.precoEmbalagem === null) {
      updates.precoEmbalagem = 0;
    }

    // Se tem precoSemNF, remover
    if (produto.precoSemNF !== undefined) {
      updates.$unset = { precoSemNF: 1 };
    }

    if (Object.keys(updates).length > 0 || updates.$unset) {
      await Produto.updateOne({ _id: produto._id }, updates);
      atualizados++;
      console.log(`   ✅ ${produto.nome} - atualizado`);
    } else {
      jaAtualizados++;
    }
  }

  console.log(`   ✅ ${atualizados} produtos atualizados`);
  console.log(`   ⏭️ ${jaAtualizados} já estavam no formato correto`);
}

async function migrarPedidos() {
  console.log('\n📋 MIGRANDO PEDIDOS...');

  const pedidos = await Pedido.find({});
  console.log(`   Encontrados: ${pedidos.length} pedidos`);

  let atualizados = 0;
  let jaAtualizados = 0;

  for (const pedido of pedidos) {
    const updates = {};
    let precisaAtualizar = false;

    // Se não tem totalEtiquetas, adicionar
    if (pedido.totalEtiquetas === undefined || pedido.totalEtiquetas === null) {
      updates.totalEtiquetas = 0;
      precisaAtualizar = true;
    }

    // Se não tem totalEmbalagens, adicionar
    if (pedido.totalEmbalagens === undefined || pedido.totalEmbalagens === null) {
      updates.totalEmbalagens = 0;
      precisaAtualizar = true;
    }

    // Se não tem totalFornecedor, calcular
    if (pedido.totalFornecedor === undefined || pedido.totalFornecedor === null) {
      updates.totalFornecedor = pedido.subtotal || 0;
      precisaAtualizar = true;
    }

    // Se não tem controleFinanceiro, adicionar
    if (!pedido.controleFinanceiro) {
      updates.controleFinanceiro = {
        royalties: { status: 'pendente' },
        etiquetas: { status: 'pendente' },
        embalagens: { status: 'pendente' },
      };
      precisaAtualizar = true;
    }

    // Atualizar itens para incluir precoEtiqueta e precoEmbalagem
    const itensAtualizados = pedido.itens.map(item => ({
      ...item,
      precoEtiqueta: item.precoEtiqueta || 0,
      precoEmbalagem: item.precoEmbalagem || 0,
    }));

    const itensForamAtualizados = JSON.stringify(itensAtualizados) !== JSON.stringify(pedido.itens);
    if (itensForamAtualizados) {
      updates.itens = itensAtualizados;
      precisaAtualizar = true;
    }

    if (precisaAtualizar) {
      await Pedido.updateOne({ _id: pedido._id }, { $set: updates });
      atualizados++;
      console.log(`   ✅ Pedido #${pedido._id.toString().slice(-8).toUpperCase()} - atualizado`);
    } else {
      jaAtualizados++;
    }
  }

  console.log(`   ✅ ${atualizados} pedidos atualizados`);
  console.log(`   ⏭️ ${jaAtualizados} já estavam no formato correto`);
}

async function verificarMigracao() {
  console.log('\n🔍 VERIFICANDO MIGRAÇÃO...');

  // Verificar produtos
  const produtosSemEtiqueta = await Produto.countDocuments({
    precoEtiqueta: { $exists: false },
  });
  const produtosSemEmbalagem = await Produto.countDocuments({
    precoEmbalagem: { $exists: false },
  });
  const produtosComPrecoSemNF = await Produto.countDocuments({
    precoSemNF: { $exists: true },
  });

  console.log(`   Produtos sem precoEtiqueta: ${produtosSemEtiqueta}`);
  console.log(`   Produtos sem precoEmbalagem: ${produtosSemEmbalagem}`);
  console.log(`   Produtos com precoSemNF (antigo): ${produtosComPrecoSemNF}`);

  // Verificar pedidos
  const pedidosSemControle = await Pedido.countDocuments({
    controleFinanceiro: { $exists: false },
  });
  const pedidosSemTotalEtiquetas = await Pedido.countDocuments({
    totalEtiquetas: { $exists: false },
  });

  console.log(`   Pedidos sem controleFinanceiro: ${pedidosSemControle}`);
  console.log(`   Pedidos sem totalEtiquetas: ${pedidosSemTotalEtiquetas}`);

  const sucesso =
    produtosSemEtiqueta === 0 &&
    produtosSemEmbalagem === 0 &&
    produtosComPrecoSemNF === 0 &&
    pedidosSemControle === 0 &&
    pedidosSemTotalEtiquetas === 0;

  if (sucesso) {
    console.log('\n✅ MIGRAÇÃO COMPLETA COM SUCESSO!');
  } else {
    console.log('\n⚠️ AINDA HÁ ITENS PARA MIGRAR');
  }

  return sucesso;
}

// ══════════════════════════════════════════════════════════════
// EXECUÇÃO
// ══════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('   SCRIPT DE MIGRAÇÃO - Sistema B2B');
  console.log('═══════════════════════════════════════════════════');

  try {
    // Conectar ao MongoDB
    console.log('\n🔌 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('   ✅ Conectado!');

    // Executar migrações
    await migrarProdutos();
    await migrarPedidos();

    // Verificar
    await verificarMigracao();

    console.log('\n═══════════════════════════════════════════════════');
    console.log('   MIGRAÇÃO FINALIZADA');
    console.log('═══════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('\n❌ ERRO NA MIGRAÇÃO:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();