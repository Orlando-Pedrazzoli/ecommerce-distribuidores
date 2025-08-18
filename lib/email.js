// 7. LIB/EMAIL.JS
// ===================================

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const enviarEmailPedido = async (pedido, fornecedor, distribuidor) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c3e50;">Novo Pedido Recebido</h2>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Dados do Distribuidor:</h3>
        <p><strong>Nome:</strong> ${distribuidor.nome}</p>
        <p><strong>Email:</strong> ${distribuidor.email}</p>
        <p><strong>Telefone:</strong> ${distribuidor.telefone}</p>
        <p><strong>Endereço:</strong> ${distribuidor.endereco.rua}, ${
    distribuidor.endereco.numero
  } - ${distribuidor.endereco.cidade}</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Itens do Pedido:</h3>
        ${pedido.itens
          .map(
            item => `
          <div style="border-bottom: 1px solid #ddd; padding: 10px 0;">
            <p><strong>${item.nome}</strong></p>
            <p>Quantidade: ${
              item.quantidade
            } | Preço: R$ ${item.precoUnitario.toFixed(2)}</p>
            <p>Subtotal: R$ ${(item.quantidade * item.precoUnitario).toFixed(
              2
            )}</p>
          </div>
        `
          )
          .join('')}
      </div>
      
      <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Resumo Financeiro:</h3>
        <p><strong>Subtotal:</strong> R$ ${pedido.subtotal.toFixed(2)}</p>
        <p><strong>Royalties (5%):</strong> R$ ${pedido.royalties.toFixed(
          2
        )}</p>
        <p style="font-size: 18px;"><strong>Total:</strong> R$ ${pedido.total.toFixed(
          2
        )}</p>
        <p><strong>Forma de Pagamento:</strong> ${pedido.formaPagamento}</p>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        Data do Pedido: ${new Date(pedido.dataPedido).toLocaleString('pt-BR')}
      </p>
    </div>
  `;

  // Email para o fornecedor
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: fornecedor.email,
    subject: `Novo Pedido - ${distribuidor.nome}`,
    html: htmlContent,
  });

  // Cópia para o admin
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.ADMIN_EMAIL,
    subject: `[CÓPIA] Novo Pedido - ${fornecedor.nome}`,
    html: htmlContent,
  });
};
