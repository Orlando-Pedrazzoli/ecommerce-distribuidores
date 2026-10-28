// lib/pagamentoEmails.js - EMAILS DE PIX (SINAL E ROYALTIES)
// ===================================
// Avisos ligados aos comprovantes: pagamento de royalties declarado,
// confirmado ou rejeitado, e cada pagamento (parcial ou integral) do sinal:
// declarado pelo distribuidor, confirmado ou rejeitado pelo admin.
// Assuntos sem emojis: ajuda a não cair no spam.
// Envio via Resend (lib/mailer.js). Nenhuma função lança erro: um email
// que falha nunca deve desfazer a operação financeira que o originou.

import { enviarEmail } from './mailer';
import { resumoSinal } from './financeiro';

const NOME_SISTEMA = 'Elite Surfing Portal';

const baseUrl = () =>
  (process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');

const escapar = valor =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const moeda = valor =>
  `R$ ${(Number(valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const numeroPedido = pedido => String(pedido._id).slice(-8).toUpperCase();

const layout = ({ titulo, corpo }) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#111827;color:#ffffff;padding:20px 28px;">
            <div style="font-size:18px;font-weight:bold;letter-spacing:.5px;">${NOME_SISTEMA}</div>
            <div style="font-size:13px;color:#9ca3af;margin-top:4px;">${escapar(titulo)}</div>
          </td>
        </tr>
        <tr><td style="padding:28px;font-size:15px;line-height:1.6;">${corpo}</td></tr>
        <tr>
          <td style="padding:16px 28px;background:#f9fafb;color:#6b7280;font-size:12px;line-height:1.5;border-top:1px solid #e5e7eb;">
            Este é um email automático do ${NOME_SISTEMA}.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const botao = (caminho, texto) => `
  <table cellpadding="0" cellspacing="0" style="margin:24px auto 8px;">
    <tr><td style="background:#2563eb;border-radius:8px;">
      <a href="${baseUrl()}${caminho}" style="display:inline-block;padding:13px 26px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;">${texto}</a>
    </td></tr>
  </table>`;

const linha = (rotulo, valor) => `
  <tr>
    <td style="padding:6px 0;color:#6b7280;">${rotulo}</td>
    <td style="padding:6px 0;text-align:right;font-weight:bold;">${valor}</td>
  </tr>`;

const tabela = linhas =>
  `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;padding:8px 16px;margin:16px 0;">${linhas}</table>`;

// Nunca deixa um erro de email subir para a API
const enviarSeguro = async (descricao, opts) => {
  try {
    if (!opts.para || (Array.isArray(opts.para) && opts.para.filter(Boolean).length === 0)) {
      console.warn(`⚠️ Email "${descricao}" sem destinatário`);
      return false;
    }
    await enviarEmail(opts);
    return true;
  } catch (error) {
    console.error(`❌ Falha ao enviar email "${descricao}":`, error.message);
    return false;
  }
};

// ══════════════════════════════════════════════════════════════
// ROYALTIES
// ══════════════════════════════════════════════════════════════

/** Admin: o distribuidor registrou um Pix de royalties (comprovante em anexo). */
export const enviarPagamentoDeclarado = ({ pagamento, distribuidor, anexos }) =>
  enviarSeguro('pagamento de royalties declarado', {
    para: process.env.ADMIN_EMAIL,
    assunto: `Pix de royalties: ${moeda(pagamento.valor)} - ${distribuidor.nome}`,
    anexos,
    html: layout({
      titulo: 'Pagamento de royalties para conferir',
      corpo: `
        <p><strong>${escapar(distribuidor.nome)}</strong> registrou um pagamento de royalties por Pix. O comprovante segue em anexo.</p>
        ${tabela(
          linha('Valor', moeda(pagamento.valor)) +
            linha('Identificador do Pix', `<span style="font-family:monospace;">${escapar(pagamento.txid)}</span>`) +
            linha('Em aberto antes', moeda(pagamento.saldoAntes)) +
            linha('Em aberto depois', moeda(pagamento.saldoDepois)) +
            linha('Pedidos abatidos', String(pagamento.alocacoes.length)),
        )}
        <p>A baixa já foi feita no portal. Confira o crédito no seu extrato e confirme &mdash; ou rejeite, e a dívida volta ao distribuidor.</p>
        ${botao('/admin/financeiro', 'Conferir pagamento')}`,
    }),
  });

/** Distribuidor: o admin confirmou o Pix de royalties. */
export const enviarPagamentoConfirmado = ({ pagamento, distribuidor }) =>
  enviarSeguro('pagamento de royalties confirmado', {
    para: distribuidor.email,
    assunto: `Pagamento de royalties confirmado - ${moeda(pagamento.valor)}`,
    html: layout({
      titulo: 'Pagamento confirmado',
      corpo: `
        <p>Olá, ${escapar(distribuidor.nome)}.</p>
        <p>O seu Pix de <strong>${moeda(pagamento.valor)}</strong> referente a royalties foi conferido e confirmado. Obrigado!</p>
        ${botao('/pagamentos', 'Ver pagamentos')}`,
    }),
  });

/** Distribuidor: o admin rejeitou o Pix de royalties (a dívida voltou). */
export const enviarPagamentoRejeitado = ({ pagamento, distribuidor }) =>
  enviarSeguro('pagamento de royalties rejeitado', {
    para: distribuidor.email,
    assunto: `Pagamento de royalties não confirmado - ${moeda(pagamento.valor)}`,
    html: layout({
      titulo: 'Pagamento não confirmado',
      corpo: `
        <p>Olá, ${escapar(distribuidor.nome)}.</p>
        <p>Não conseguimos confirmar o seu Pix de <strong>${moeda(pagamento.valor)}</strong> referente a royalties, por isso a baixa foi desfeita e o valor voltou a constar em aberto.</p>
        ${
          pagamento.motivoRejeicao
            ? `<p style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;border-radius:4px;"><strong>Motivo:</strong> ${escapar(pagamento.motivoRejeicao)}</p>`
            : ''
        }
        <p>Se o Pix foi mesmo feito, registre-o de novo com o comprovante correto ou fale conosco.</p>
        ${botao('/pagamentos', 'Abrir pagamentos')}`,
    }),
  });

// ══════════════════════════════════════════════════════════════
// SINAL (pode ser pago em partes; cada pagamento tem o seu email)
// ══════════════════════════════════════════════════════════════

const tabelaSinal = (pedido, pagamento) => {
  const r = resumoSinal(pedido);
  return tabela(
    linha('Este pagamento', moeda(pagamento.valor)) +
      linha(`Sinal total (${r.percentual}%)`, moeda(r.total)) +
      linha('Confirmado', moeda(r.confirmado)) +
      (r.emConferencia > 0 ? linha('Em conferência', moeda(r.emConferencia)) : '') +
      linha('Falta pagar', moeda(r.emAberto)) +
      linha(
        'Identificador do Pix',
        `<span style="font-family:monospace;">${escapar(pagamento.txid || '-')}</span>`,
      ),
  );
};

/** Distribuidor: um pagamento do sinal foi confirmado. */
export const enviarSinalConfirmado = ({ pedido, pagamento, fornecedor, distribuidor }) => {
  const r = resumoSinal(pedido);
  return enviarSeguro('sinal confirmado', {
    para: distribuidor.email,
    assunto: `Sinal confirmado - Pedido #${numeroPedido(pedido)}`,
    html: layout({
      titulo: 'Sinal confirmado',
      corpo: `
        <p>Olá, ${escapar(distribuidor.nome)}.</p>
        <p>O pagamento de <strong>${moeda(pagamento.valor)}</strong> do sinal do pedido <strong>#${numeroPedido(pedido)}</strong> (${escapar(fornecedor?.nome || 'fornecedor')}) foi confirmado.</p>
        ${tabelaSinal(pedido, pagamento)}
        ${
          r.emAberto > 0
            ? `<p>Ainda falta <strong>${moeda(r.emAberto)}</strong> do sinal. Pode pagar o restante por Pix em "Meus Pedidos".</p>`
            : '<p>O sinal deste pedido está completo.</p>'
        }
        ${botao('/meus-pedidos', 'Ver meus pedidos')}`,
    }),
  });
};

/** Distribuidor: um pagamento do sinal foi rejeitado; o valor voltou ao em aberto. */
export const enviarSinalRejeitado = ({ pedido, pagamento, fornecedor, distribuidor }) =>
  enviarSeguro('sinal rejeitado', {
    para: distribuidor.email,
    assunto: `Pagamento do sinal não confirmado - Pedido #${numeroPedido(pedido)}`,
    html: layout({
      titulo: 'Pagamento do sinal não confirmado',
      corpo: `
        <p>Olá, ${escapar(distribuidor.nome)}.</p>
        <p>Não conseguimos confirmar o pagamento de <strong>${moeda(pagamento.valor)}</strong> do sinal do pedido <strong>#${numeroPedido(pedido)}</strong> (${escapar(fornecedor?.nome || 'fornecedor')}).</p>
        ${
          pagamento.motivoRejeicao
            ? `<p style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;border-radius:4px;"><strong>Motivo:</strong> ${escapar(pagamento.motivoRejeicao)}</p>`
            : ''
        }
        ${tabelaSinal(pedido, pagamento)}
        <p>Esse valor voltou a ficar em aberto. Abra o pedido em "Meus Pedidos" para pagar de novo e enviar o comprovante.</p>
        ${botao('/meus-pedidos', 'Pagar o sinal')}`,
    }),
  });

/** Fornecedor + admin: o distribuidor pagou (parte d)o sinal depois do pedido. */
export const enviarSinalDeclarado = ({ pedido, pagamento, fornecedor, distribuidor, anexos }) => {
  const r = resumoSinal(pedido);
  const parcial = r.emAberto > 0 || r.confirmado > 0;
  return enviarSeguro('pagamento do sinal', {
    para: [
      process.env.ADMIN_EMAIL,
      fornecedor?.email,
      ...((fornecedor && fornecedor.emailsCopia) || []),
    ].filter(Boolean),
    assunto: `Sinal ${parcial ? 'parcial ' : ''}pago por Pix - Pedido #${numeroPedido(pedido)} - ${moeda(pagamento.valor)}`,
    anexos,
    html: layout({
      titulo: 'Pagamento do sinal por Pix',
      corpo: `
        <p><strong>${escapar(distribuidor.nome)}</strong> declarou ter pago <strong>${moeda(pagamento.valor)}</strong> do sinal do pedido <strong>#${numeroPedido(pedido)}</strong> por Pix. O comprovante segue em anexo.</p>
        ${tabelaSinal(pedido, pagamento)}
        ${
          r.emAberto > 0
            ? `<p>Ainda falta <strong>${moeda(r.emAberto)}</strong> do sinal; o distribuidor pode pagar o restante mais tarde.</p>`
            : '<p>Com este pagamento o sinal fica completo.</p>'
        }
        <p>Confira o crédito no extrato antes de dar seguimento ao pedido.</p>`,
    }),
  });
};
