// lib/convites.js - HELPERS DE CONVITES DE CADASTRO
// ===================================

import { STATUS_CONVITE } from '../models/Convite';

/** Representação segura de um convite para o painel admin (sem tokenHash) */
export const serializarConvite = c => {
  const expirado =
    c.status === STATUS_CONVITE.PENDENTE && new Date(c.expiraEm).getTime() < Date.now();
  return {
    _id: c._id,
    email: c.email,
    nome: c.nome || '',
    mensagem: c.mensagem || '',
    status: expirado ? 'expirado' : c.status,
    expiraEm: c.expiraEm,
    enviadoEm: c.enviadoEm,
    reenvios: c.reenvios || 0,
    ultimoErroEnvio: c.ultimoErroEnvio || '',
    aceiteEm: c.aceiteEm,
    canceladoEm: c.canceladoEm,
    userId: c.userId
      ? { _id: c.userId._id || c.userId, usuario: c.userId.usuario, nome: c.userId.nome }
      : null,
    criadoPor: c.criadoPor ? { nome: c.criadoPor.nome, usuario: c.criadoPor.usuario } : null,
    createdAt: c.createdAt,
  };
};
