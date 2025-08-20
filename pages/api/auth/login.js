import jwt from 'jsonwebtoken';

// Função para carregar distribuidores do .env
const getDistribuidores = () => {
  const distribuidores = [];

  // Carregar distribuidores das variáveis de ambiente
  for (let i = 1; i <= 20; i++) {
    // Suporta até 20 distribuidores
    const distribuidorEnv = process.env[`DISTRIBUIDOR_${i}`];
    if (distribuidorEnv) {
      const [usuario, password, nomeCompleto] = distribuidorEnv.split(':');
      distribuidores.push({
        usuario: usuario.trim(),
        password: password.trim(),
        nomeCompleto: nomeCompleto.trim(),
      });
    }
  }

  return distribuidores;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { username, password } = req.body;

  console.log('=== LOGIN DEBUG ===');
  console.log('Username:', username);
  console.log('Password:', password);

  try {
    // 1. VERIFICAR ADMIN
    if (
      username === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD
    ) {
      console.log('✅ Login ADMIN bem-sucedido');

      const token = jwt.sign(
        {
          id: 'admin',
          usuario: username,
          tipo: 'admin',
          nome: 'Administrador',
        },
        process.env.NEXTAUTH_SECRET,
        { expiresIn: '24h' }
      );

      res.setHeader(
        'Set-Cookie',
        `auth-token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`
      );

      return res.status(200).json({
        success: true,
        message: 'Login admin realizado com sucesso',
        user: { tipo: 'admin', nome: 'Administrador' },
      });
    }

    // 2. VERIFICAR DISTRIBUIDORES
    const distribuidores = getDistribuidores();
    console.log('Distribuidores carregados:', distribuidores.length);
    console.log(
      'Lista:',
      distribuidores.map(d => d.usuario)
    );

    const distribuidor = distribuidores.find(
      d => d.usuario === username && d.password === password
    );

    if (distribuidor) {
      console.log(
        '✅ Login DISTRIBUIDOR bem-sucedido:',
        distribuidor.nomeCompleto
      );

      const token = jwt.sign(
        {
          id: distribuidor.usuario, // Usar usuario como ID
          usuario: distribuidor.usuario,
          tipo: 'distribuidor',
          nome: distribuidor.nomeCompleto,
        },
        process.env.NEXTAUTH_SECRET,
        { expiresIn: '24h' }
      );

      res.setHeader(
        'Set-Cookie',
        `auth-token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`
      );

      return res.status(200).json({
        success: true,
        message: 'Login realizado com sucesso',
        user: {
          id: distribuidor.usuario,
          nome: distribuidor.nomeCompleto,
          usuario: distribuidor.usuario,
          tipo: 'distribuidor',
        },
      });
    }

    // 3. CREDENCIAIS INVÁLIDAS
    console.log('❌ Credenciais inválidas');
    return res.status(401).json({
      success: false,
      message: 'Usuário ou senha incorretos',
    });
  } catch (error) {
    console.error('💥 Erro no login:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
    });
  }
}
