// SCRIPTS/MIGRAR-USUARIOS.JS - MIGRAR CREDENCIAIS DO .ENV PARA O MONGODB
// ===================================
// Execute com:
//   node scripts/migrar-usuarios.js                (migra)
//   node scripts/migrar-usuarios.js --dry-run      (só mostra o que faria)
//   node scripts/migrar-usuarios.js --force-password
//        (re-hasheia a senha do .env mesmo para quem já tem senha definida)
//
// Lê ADMIN_USERNAME / ADMIN_PASSWORD / ADMIN_EMAIL e DISTRIBUIDOR_1..20 de
// .env.local e cria/atualiza os documentos na coleção `users` com bcrypt.
// Depois de migrar, remova DISTRIBUIDOR_x e ADMIN_PASSWORD das variáveis
// de ambiente (local e Vercel).
//
// Formato de DISTRIBUIDOR_x:
//   usuario:senha:nome:email:telefone:rua:numero:complemento:bairro:cidade:cep:estado
//   (só os 3 primeiros são obrigatórios; email é necessário para OTP/reset)

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE_PASSWORD = process.argv.includes('--force-password');

// Schema mínimo (sem hooks) para o script não depender do ESM em models/
const UserSchema = new mongoose.Schema(
  {
    usuario: String,
    nome: String,
    email: String,
    password: String,
    senhaDefinida: Boolean,
    telefone: String,
    endereco: {
      rua: String,
      numero: String,
      complemento: String,
      bairro: String,
      cidade: String,
      cep: String,
      estado: String,
    },
    tipo: String,
    ativo: Boolean,
    passwordAlteradaEm: Date,
    tentativasLogin: Number,
    bloqueadoAte: Date,
    dispositivosConfiaveis: Array,
    tabelaPrecos: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, strict: false }
);
const User = mongoose.models.User || mongoose.model('User', UserSchema);

const t = v => (v === undefined || v === null ? '' : String(v).trim());

// ══════════════════════════════════════════════════════════════
// LER .ENV
// ══════════════════════════════════════════════════════════════
const lerContasDoEnv = () => {
  const contas = [];
  const avisos = [];

  // Admin
  if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
    contas.push({
      usuario: t(process.env.ADMIN_USERNAME),
      senha: process.env.ADMIN_PASSWORD,
      nome: 'Administrador',
      email: t(process.env.ADMIN_EMAIL).toLowerCase(),
      telefone: '',
      endereco: undefined,
      tipo: 'admin',
    });
    if (!process.env.ADMIN_EMAIL) {
      avisos.push('ADMIN_EMAIL não definido: o admin não conseguirá receber OTP nem recuperar a senha.');
    }
  } else {
    avisos.push('ADMIN_USERNAME/ADMIN_PASSWORD não definidos: nenhum admin será migrado.');
  }

  // Distribuidores
  for (let i = 1; i <= 20; i++) {
    const raw = process.env[`DISTRIBUIDOR_${i}`];
    if (!raw) continue;

    const p = raw.split(':').map(t);
    const [usuario, senha, nome, email, telefone, rua, numero, complemento, bairro, cidade, cep, estado] = p;

    if (!usuario || !senha) {
      avisos.push(`DISTRIBUIDOR_${i}: sem usuário ou senha — ignorado.`);
      continue;
    }
    if (!email) {
      avisos.push(`DISTRIBUIDOR_${i} (${usuario}): SEM EMAIL — será criado, mas não conseguirá fazer login (OTP) até o admin cadastrar um email.`);
    }

    contas.push({
      usuario,
      senha,
      nome: nome || usuario,
      email: (email || '').toLowerCase(),
      telefone: telefone || '',
      endereco: rua
        ? { rua, numero, complemento, bairro, cidade, cep, estado }
        : undefined,
      tipo: 'distribuidor',
    });
  }

  return { contas, avisos };
};

// ══════════════════════════════════════════════════════════════
// MIGRAR
// ══════════════════════════════════════════════════════════════
const migrar = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI não definido em .env.local');
    process.exit(1);
  }

  const { contas, avisos } = lerContasDoEnv();

  console.log('═'.repeat(60));
  console.log(`🔐 MIGRAÇÃO DE USUÁRIOS .env → MongoDB ${DRY_RUN ? '(DRY-RUN)' : ''}`);
  console.log('═'.repeat(60));
  console.log(`Contas encontradas no .env: ${contas.length}`);
  avisos.forEach(a => console.warn(`⚠️  ${a}`));
  console.log('');

  if (contas.length === 0) {
    console.log('Nada a migrar.');
    return;
  }

  // Emails duplicados dentro do próprio .env quebrariam o índice unique
  const emails = contas.filter(c => c.email).map(c => c.email);
  const duplicados = emails.filter((e, i) => emails.indexOf(e) !== i);
  if (duplicados.length) {
    console.error(`❌ Emails duplicados no .env: ${[...new Set(duplicados)].join(', ')}`);
    console.error('   Cada conta precisa de um email único. Corrija e execute novamente.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Conectado ao MongoDB\n');

  let criados = 0;
  let atualizados = 0;
  let senhasMantidas = 0;

  for (const conta of contas) {
    const existente = await User.findOne({ usuario: conta.usuario });

    // Só define a senha do .env se o usuário ainda não tem uma própria
    // (ou se --force-password). Assim, rodar o script 2x não reverte senhas
    // que os distribuidores já alteraram.
    const definirSenha = FORCE_PASSWORD || !existente || !existente.senhaDefinida;

    const dados = {
      usuario: conta.usuario,
      nome: conta.nome,
      tipo: conta.tipo,
      ativo: existente ? existente.ativo !== false : true,
      telefone: existente?.telefone || conta.telefone,
      // Endereço: prioriza o que já está no banco (editado no checkout)
      endereco: existente?.endereco?.rua ? existente.endereco : conta.endereco,
      tentativasLogin: 0,
      bloqueadoAte: null,
    };

    // Email: mantém o do banco se existir e o .env não tiver; senão usa o .env.
    // Sem email real, gera um placeholder único para respeitar o índice unique.
    const emailFinal =
      conta.email ||
      (existente?.email && !existente.email.endsWith('@distribuidora.com')
        ? existente.email
        : `${conta.usuario}@sem-email.local`);
    dados.email = emailFinal;

    if (definirSenha) {
      dados.password = await bcrypt.hash(conta.senha, 12);
      dados.senhaDefinida = true;
      dados.passwordAlteradaEm = new Date();
      dados.dispositivosConfiaveis = [];
    } else {
      senhasMantidas++;
    }

    const acao = existente ? 'ATUALIZAR' : 'CRIAR';
    console.log(
      `${acao === 'CRIAR' ? '➕' : '♻️ '} ${acao.padEnd(9)} ${conta.tipo.padEnd(13)} ${conta.usuario.padEnd(20)} ${emailFinal}${
        definirSenha ? '' : '  (senha própria mantida)'
      }`
    );

    if (DRY_RUN) continue;

    await User.updateOne({ usuario: conta.usuario }, { $set: dados }, { upsert: true });
    if (existente) atualizados++;
    else criados++;
  }

  // Garante os índices unique (usuario, email)
  if (!DRY_RUN) {
    try {
      await User.collection.createIndex({ usuario: 1 }, { unique: true });
      await User.collection.createIndex({ email: 1 }, { unique: true });
    } catch (e) {
      console.warn(`⚠️  Não foi possível criar índices unique: ${e.message}`);
    }
  }

  console.log('');
  console.log('═'.repeat(60));
  if (DRY_RUN) {
    console.log('DRY-RUN concluído. Nada foi gravado.');
  } else {
    console.log(`✅ Concluído: ${criados} criados, ${atualizados} atualizados, ${senhasMantidas} senhas próprias mantidas.`);
    console.log('');
    console.log('PRÓXIMOS PASSOS:');
    console.log('  1. Faça login com o admin e confira /admin/distribuidores');
    console.log('  2. Cadastre email para contas marcadas com @sem-email.local');
    console.log('  3. Remova DISTRIBUIDOR_x e ADMIN_PASSWORD do .env.local e da Vercel');
    console.log('  4. Garanta JWT_SECRET (>= 32 chars) e BASE_URL definidos na Vercel');
  }
  console.log('═'.repeat(60));
};

migrar()
  .catch(err => {
    console.error('💥 Erro na migração:', err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
