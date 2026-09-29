// lib/authEmails.js - EMAILS DE AUTENTICAÇÃO
// ===================================
// OTP de login, recuperação de senha, convite para definir senha e
// aviso de senha alterada. Envio via Resend (lib/mailer.js).

import { AUTH_CONFIG } from './auth';
import { enviarEmail } from './mailer';

const NOME_SISTEMA = 'Elite Surfing Portal';

export const getBaseUrl = () =>
  (process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');

const escapar = valor =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// ══════════════════════════════════════════════════════════════
// LAYOUT BASE
// ══════════════════════════════════════════════════════════════
const layout = ({ titulo, corpo, rodape }) => `
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
            ${rodape || 'Se você não solicitou esta ação, ignore este email. Nenhuma alteração será feita na sua conta.'}
            <br>Este é um email automático, não responda.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const botao = (href, texto) => `
  <table cellpadding="0" cellspacing="0" style="margin:24px auto;">
    <tr><td style="background:#2563eb;border-radius:8px;">
      <a href="${href}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;">${texto}</a>
    </td></tr>
  </table>
  <p style="font-size:12px;color:#6b7280;word-break:break-all;">Se o botão não funcionar, copie e cole este link no navegador:<br>${href}</p>`;

const enviar = ({ para, assunto, html }) => enviarEmail({ para, assunto, html });

// ══════════════════════════════════════════════════════════════
// 1. CÓDIGO OTP DE LOGIN
// ══════════════════════════════════════════════════════════════
export const enviarOtpLogin = async ({ user, codigo, dispositivo, ip }) => {
  const minutos = Math.round(AUTH_CONFIG.OTP_DURACAO_SEG / 60);
  const corpo = `
    <p>Olá, <strong>${escapar(user.nome)}</strong>.</p>
    <p>Use o código abaixo para concluir o seu login. Ele é válido por <strong>${minutos} minutos</strong>.</p>
    <div style="margin:24px 0;text-align:center;">
      <span style="display:inline-block;font-size:34px;letter-spacing:10px;font-weight:bold;background:#f3f4f6;border:1px dashed #d1d5db;border-radius:10px;padding:16px 24px;font-family:'Courier New',monospace;">${escapar(codigo)}</span>
    </div>
    <p style="font-size:13px;color:#6b7280;">
      Tentativa de acesso de: <strong>${escapar(dispositivo || 'dispositivo desconhecido')}</strong>${ip ? ` (IP ${escapar(ip)})` : ''}
    </p>
    <p style="font-size:13px;color:#b91c1c;"><strong>Nunca compartilhe este código.</strong> A nossa equipe jamais vai pedi-lo por telefone ou mensagem.</p>`;

  return enviar({
    para: user.email,
    assunto: `${codigo} é o seu código de acesso - ${NOME_SISTEMA}`,
    html: layout({
      titulo: 'Código de verificação',
      corpo,
      rodape:
        'Se você não tentou fazer login, recomendamos trocar a sua senha imediatamente pela opção "Esqueci minha senha".',
    }),
  });
};

// ══════════════════════════════════════════════════════════════
// 2. RECUPERAÇÃO DE SENHA
// ══════════════════════════════════════════════════════════════
export const enviarResetSenha = async ({ user, token }) => {
  const link = `${getBaseUrl()}/redefinir-senha?token=${token}`;
  const minutos = Math.round(AUTH_CONFIG.RESET_DURACAO_SEG / 60);
  const corpo = `
    <p>Olá, <strong>${escapar(user.nome)}</strong>.</p>
    <p>Recebemos um pedido para redefinir a senha da conta <strong>${escapar(user.usuario)}</strong>.</p>
    <p>Clique no botão abaixo para escolher uma nova senha. O link é válido por <strong>${minutos} minutos</strong> e só pode ser usado uma vez.</p>
    ${botao(link, 'Redefinir minha senha')}`;

  return enviar({
    para: user.email,
    assunto: `Redefinição de senha - ${NOME_SISTEMA}`,
    html: layout({ titulo: 'Recuperação de senha', corpo }),
  });
};

// ══════════════════════════════════════════════════════════════
// 3. CONVITE (NOVO DISTRIBUIDOR / RESET FORÇADO PELO ADMIN)
// ══════════════════════════════════════════════════════════════
export const enviarConviteDefinirSenha = async ({ user, token, reenvio }) => {
  const link = `${getBaseUrl()}/redefinir-senha?token=${token}&convite=1`;
  const dias = Math.round(AUTH_CONFIG.CONVITE_DURACAO_SEG / 86400);
  const corpo = `
    <p>Olá, <strong>${escapar(user.nome)}</strong>.</p>
    <p>${
      reenvio
        ? 'O administrador solicitou que você defina uma nova senha de acesso.'
        : `Sua conta de distribuidor no <strong>${NOME_SISTEMA}</strong> foi criada.`
    }</p>
    <table cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin:16px 0;font-size:14px;">
      <tr><td style="color:#6b7280;padding-right:12px;">Usuário:</td><td><strong>${escapar(user.usuario)}</strong></td></tr>
      <tr><td style="color:#6b7280;padding-right:12px;">Email:</td><td>${escapar(user.email)}</td></tr>
    </table>
    <p>Clique no botão para definir a sua senha. O link é válido por <strong>${dias} dias</strong>.</p>
    ${botao(link, 'Definir minha senha')}`;

  return enviar({
    para: user.email,
    assunto: reenvio
      ? `Defina uma nova senha - ${NOME_SISTEMA}`
      : `Bem-vindo(a) ao ${NOME_SISTEMA} - defina sua senha`,
    html: layout({
      titulo: reenvio ? 'Nova senha de acesso' : 'Bem-vindo(a)',
      corpo,
      rodape: 'Se você não esperava este email, entre em contato com o administrador do sistema.',
    }),
  });
};

// ══════════════════════════════════════════════════════════════
// 3b. CONVITE DE CADASTRO (DISTRIBUIDOR CRIA A PRÓPRIA CONTA)
// ══════════════════════════════════════════════════════════════
// Usado por /api/admin/convites. O destinatário ainda NÃO tem User:
// abre /cadastro/[token], escolhe usuário e senha e preenche os dados.
export const enviarConviteCadastro = async ({ convite, token, adminNome, reenvio }) => {
  const link = `${getBaseUrl()}/cadastro/${token}`;
  const dias = Math.max(1, Math.round((convite.expiraEm.getTime() - Date.now()) / 86400000));
  const saudacao = convite.nome ? `Olá, <strong>${escapar(convite.nome)}</strong>.` : 'Olá.';
  const corpo = `
    <p>${saudacao}</p>
    <p>${
      reenvio
        ? 'Reenviamos o seu convite para se cadastrar como distribuidor'
        : 'Você foi convidado(a) a se cadastrar como distribuidor'
    } no <strong>${NOME_SISTEMA}</strong>${adminNome ? ` por <strong>${escapar(adminNome)}</strong>` : ''}.</p>
    ${
      convite.mensagem
        ? `<blockquote style="margin:16px 0;padding:12px 16px;background:#f9fafb;border-left:4px solid #2563eb;color:#374151;font-size:14px;">${escapar(
            convite.mensagem,
          ).replace(/\n/g, '<br>')}</blockquote>`
        : ''
    }
    <p>No portal você acessa o catálogo dos nossos fornecedores, faz pedidos diretamente e acompanha entregas e pagamentos.</p>
    <p>Clique no botão para criar a sua conta. O link é válido por <strong>${dias} dia(s)</strong> e só pode ser usado uma vez.</p>
    ${botao(link, 'Criar minha conta')}
    <p style="font-size:13px;color:#6b7280;">O cadastro é feito com o email <strong>${escapar(convite.email)}</strong>.</p>`;

  return enviar({
    para: convite.email,
    assunto: `Convite para o ${NOME_SISTEMA}`,
    html: layout({
      titulo: 'Convite de cadastro',
      corpo,
      rodape: 'Se você não esperava este convite, pode simplesmente ignorar este email.',
    }),
  });
};

// ══════════════════════════════════════════════════════════════
// 4. AVISO: SENHA ALTERADA
// ══════════════════════════════════════════════════════════════
export const enviarAvisoSenhaAlterada = async ({ user, dispositivo, ip }) => {
  const corpo = `
    <p>Olá, <strong>${escapar(user.nome)}</strong>.</p>
    <p>A senha da conta <strong>${escapar(user.usuario)}</strong> foi alterada em ${new Date().toLocaleString(
      'pt-BR',
      { timeZone: 'America/Sao_Paulo' },
    )}.</p>
    <p style="font-size:13px;color:#6b7280;">Origem: ${escapar(dispositivo || 'desconhecida')}${ip ? ` (IP ${escapar(ip)})` : ''}</p>
    <p>Todas as sessões anteriores foram encerradas. Se foi você, não precisa fazer mais nada.</p>
    <p style="color:#b91c1c;"><strong>Não foi você?</strong> Use "Esqueci minha senha" na tela de login imediatamente e avise o administrador.</p>`;

  return enviar({
    para: user.email,
    assunto: `Sua senha foi alterada - ${NOME_SISTEMA}`,
    html: layout({ titulo: 'Alerta de segurança', corpo, rodape: ' ' }),
  });
};
