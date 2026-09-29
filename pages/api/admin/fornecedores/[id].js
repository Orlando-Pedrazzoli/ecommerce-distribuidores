// pages/api/admin/fornecedores/[id].js - DETALHE / EDITAR / APAGAR FORNECEDOR
// ===================================
// GET    -> detalhe + contagens
// PUT    -> editar todos os campos (o código só muda se não houver produtos/pedidos)
// PATCH  { acao: 'ativar' | 'desativar' }
// DELETE -> apaga DEFINITIVAMENTE, só se não tiver produtos nem pedidos.
//           Com histórico devolve 409 e o admin deve desativar em vez de apagar.

import mongoose from 'mongoose';
import dbConnect from '../../../../lib/mongodb';
import Fornecedor from '../../../../models/Fornecedor';
import Produto from '../../../../models/Produto';
import Pedido from '../../../../models/Pedido';
import { requireAdmin } from '../../../../lib/auth';
import { validarFornecedor, aplicarCampos } from '../../../../lib/fornecedores';

const CODIGO_REGEX = /^[A-Z0-9]{1,6}$/;

async function handler(req, res) {
  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }

  await dbConnect();
  const fornecedor = await Fornecedor.findById(id);
  if (!fornecedor) {
    return res.status(404).json({ message: 'Fornecedor não encontrado' });
  }

  const contar = async () => {
    const [produtos, pedidos] = await Promise.all([
      Produto.countDocuments({ fornecedorId: fornecedor._id }),
      Pedido.countDocuments({ fornecedorId: fornecedor._id }),
    ]);
    return { produtos, pedidos };
  };

  // ── GET ──
  if (req.method === 'GET') {
    const stats = await contar();
    return res.status(200).json({ success: true, fornecedor, stats });
  }

  // ── PUT ──
  if (req.method === 'PUT') {
    try {
      const erro = validarFornecedor({ ...fornecedor.toObject(), ...req.body });
      if (erro) return res.status(400).json({ message: erro });

      // Mudança de código: só sem histórico (o código está nas URLs e nos emails)
      if (req.body.codigo !== undefined) {
        const novoCodigo = String(req.body.codigo).trim().toUpperCase();
        if (novoCodigo !== fornecedor.codigo) {
          if (!CODIGO_REGEX.test(novoCodigo)) {
            return res
              .status(400)
              .json({ message: 'Código inválido: use 1 a 6 letras ou números' });
          }
          const { produtos, pedidos } = await contar();
          if (produtos > 0 || pedidos > 0) {
            return res.status(400).json({
              message:
                'O código não pode ser alterado: o fornecedor já tem produtos ou pedidos associados',
            });
          }
          const duplicado = await Fornecedor.findOne({
            codigo: novoCodigo,
            _id: { $ne: fornecedor._id },
          });
          if (duplicado)
            return res
              .status(409)
              .json({ message: `Já existe um fornecedor com o código ${novoCodigo}` });
          fornecedor.codigo = novoCodigo;
        }
      }

      aplicarCampos(fornecedor, req.body);
      await fornecedor.save();

      console.log(`✏️ Fornecedor ${fornecedor.codigo} editado por ${req.user.usuario}`);
      return res.status(200).json({ success: true, message: 'Fornecedor atualizado', fornecedor });
    } catch (error) {
      console.error('❌ Erro ao editar fornecedor:', error);
      if (error.code === 11000) return res.status(409).json({ message: 'Código já cadastrado' });
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  // ── PATCH: ativar / desativar ──
  if (req.method === 'PATCH') {
    const acao = String(req.body?.acao || '');
    if (acao !== 'ativar' && acao !== 'desativar') {
      return res.status(400).json({ message: `Ação desconhecida: ${acao}` });
    }
    fornecedor.ativo = acao === 'ativar';
    await fornecedor.save();
    return res.status(200).json({
      success: true,
      message: fornecedor.ativo
        ? 'Fornecedor ativado. Volta a aparecer no portal dos distribuidores.'
        : 'Fornecedor desativado. Os produtos e pedidos são mantidos, mas deixa de aparecer no portal.',
      fornecedor,
    });
  }

  // ── DELETE ──
  if (req.method === 'DELETE') {
    const { produtos, pedidos } = await contar();
    if (produtos > 0 || pedidos > 0) {
      return res.status(409).json({
        message: `Não é possível apagar: o fornecedor tem ${produtos} produto(s) e ${pedidos} pedido(s) associados. Desative-o em vez de apagar.`,
        stats: { produtos, pedidos },
      });
    }
    await fornecedor.deleteOne();
    console.log(`🗑️ Fornecedor ${fornecedor.codigo} apagado por ${req.user.usuario}`);
    return res.status(200).json({ success: true, message: 'Fornecedor apagado' });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default requireAdmin(handler);
