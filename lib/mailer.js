// lib/mailer.js - TRANSPORTE DE EMAIL (Resend)
// ===================================
// Ponto único de envio. lib/email.js (pedidos) e lib/authEmails.js (auth)
// importam daqui. Substitui o nodemailer/SMTP.
//
// Variáveis:
//   RESEND_API_KEY   - chave "re_..." criada em resend.com/api-keys
//   EMAIL_FROM       - remetente. O domínio TEM de estar verificado no Resend.
//                      Ex.: "Elite Surfing Portal <portal@elitesurfing.com.br>"
//                      Em dev, sem domínio verificado, use "onboarding@resend.dev"
//                      (só entrega para o email da própria conta Resend).
//   EMAIL_REPLY_TO   - (opcional) para onde vão as respostas dos destinatários

import { Resend } from 'resend';

let client = null;

const getClient = () => {
  if (client) return client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY não definida');
  }
  client = new Resend(apiKey);
  return client;
};

export const REMETENTE_PADRAO =
  process.env.EMAIL_FROM || 'Elite Surfing Portal <onboarding@resend.dev>';

const REPLY_TO_PADRAO = process.env.EMAIL_REPLY_TO || undefined;

/**
 * Envia um email. Lança erro se o Resend recusar.
 * @param {object} opts
 * @param {string|string[]} opts.para     destinatário(s)
 * @param {string}          opts.assunto
 * @param {string}          opts.html
 * @param {string}         [opts.de]      remetente alternativo (mesmo domínio verificado)
 * @param {string}         [opts.replyTo]
 * @param {Array<{filename:string, content:Buffer|string}>} [opts.anexos]
 *        ficheiros em anexo (ex.: comprovante do Pix)
 * @returns {Promise<string>} id do email no Resend
 */
export const enviarEmail = async ({ para, assunto, html, de, replyTo, anexos }) => {
  const destinatarios = (Array.isArray(para) ? para : [para]).filter(Boolean);
  if (destinatarios.length === 0) {
    throw new Error('Destinatário não informado');
  }

  const anexosValidos = (anexos || [])
    .filter(a => a && a.filename && a.content)
    .map(a => ({ filename: a.filename, content: a.content }));

  const { data, error } = await getClient().emails.send({
    from: de || REMETENTE_PADRAO,
    to: destinatarios,
    subject: assunto,
    html,
    replyTo: replyTo || REPLY_TO_PADRAO,
    ...(anexosValidos.length > 0 ? { attachments: anexosValidos } : {}),
  });

  if (error) {
    throw new Error(
      `Resend: ${error.message || error.name || 'erro desconhecido'}`,
    );
  }

  return data.id;
};
