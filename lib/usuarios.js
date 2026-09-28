// lib/usuarios.js - HELPERS DE USUÁRIO PARTILHADOS ENTRE API ROUTES
// ===================================

/** Representação segura de um usuário para o painel admin (sem hash/tokens) */
export const serializarDistribuidor = u => ({
  _id: u._id,
  usuario: u.usuario,
  nome: u.nome,
  email: u.email,
  telefone: u.telefone || '',
  endereco: u.endereco && u.endereco.rua ? u.endereco : null,
  tipo: u.tipo,
  ativo: u.ativo,
  senhaDefinida: Boolean(u.senhaDefinida),
  bloqueado: Boolean(u.bloqueadoAte && u.bloqueadoAte > new Date()),
  bloqueadoAte: u.bloqueadoAte,
  ultimoLogin: u.ultimoLogin || null,
  dispositivosConfiaveis: (u.dispositivosConfiaveis || [])
    .filter(d => d.expiraEm > new Date())
    .map(d => ({ nome: d.nome, criadoEm: d.criadoEm, ultimoUso: d.ultimoUso })),
  createdAt: u.createdAt,
});
