// SCRIPTS/MIGRACAO-IMAGENS.JS
// ===================================
// Script para migrar produtos do formato antigo (imagem única)
// para o novo formato (array de imagens)
//
// COMO USAR:
// 1. Adicione este script no seu projeto
// 2. Execute: node scripts/migracao-imagens.js
// OU
// 3. Crie uma API route temporária para executar

import dbConnect from '../lib/mongodb';
import Produto from '../models/Produto';

async function migrarImagens() {
  console.log('🚀 Iniciando migração de imagens...\n');

  try {
    await dbConnect();
    console.log('✅ Conectado ao MongoDB\n');

    // Buscar todos os produtos
    const produtos = await Produto.find({});
    console.log(`📦 Total de produtos encontrados: ${produtos.length}\n`);

    let migrados = 0;
    let jaAtualizados = 0;
    let semImagem = 0;
    let erros = 0;

    for (const produto of produtos) {
      try {
        // Verificar se já tem o array de imagens preenchido
        if (produto.imagens && produto.imagens.length > 0) {
          jaAtualizados++;
          console.log(`⏭️  [${produto.codigo}] Já possui array de imagens (${produto.imagens.length} imagens)`);
          continue;
        }

        // Verificar se tem imagem única para migrar
        if (produto.imagem) {
          // Criar array com a imagem existente
          produto.imagens = [produto.imagem];
          await produto.save();
          migrados++;
          console.log(`✅ [${produto.codigo}] Migrado: ${produto.nome}`);
        } else {
          // Produto sem nenhuma imagem
          produto.imagens = [];
          await produto.save();
          semImagem++;
          console.log(`⚠️  [${produto.codigo}] Sem imagem: ${produto.nome}`);
        }
      } catch (error) {
        erros++;
        console.error(`❌ [${produto.codigo}] Erro: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMO DA MIGRAÇÃO:');
    console.log('='.repeat(50));
    console.log(`✅ Migrados com sucesso: ${migrados}`);
    console.log(`⏭️  Já atualizados: ${jaAtualizados}`);
    console.log(`⚠️  Sem imagem: ${semImagem}`);
    console.log(`❌ Erros: ${erros}`);
    console.log(`📦 Total processado: ${produtos.length}`);
    console.log('='.repeat(50));

    console.log('\n✅ Migração concluída!');

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Executar se chamado diretamente
if (require.main === module) {
  migrarImagens();
}

export default migrarImagens;