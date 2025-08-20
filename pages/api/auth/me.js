import jwt from 'jsonwebtoken';

// Mesma função para carregar distribuidores
const getDistribuidores = () => {
  const distribuidores = [];
  for (let i = 1; i <= 10; i++) {
    const distribuidorEnv = process.env[`DISTRIBUIDOR_${i}`];
    if (distribuidorEnv) {
      const [email, password, nome] = distribuidorEnv.split(':');
      distribuidores.push({ email, password, nome });
    }
  }
  return distribuidores;
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = req.cookies['auth-token'];

    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);

    // Se for admin
    if (decoded.tipo === 'admin') {
      return res.status(200).json({
        success: true,
        user: {
          id: 'admin',
          nome: 'Administrador',
          email: decoded.email,
          tipo: 'admin',
        },
      });
    }

    // Se for distribuidor, buscar dados atualizados do .env
    if (decoded.tipo === 'distribuidor') {
      const distribuidores = getDistribuidores();
      const distribuidor = distribuidores.find(d => d.email === decoded.email);

      if (distribuidor) {
        return res.status(200).json({
          success: true,
          user: {
            id: distribuidor.email,
            nome: distribuidor.nome,
            email: distribuidor.email,
            tipo: 'distribuidor',
            // Dados fictícios para compatibilidade
            telefone: '(11) 99999-9999',
            endereco: {
              rua: 'Rua Exemplo',
              numero: '123',
              bairro: 'Centro',
              cidade: 'São Paulo',
              cep: '01000-000',
              estado: 'SP',
            },
          },
        });
      }
    }

    return res.status(404).json({ message: 'Usuário não encontrado' });
  } catch (error) {
    console.error('Erro ao verificar usuário:', error);
    return res.status(401).json({ message: 'Token inválido' });
  }
}
