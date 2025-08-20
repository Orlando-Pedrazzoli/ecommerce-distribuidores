// 1. CORREÇÃO: lib/email.js - MÉTODO CORRETO DO NODEMAILER
// ===================================

import nodemailer from 'nodemailer';

// ✅ CORREÇÃO: createTransport (sem 'er' no final)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false, // true para 465, false para outros ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Função para enviar email de pedido
export const enviarEmailPedido = async (pedido, fornecedor, distribuidor) => {
  try {
    console.log('📧 Enviando emails do pedido...');

    // Template do email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .section { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .item { border-bottom: 1px solid #ddd; padding: 10px 0; }
          .total { background: #e8f5e8; padding: 15px; border-radius: 8px; font-size: 18px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          .highlight { color: #2c5530; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛍️ Novo Pedido Recebido</h1>
            <p><strong>Pedido #:</strong> ${pedido._id
              .toString()
              .slice(-8)
              .toUpperCase()}</p>
            <p><strong>Data:</strong> ${new Date(
              pedido.createdAt || Date.now()
            ).toLocaleString('pt-BR')}</p>
          </div>

          <div class="section">
            <h3>👤 Dados do Distribuidor</h3>
            <p><strong>Nome:</strong> ${distribuidor.nome}</p>
            <p><strong>Usuário:</strong> ${distribuidor.usuario}</p>
            <p><strong>Email:</strong> ${
              distribuidor.email || `${distribuidor.usuario}@distribuidora.com`
            }</p>
            <p><strong>Telefone:</strong> ${
              distribuidor.telefone || '(11) 99999-9999'
            }</p>
          </div>

          <div class="section">
            <h3>🏭 Fornecedor</h3>
            <p><strong>Nome:</strong> ${fornecedor.nome}</p>
            <p><strong>Código:</strong> ${fornecedor.codigo}</p>
            <p><strong>Email:</strong> ${fornecedor.email}</p>
          </div>

          <div class="section">
            <h3>📦 Itens do Pedido</h3>
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Código</th>
                  <th>Qtd</th>
                  <th>Preço Unit.</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${pedido.itens
                  .map(
                    item => `
                  <tr>
                    <td><strong>${item.nome}</strong></td>
                    <td>${item.codigo}</td>
                    <td>${item.quantidade}</td>
                    <td>R$ ${item.precoUnitario.toFixed(2)}</td>
                    <td>R$ ${(item.quantidade * item.precoUnitario).toFixed(
                      2
                    )}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h3>📍 Endereço de Entrega</h3>
            <p>
              ${pedido.endereco.rua}, ${pedido.endereco.numero}
              ${
                pedido.endereco.complemento
                  ? `, ${pedido.endereco.complemento}`
                  : ''
              }<br>
              ${pedido.endereco.bairro} - ${pedido.endereco.cidade} - ${
      pedido.endereco.estado
    }<br>
              CEP: ${pedido.endereco.cep}
            </p>
          </div>

          <div class="total">
            <h3>💰 Resumo Financeiro</h3>
            <p>Subtotal: R$ ${pedido.subtotal.toFixed(2)}</p>
            <p>Royalties (5%): R$ ${pedido.royalties.toFixed(2)}</p>
            <p class="highlight">TOTAL: R$ ${pedido.total.toFixed(2)}</p>
            <p><strong>Forma de Pagamento:</strong> ${
              pedido.formaPagamento === 'boleto'
                ? 'Boleto Bancário'
                : 'Transferência Bancária'
            }</p>
          </div>

          <div class="section">
            <p><strong>🚚 Próximos Passos:</strong></p>
            <ol>
              <li>Confirmar disponibilidade dos produtos</li>
              <li>Processar pagamento</li>
              <li>Separar e embalar produtos</li>
              <li>Enviar código de rastreamento</li>
            </ol>
          </div>

          <hr>
          <p style="text-align: center; color: #666; font-size: 12px;">
            📦 E-commerce Distribuidores - Sistema Automatizado<br>
            Este email foi gerado automaticamente pelo sistema
          </p>
        </div>
      </body>
      </html>
    `;

    // Lista de emails para enviar
    const emailsEnvio = [
      // 1. Para o ADMIN (você)
      {
        destinatario: process.env.ADMIN_EMAIL,
        assunto: `🆕 NOVO PEDIDO - ${fornecedor.nome} - ${distribuidor.nome}`,
        tipo: 'ADMIN',
      },
      // 2. Para o FORNECEDOR
      {
        destinatario: fornecedor.email,
        assunto: `📦 Novo Pedido de ${distribuidor.nome} - #${pedido._id
          .toString()
          .slice(-8)
          .toUpperCase()}`,
        tipo: 'FORNECEDOR',
      },
      // 3. Para o DISTRIBUIDOR (confirmação)
      {
        destinatario:
          distribuidor.email || `${distribuidor.usuario}@distribuidora.com`,
        assunto: `✅ Pedido Confirmado - #${pedido._id
          .toString()
          .slice(-8)
          .toUpperCase()}`,
        tipo: 'DISTRIBUIDOR',
      },
    ];

    // Enviar para todos
    const resultados = [];
    for (const email of emailsEnvio) {
      try {
        const info = await transporter.sendMail({
          from: `"E-commerce Distribuidores" <${process.env.EMAIL_USER}>`,
          to: email.destinatario,
          subject: email.assunto,
          html: htmlContent,
        });

        console.log(
          `✅ Email enviado para ${email.tipo}: ${email.destinatario}`
        );
        resultados.push({
          tipo: email.tipo,
          sucesso: true,
          messageId: info.messageId,
        });
      } catch (error) {
        console.error(`❌ Erro ao enviar para ${email.tipo}:`, error.message);
        resultados.push({
          tipo: email.tipo,
          sucesso: false,
          erro: error.message,
        });
      }
    }

    return {
      sucesso: true,
      resultados,
      totalEnviados: resultados.filter(r => r.sucesso).length,
    };
  } catch (error) {
    console.error('💥 Erro geral no envio de emails:', error);
    return {
      sucesso: false,
      erro: error.message,
    };
  }
};

// Função de teste de email
export const testarEmail = async () => {
  try {
    const info = await transporter.sendMail({
      from: `"Teste E-commerce" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: '🧪 Teste de Configuração de Email',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>✅ Email Configurado com Sucesso!</h2>
          <p>Se você recebeu este email, a configuração está funcionando perfeitamente.</p>
          <p><strong>Data/Hora:</strong> ${new Date().toLocaleString(
            'pt-BR'
          )}</p>
          <p><strong>Servidor:</strong> ${process.env.EMAIL_HOST}</p>
        </div>
      `,
    });

    return { sucesso: true, messageId: info.messageId };
  } catch (error) {
    return { sucesso: false, erro: error.message };
  }
};
