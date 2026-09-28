// utils/auth.js - COMPATIBILIDADE
// ===================================
// Mantido para os imports antigos (`import { requireAuth } from '../utils/auth'`).
// Toda a lógica vive agora em lib/auth.js.

export {
  verifyToken,
  requireAuth,
  requireAdmin,
  requireDistribuidor,
  getSessao,
} from '../lib/auth';
