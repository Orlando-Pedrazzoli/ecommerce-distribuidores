// pages/api/pedidos/criar.js - CRIAR PEDIDO (COM SINAL PIX OBRIGATÓRIO)
// ===================================
// POST { itens, fornecedorId, formaPagamento, endereco, sinal: { txid, comprovanteId, valor } }
//
// - Preços, royalties (com categorias isentas) e sinal são calculados no
//   servidor a partir do cadastro (lib/pedidos.js).
// - Se o fornecedor exige sinal, o pedido só é criado com o comprovante do
//   Pix anexado; o comprovante segue em anexo no email do fornecedor.
// - O txid do Pix é único por pedido: repetir o envio devolve o pedido que
//   já existe em vez de criar outro.
// 🔐 Autenticação via requireDistribuidor (dados do distribuidor vêm do Mongo)

import mongoose from 'mongoose';
import dbConnect from '../../../lib/mongodb';
import Pedido from '../../../models/Pedido';
import Fornecedor from '../../../models/Fornecedor';
import { enviarEmailsPedido } from '../../../lib/email';
import { requireDistribuidor } from '../../../lib/auth';
import { montarPedido, ErroPedido } from '../../../lib/pedidos';
import { pixConfigurado, txidValido } from '../../../lib/pix';
import { arred } from '../../../lib/financeiro';
import {
  vincularComprovante,
  referenciarComprovante,
  libertarComprovante,
  anexoDoComprovante,
} from '../../../lib/comprovantes';

const CAMPOS_ENDERECO = ['rua', 'numero', 'bairro', 'cidade', 'cep', 'estado'];

const respostaPedido = (pedido, extra = {}) => ({
  success: true,
  pedidoId: pedido._id,
  numeroPedido: pedido._id.toString().slice(-8).toUpperCase(),
  resumo: {
    subtotal: pedido.subtotal,
    royalties: pedido.royalties,
    total: pedido.total,
    sinal: pedido.sinal?.valor || 0,
  },
  ...extra,
});

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await dbConnect();

  let comprovanteReservado = null;

  try {
    const { itens, fornecedorId, formaPagamento, endereco } = req.body || {};
    const sinalEnviado = req.body?.sinal || {};

    if (!itens || !fornecedorId || !formaPagamento || !endereco) {
      return res.status(400).json({ message: 'Dados obrigatórios não fornecidos' });
    }
    if (!['boleto', 'transferencia'].includes(formaPagamento)) {
      return res.status(400).json({ message: 'Forma de pagamento inválida' });
    }
    const faltando = CAMPOS_ENDERECO.find(c => !String(endereco?.[c] || '').trim());
    if (faltando) {
      return res.status(400).json({ message: 'Endereço de entrega incompleto' });
    }
    if (!mongoose.Types.ObjectId.isValid(String(fornecedorId))) {
      return res.status(400).json({ message: 'Fornecedor inválido' });
    }

    // Dados do distribuidor (vêm do Mongo via requireDistribuidor)
    const distribuidor = {
      usuario: req.user.usuario,
      nome: req.user.nome,
      email: req.user.email,
      telefone: req.user.telefone,
    };

    const fornecedor = await Fornecedor.findById(fornecedorId);
    if (!fornecedor || fornecedor.ativo === false) {
      return res.status(409).json({ message: 'Este fornecedor já não está disponível' });
    }

    // ══════════════════════════════════════════════════════════════
    // TOTAIS (preços do cadastro, royalties com isenções, sinal)
    // ══════════════════════════════════════════════════════════════
    const calculo = await montarPedido({ itens, fornecedor });
    const { valores, sinal } = calculo;

    // ══════════════════════════════════════════════════════════════
    // SINAL: sem comprovante do Pix o pedido não é enviado
    // ══════════════════════════════════════════════════════════════
    let dadosSinal = { percentual: sinal.percentual, valor: 0, status: 'nao_aplicavel' };

    if (sinal.exigido) {
      if (!pixConfigurado(fornecedor.pix)) {
        return res.status(409).json({
          message: `O fornecedor ${fornecedor.nome} ainda não tem chave Pix configurada para receber o sinal. Fale com o administrador.`,
        });
      }

      const txid = String(sinalEnviado.txid || '');
      if (!txidValido(txid) || !sinalEnviado.comprovanteId) {
        return res.status(400).json({
          message: `Para enviar o pedido, pague o sinal de ${sinal.percentual}% por Pix e anexe o comprovante.`,
        });
      }

      // Envio repetido (duplo clique, nova tentativa): devolve o pedido existente
      const existente = await Pedido.findOne({ userId: distribuidor.usuario, 'sinal.txid': txid });
      if (existente) {
        return res.status(200).json(
          respostaPedido(existente, { message: 'Pedido já registrado', duplicado: true }),
        );
      }

      // O valor pago tem de ser o que o servidor calcula agora
      if (
        sinalEnviado.valor !== undefined &&
        arred(sinalEnviado.valor) !== arred(sinal.valor)
      ) {
        return res.status(409).json({
          message:
            'Os preços deste pedido foram atualizados e o valor do sinal mudou. Volte ao carrinho e reveja o pedido.',
          sinalAtual: sinal.valor,
        });
      }

      comprovanteReservado = await vincularComprovante({
        comprovanteId: sinalEnviado.comprovanteId,
        usuario: distribuidor.usuario,
        finalidade: 'sinal',
      });
      if (!comprovanteReservado) {
        // Pode ser o mesmo envio a chegar duas vezes ao mesmo tempo
        const gemeo = await Pedido.findOne({ userId: distribuidor.usuario, 'sinal.txid': txid });
        if (gemeo) {
          return res.status(200).json(
            respostaPedido(gemeo, { message: 'Pedido já registrado', duplicado: true }),
          );
        }
        return res.status(409).json({
          message:
            'Comprovante não encontrado ou já usado noutro pedido. Anexe o comprovante deste Pix.',
        });
      }

      dadosSinal = {
        percentual: sinal.percentual,
        valor: sinal.valor,
        status: 'em_analise',
        txid,
        chavePix: fornecedor.pix.chave,
        comprovanteId: comprovanteReservado._id,
        enviadoEm: new Date(),
      };
    }

    // ══════════════════════════════════════════════════════════════
    // CRIAR PEDIDO
    // ══════════════════════════════════════════════════════════════
    const pedido = new Pedido({
      userId: distribuidor.usuario,
      fornecedorId: fornecedor._id,
      itens: calculo.itens,
      subtotal: valores.subtotal,
      royalties: valores.royalties,
      totalFornecedor: valores.totalFornecedor,
      total: valores.total,
      formaPagamento,
      endereco: {
        rua: String(endereco.rua).trim(),
        numero: String(endereco.numero).trim(),
        complemento: String(endereco.complemento || '').trim(),
        bairro: String(endereco.bairro).trim(),
        cidade: String(endereco.cidade).trim(),
        cep: String(endereco.cep).trim(),
        estado: String(endereco.estado).trim(),
      },
      sinal: dadosSinal,
      // Controle financeiro iniciado como pendente
      controleFinanceiro: {
        royalties: { status: 'pendente' },
      },
    });

    try {
      await pedido.save();
    } catch (error) {
      // Dois envios em simultâneo com o mesmo Pix: fica o primeiro
      if (error.code === 11000 && dadosSinal.txid) {
        const existente = await Pedido.findOne({
          userId: distribuidor.usuario,
          'sinal.txid': dadosSinal.txid,
        });
        if (existente) {
          if (comprovanteReservado) {
            await libertarComprovante(comprovanteReservado._id).catch(() => {});
            comprovanteReservado = null;
          }
          return res.status(200).json(
            respostaPedido(existente, { message: 'Pedido já registrado', duplicado: true }),
          );
        }
      }
      throw error;
    }

    console.log(
      `✅ Pedido ${pedido._id} criado por ${distribuidor.usuario} (${fornecedor.codigo}) ` +
        `total=${valores.total} sinal=${dadosSinal.valor}`,
    );

    if (comprovanteReservado) {
      await referenciarComprovante(comprovanteReservado._id, 'Pedido', pedido._id);
      comprovanteReservado = null; // a partir daqui pertence ao pedido
    }

    // ══════════════════════════════════════════════════════════════
    // ENVIAR EMAILS (o comprovante do sinal vai em anexo)
    // ══════════════════════════════════════════════════════════════
    try {
      const anexos = dadosSinal.comprovanteId
        ? await anexoDoComprovante(
            dadosSinal.comprovanteId,
            `comprovante-sinal-${pedido._id.toString().slice(-8).toUpperCase()}`,
          )
        : [];

      const resultadoEmail = await enviarEmailsPedido(pedido, fornecedor, distribuidor, {
        anexos,
      });

      if (resultadoEmail.sucesso) {
        console.log(`✅ Emails enviados: ${resultadoEmail.totalEnviados}`);
      } else {
        console.error('❌ Erro no envio de emails:', resultadoEmail.erro);
      }
    } catch (emailError) {
      console.error('💥 Erro ao enviar emails:', emailError);
      // Não falhar o pedido por causa do email
    }

    return res.status(201).json(
      respostaPedido(pedido, {
        message: 'Pedido criado com sucesso! Emails enviados automaticamente.',
        resumo: {
          ...valores,
          sinal: dadosSinal.valor,
        },
      }),
    );
  } catch (error) {
    // Se o pedido não chegou a ser criado, o comprovante volta a ficar disponível
    if (comprovanteReservado) {
      await libertarComprovante(comprovanteReservado._id).catch(() => {});
    }

    if (error instanceof ErroPedido) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error('💥 Erro ao criar pedido:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

export default requireDistribuidor(handler);
