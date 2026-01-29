// LIB/EMAIL.JS - ATUALIZADO COM 3 TEMPLATES DIFERENTES
// ===================================
// FORNECEDOR: Apenas preço base (NÃO vê royalties, etiquetas, embalagens)
// DISTRIBUIDOR: Preço total + royalties detalhados + lembrete de pagamentos
// ADMIN: TUDO + links para controle financeiro

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ══════════════════════════════════════════════════════════════
// HELPER: Organizar itens por categoria
// ══════════════════════════════════════════════════════════════
const organizarItensPorCategoria = itens => {
  const resultado = {};
  itens.forEach(item => {
    const categoria = item.categoria || 'Sem categoria';
    if (!resultado[categoria]) {
      resultado[categoria] = [];
    }
    resultado[categoria].push(item);
  });
  return resultado;
};

// ══════════════════════════════════════════════════════════════
// TEMPLATE 1: EMAIL PARA FORNECEDOR
// MOSTRA APENAS: Preço base × quantidade
// NÃO MOSTRA: Royalties, etiquetas, embalagens
// ══════════════════════════════════════════════════════════════
const gerarEmailFornecedor = (pedido, fornecedor, distribuidor) => {
  const itensPorCategoria = organizarItensPorCategoria(pedido.itens);

  // Gerar tabela de itens (APENAS preço base)
  const htmlItens = Object.entries(itensPorCategoria)
    .map(([categoria, itens]) => {
      const subtotalCategoria = itens.reduce(
        (acc, item) => acc + item.quantidade * item.precoUnitario,
        0
      );

      return `
        <div style="margin-bottom: 20px;">
          <h4 style="background: #f0f0f0; padding: 10px; margin: 0; border-radius: 5px 5px 0 0; color: #333;">
            📂 ${categoria}
          </h4>
          <table style="width: 100%; border-collapse: collapse; background: white;">
            <thead>
              <tr style="background: #f8f8f8;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Produto</th>
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Código</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Qtd</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Preço Unit.</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itens
                .map(
                  item => `
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${item.nome}</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">${item.codigo}</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantidade}</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">R$ ${item.precoUnitario.toFixed(2)}</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #2c5530;">
                    R$ ${(item.quantidade * item.precoUnitario).toFixed(2)}
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
            <tfoot>
              <tr style="background: #f0f8ff;">
                <td colspan="4" style="padding: 10px; text-align: right; font-weight: bold;">Subtotal ${categoria}:</td>
                <td style="padding: 10px; text-align: right; font-weight: bold; color: #2c5530;">R$ ${subtotalCategoria.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 700px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .section { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .total { background: #e8f5e8; padding: 20px; border-radius: 8px; font-size: 18px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">📦 Novo Pedido Recebido</h1>
          <p style="margin: 10px 0 0 0;">Pedido #${pedido._id.toString().slice(-8).toUpperCase()}</p>
        </div>

        <div class="section">
          <h3>👤 Dados do Distribuidor</h3>
          <p>
            <strong>Nome:</strong> ${distribuidor.nome}<br>
            <strong>Email:</strong> ${distribuidor.email}<br>
            <strong>Telefone:</strong> ${distribuidor.telefone}
          </p>
        </div>

        <div class="section">
          <h3>📍 Endereço de Entrega</h3>
          <p>
            ${pedido.endereco.rua}, ${pedido.endereco.numero}
            ${pedido.endereco.complemento ? `, ${pedido.endereco.complemento}` : ''}<br>
            ${pedido.endereco.bairro} - ${pedido.endereco.cidade} - ${pedido.endereco.estado}<br>
            CEP: ${pedido.endereco.cep}
          </p>
        </div>

        <div style="background: white; border: 2px solid #4CAF50; padding: 20px; border-radius: 8px; margin: 15px 0;">
          <h3 style="color: #4CAF50; margin-top: 0;">📦 Itens do Pedido</h3>
          ${htmlItens}
        </div>

        <div class="total">
          <h3 style="margin-top: 0;">💰 Total do Pedido</h3>
          <p style="font-size: 24px; font-weight: bold; color: #2c5530; margin: 10px 0;">
            R$ ${pedido.subtotal.toFixed(2)}
          </p>
          <p><strong>Forma de Pagamento:</strong> ${
            pedido.formaPagamento === 'boleto' ? 'Boleto Bancário' : 'Transferência Bancária'
          }</p>
        </div>

        <div class="section">
          <h3>🚚 Próximos Passos</h3>
          <ol style="margin: 0; padding-left: 20px;">
            <li>Confirme a disponibilidade dos produtos</li>
            <li>Processe o pagamento</li>
            <li>Separe e embale os produtos</li>
            <li>Envie o código de rastreamento</li>
          </ol>
        </div>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="text-align: center; color: #666; font-size: 12px;">
          📦 Sistema de Pedidos B2B<br>
          Este email foi gerado automaticamente
        </p>
      </div>
    </body>
    </html>
  `;
};

// ══════════════════════════════════════════════════════════════
// TEMPLATE 2: EMAIL PARA DISTRIBUIDOR
// MOSTRA: Preço total + royalties detalhados + lembrete de pagamentos
// ══════════════════════════════════════════════════════════════
const gerarEmailDistribuidor = (pedido, fornecedor, distribuidor) => {
  const itensPorCategoria = organizarItensPorCategoria(pedido.itens);

  // Gerar tabela de itens (preço total = base + etiqueta + embalagem)
  const htmlItens = Object.entries(itensPorCategoria)
    .map(([categoria, itens]) => {
      const subtotalCategoria = itens.reduce((acc, item) => {
        const precoTotal =
          item.precoUnitario + (item.precoEtiqueta || 0) + (item.precoEmbalagem || 0);
        return acc + item.quantidade * precoTotal;
      }, 0);

      return `
        <div style="margin-bottom: 20px;">
          <h4 style="background: #f0f0f0; padding: 10px; margin: 0; border-radius: 5px 5px 0 0; color: #333;">
            📂 ${categoria}
          </h4>
          <table style="width: 100%; border-collapse: collapse; background: white;">
            <thead>
              <tr style="background: #f8f8f8;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Produto</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Qtd</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Preço Unit.</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itens
                .map(item => {
                  const precoTotal =
                    item.precoUnitario + (item.precoEtiqueta || 0) + (item.precoEmbalagem || 0);
                  return `
                  <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">
                      <strong>${item.nome}</strong><br>
                      <span style="color: #666; font-size: 12px;">${item.codigo}</span>
                    </td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantidade}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">R$ ${precoTotal.toFixed(2)}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold; color: #2c5530;">
                      R$ ${(item.quantidade * precoTotal).toFixed(2)}
                    </td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
            <tfoot>
              <tr style="background: #f0f8ff;">
                <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Subtotal ${categoria}:</td>
                <td style="padding: 10px; text-align: right; font-weight: bold; color: #2c5530;">R$ ${subtotalCategoria.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    })
    .join('');

  // Calcular subtotal dos produtos (base + etiqueta + embalagem)
  const subtotalProdutos =
    pedido.subtotal + (pedido.totalEtiquetas || 0) + (pedido.totalEmbalagens || 0);

  // Total de pagamentos pendentes (royalties + etiquetas + embalagens)
  const totalPagamentosPendentes =
    pedido.royalties + (pedido.totalEtiquetas || 0) + (pedido.totalEmbalagens || 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 700px; margin: 0 auto; padding: 20px; }
        .header { background: #2196F3; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .section { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .total { background: #e3f2fd; padding: 20px; border-radius: 8px; }
        .pagamentos { background: #fff3e0; border: 2px solid #ff9800; padding: 15px; border-radius: 8px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">✅ Pedido Confirmado!</h1>
          <p style="margin: 10px 0 0 0;">Pedido #${pedido._id.toString().slice(-8).toUpperCase()}</p>
        </div>

        <div class="section">
          <h3>🏭 Fornecedor</h3>
          <p>
            <strong>Nome:</strong> ${fornecedor.nome}<br>
            <strong>Email:</strong> ${fornecedor.email}
          </p>
        </div>

        <div class="section">
          <h3>📍 Endereço de Entrega</h3>
          <p>
            ${pedido.endereco.rua}, ${pedido.endereco.numero}
            ${pedido.endereco.complemento ? `, ${pedido.endereco.complemento}` : ''}<br>
            ${pedido.endereco.bairro} - ${pedido.endereco.cidade} - ${pedido.endereco.estado}<br>
            CEP: ${pedido.endereco.cep}
          </p>
        </div>

        <div style="background: white; border: 2px solid #2196F3; padding: 20px; border-radius: 8px; margin: 15px 0;">
          <h3 style="color: #2196F3; margin-top: 0;">📦 Itens do Pedido</h3>
          ${htmlItens}
        </div>

        <div class="total">
          <h3 style="margin-top: 0;">💰 Resumo Financeiro</h3>
          <table style="width: 100%;">
            <tr>
              <td style="padding: 8px 0;">Subtotal Produtos:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">R$ ${pedido.subtotal.toFixed(2)}</td>
            </tr>
            ${(pedido.totalEtiquetas || 0) > 0 ? `
            <tr>
              <td style="padding: 8px 0; color: #e65100;">+ Etiquetas:</td>
              <td style="padding: 8px 0; text-align: right; color: #e65100;">R$ ${pedido.totalEtiquetas.toFixed(2)}</td>
            </tr>
            ` : ''}
            ${(pedido.totalEmbalagens || 0) > 0 ? `
            <tr>
              <td style="padding: 8px 0; color: #7b1fa2;">+ Embalagens:</td>
              <td style="padding: 8px 0; text-align: right; color: #7b1fa2;">R$ ${pedido.totalEmbalagens.toFixed(2)}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; color: #1565c0;">+ Royalties (5%):</td>
              <td style="padding: 8px 0; text-align: right; color: #1565c0;">R$ ${pedido.royalties.toFixed(2)}</td>
            </tr>
            <tr style="border-top: 2px solid #2196F3;">
              <td style="padding: 12px 0; font-size: 18px; font-weight: bold;">TOTAL:</td>
              <td style="padding: 12px 0; text-align: right; font-size: 24px; font-weight: bold; color: #2196F3;">
                R$ ${pedido.total.toFixed(2)}
              </td>
            </tr>
          </table>
          <p style="margin-top: 15px;"><strong>Forma de Pagamento:</strong> ${
            pedido.formaPagamento === 'boleto' ? 'Boleto Bancário' : 'Transferência Bancária'
          }</p>
        </div>

        <!-- SEÇÃO DE PAGAMENTOS PENDENTES -->
        <div class="pagamentos">
          <h3 style="margin-top: 0; color: #e65100;">⚠️ Pagamentos Pendentes</h3>
          <p style="margin-bottom: 15px; color: #333;">
            Os seguintes valores estão pendentes de pagamento ao administrador:
          </p>
          <table style="width: 100%; background: white; border-radius: 5px;">
            <tr style="background: #fafafa;">
              <td style="padding: 10px; border-bottom: 1px solid #eee;">Royalties (5%)</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">R$ ${pedido.royalties.toFixed(2)}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
                <span style="background: #fff3e0; color: #e65100; padding: 3px 8px; border-radius: 10px; font-size: 12px;">⏳ Pendente</span>
              </td>
            </tr>
            ${(pedido.totalEtiquetas || 0) > 0 ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">Etiquetas</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">R$ ${pedido.totalEtiquetas.toFixed(2)}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
                <span style="background: #fff3e0; color: #e65100; padding: 3px 8px; border-radius: 10px; font-size: 12px;">⏳ Pendente</span>
              </td>
            </tr>
            ` : ''}
            ${(pedido.totalEmbalagens || 0) > 0 ? `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">Embalagens</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">R$ ${pedido.totalEmbalagens.toFixed(2)}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
                <span style="background: #fff3e0; color: #e65100; padding: 3px 8px; border-radius: 10px; font-size: 12px;">⏳ Pendente</span>
              </td>
            </tr>
            ` : ''}
            <tr style="background: #fff3e0;">
              <td style="padding: 12px; font-weight: bold;">Total Pendente:</td>
              <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: #e65100;">R$ ${totalPagamentosPendentes.toFixed(2)}</td>
              <td></td>
            </tr>
          </table>
          <p style="margin-top: 15px; font-size: 13px; color: #666;">
            📱 Acompanhe o status dos seus pagamentos na área <strong>"Pagamentos"</strong> do sistema.
          </p>
        </div>

        <div class="section">
          <h3>📱 Acompanhe seu Pedido</h3>
          <p>Você pode acompanhar o status do seu pedido na área "Meus Pedidos" do sistema.</p>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Prazo estimado: 5-10 dias úteis</li>
            <li>Você receberá o código de rastreamento por email</li>
          </ul>
        </div>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="text-align: center; color: #666; font-size: 12px;">
          📦 Sistema de Pedidos B2B<br>
          Obrigado pela sua compra!
        </p>
      </div>
    </body>
    </html>
  `;
};

// ══════════════════════════════════════════════════════════════
// TEMPLATE 3: EMAIL PARA ADMIN
// MOSTRA: TUDO + controle financeiro detalhado
// ══════════════════════════════════════════════════════════════
const gerarEmailAdmin = (pedido, fornecedor, distribuidor) => {
  const itensPorCategoria = organizarItensPorCategoria(pedido.itens);

  const htmlItens = Object.entries(itensPorCategoria)
    .map(([categoria, itens]) => {
      return `
        <div style="margin-bottom: 15px;">
          <h4 style="background: #e0e0e0; padding: 8px; margin: 0; border-radius: 4px; color: #333; font-size: 14px;">
            📂 ${categoria} (${itens.length} itens)
          </h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            ${itens
              .map(
                item => `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px;">${item.nome}</td>
                <td style="padding: 8px; text-align: center;">${item.quantidade}x</td>
                <td style="padding: 8px; text-align: right;">
                  Base: R$ ${item.precoUnitario.toFixed(2)}<br>
                  <span style="color: #666; font-size: 11px;">
                    Etiq: R$ ${(item.precoEtiqueta || 0).toFixed(2)} | 
                    Emb: R$ ${(item.precoEmbalagem || 0).toFixed(2)}
                  </span>
                </td>
              </tr>
            `
              )
              .join('')}
          </table>
        </div>
      `;
    })
    .join('');

  const totalAdmin =
    pedido.royalties + (pedido.totalEtiquetas || 0) + (pedido.totalEmbalagens || 0);

  // URL do painel (ajuste conforme necessário)
  const urlPainel = process.env.BASE_URL || 'https://seusite.com';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.4; color: #333; font-size: 14px; }
        .container { max-width: 700px; margin: 0 auto; padding: 15px; }
        .header { background: #9C27B0; color: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
        .section { background: #f8f9fa; padding: 12px; border-radius: 8px; margin: 10px 0; }
        .financial { background: #fff3e0; border: 2px solid #ff9800; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .admin-total { background: #f3e5f5; border: 2px solid #9C27B0; padding: 15px; border-radius: 8px; }
        .pending { color: #e65100; font-weight: bold; }
        .btn { display: inline-block; background: #9C27B0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 20px;">🆕 NOVO PEDIDO - ADMIN</h1>
          <p style="margin: 5px 0 0 0;">
            #${pedido._id.toString().slice(-8).toUpperCase()} | 
            ${new Date(pedido.createdAt || Date.now()).toLocaleString('pt-BR')}
          </p>
        </div>

        <!-- Dados Rápidos -->
        <table style="width: 100%; margin-bottom: 15px;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 5px;">
              <div style="background: #e3f2fd; padding: 12px; border-radius: 8px; height: 100%;">
                <strong>👤 Distribuidor</strong><br>
                ${distribuidor.nome}<br>
                <span style="font-size: 12px; color: #666;">${distribuidor.email}</span><br>
                <span style="font-size: 12px; color: #666;">${distribuidor.telefone || ''}</span>
              </div>
            </td>
            <td style="width: 50%; vertical-align: top; padding-left: 5px;">
              <div style="background: #e8f5e9; padding: 12px; border-radius: 8px; height: 100%;">
                <strong>🏭 Fornecedor</strong><br>
                ${fornecedor.nome}<br>
                <span style="font-size: 12px; color: #666;">${fornecedor.codigo} | ${fornecedor.email}</span>
              </div>
            </td>
          </tr>
        </table>

        <!-- Itens -->
        <div class="section">
          <h3 style="margin-top: 0; font-size: 16px;">📦 Itens</h3>
          ${htmlItens}
        </div>

        <!-- Financeiro Detalhado -->
        <div class="financial">
          <h3 style="margin-top: 0; color: #e65100;">💰 CONTROLE FINANCEIRO</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #fff;">
              <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Subtotal (Fornecedor)</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">R$ ${pedido.subtotal.toFixed(2)}</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center; color: #4CAF50;">→ Fornecedor</td>
            </tr>
            <tr style="background: #fafafa;">
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                <strong>Royalties (5%)</strong>
              </td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">R$ ${pedido.royalties.toFixed(2)}</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">
                <span class="pending">⏳ PENDENTE</span>
              </td>
            </tr>
            <tr style="background: #fff;">
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                <strong>Etiquetas</strong>
              </td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">R$ ${(pedido.totalEtiquetas || 0).toFixed(2)}</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">
                ${(pedido.totalEtiquetas || 0) > 0 ? '<span class="pending">⏳ PENDENTE</span>' : '<span style="color: #999;">-</span>'}
              </td>
            </tr>
            <tr style="background: #fafafa;">
              <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                <strong>Embalagens</strong>
              </td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">R$ ${(pedido.totalEmbalagens || 0).toFixed(2)}</td>
              <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">
                ${(pedido.totalEmbalagens || 0) > 0 ? '<span class="pending">⏳ PENDENTE</span>' : '<span style="color: #999;">-</span>'}
              </td>
            </tr>
          </table>
        </div>

        <!-- Resumo Admin -->
        <div class="admin-total">
          <h3 style="margin-top: 0; color: #9C27B0;">👑 SEU RECEBIMENTO (Admin)</h3>
          <table style="width: 100%;">
            <tr>
              <td>Royalties (5%):</td>
              <td style="text-align: right;">R$ ${pedido.royalties.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Etiquetas:</td>
              <td style="text-align: right;">R$ ${(pedido.totalEtiquetas || 0).toFixed(2)}</td>
            </tr>
            <tr>
              <td>Embalagens:</td>
              <td style="text-align: right;">R$ ${(pedido.totalEmbalagens || 0).toFixed(2)}</td>
            </tr>
            <tr style="border-top: 2px solid #9C27B0;">
              <td style="padding-top: 10px; font-weight: bold; font-size: 16px;">TOTAL A RECEBER:</td>
              <td style="padding-top: 10px; text-align: right; font-weight: bold; font-size: 20px; color: #9C27B0;">
                R$ ${totalAdmin.toFixed(2)}
              </td>
            </tr>
          </table>
          
          <!-- Link para o Painel -->
          <div style="text-align: center; margin-top: 15px;">
            <a href="${urlPainel}/admin/financeiro" class="btn" style="color: white;">
              💰 Abrir Controle Financeiro
            </a>
          </div>
        </div>

        <!-- Distribuidor Total -->
        <div class="section" style="background: #e8f5e9;">
          <p style="margin: 0;">
            <strong>💵 Total pago pelo Distribuidor:</strong> 
            <span style="font-size: 18px; font-weight: bold; color: #2c5530;">R$ ${pedido.total.toFixed(2)}</span>
          </p>
        </div>

        <!-- Endereço -->
        <div class="section">
          <strong>📍 Entrega:</strong>
          ${pedido.endereco.rua}, ${pedido.endereco.numero}
          ${pedido.endereco.complemento ? `, ${pedido.endereco.complemento}` : ''} - 
          ${pedido.endereco.bairro} - ${pedido.endereco.cidade}/${pedido.endereco.estado} - 
          CEP: ${pedido.endereco.cep}
        </div>

        <!-- Links Rápidos -->
        <div style="text-align: center; margin: 20px 0;">
          <a href="${urlPainel}/admin-pedidos" style="display: inline-block; background: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px;">
            📦 Ver Pedidos
          </a>
          <a href="${urlPainel}/admin/financeiro" style="display: inline-block; background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px;">
            💰 Financeiro
          </a>
        </div>

        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="text-align: center; color: #666; font-size: 11px;">
          Sistema de Pedidos B2B | Gerado automaticamente
        </p>
      </div>
    </body>
    </html>
  `;
};

// ══════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL: Enviar emails para todos
// ══════════════════════════════════════════════════════════════
export const enviarEmailsPedido = async (pedido, fornecedor, distribuidor) => {
  try {
    console.log('📧 Preparando envio de emails...');

    const emailsEnvio = [
      // 1. ADMIN - Template completo com controle financeiro
      {
        destinatario: process.env.ADMIN_EMAIL,
        assunto: `🆕 PEDIDO #${pedido._id.toString().slice(-8).toUpperCase()} - ${fornecedor.nome} - R$ ${pedido.total.toFixed(2)}`,
        html: gerarEmailAdmin(pedido, fornecedor, distribuidor),
        tipo: 'ADMIN',
      },
      // 2. FORNECEDOR - Template simples (só preço base)
      {
        destinatario: fornecedor.email,
        assunto: `📦 Novo Pedido de ${distribuidor.nome} - #${pedido._id.toString().slice(-8).toUpperCase()}`,
        html: gerarEmailFornecedor(pedido, fornecedor, distribuidor),
        tipo: 'FORNECEDOR',
      },
      // 3. DISTRIBUIDOR - Template com totais + pagamentos pendentes
      {
        destinatario: distribuidor.email || `${distribuidor.usuario}@distribuidora.com`,
        assunto: `✅ Pedido Confirmado - #${pedido._id.toString().slice(-8).toUpperCase()} - R$ ${pedido.total.toFixed(2)}`,
        html: gerarEmailDistribuidor(pedido, fornecedor, distribuidor),
        tipo: 'DISTRIBUIDOR',
      },
    ];

    const resultados = [];
    for (const email of emailsEnvio) {
      try {
        const info = await transporter.sendMail({
          from: `"Sistema B2B" <${process.env.EMAIL_USER}>`,
          to: email.destinatario,
          subject: email.assunto,
          html: email.html,
        });

        console.log(`✅ Email enviado para ${email.tipo}: ${email.destinatario}`);
        resultados.push({ tipo: email.tipo, sucesso: true, messageId: info.messageId });
      } catch (error) {
        console.error(`❌ Erro ao enviar para ${email.tipo}:`, error.message);
        resultados.push({ tipo: email.tipo, sucesso: false, erro: error.message });
      }
    }

    return {
      sucesso: true,
      resultados,
      totalEnviados: resultados.filter(r => r.sucesso).length,
    };
  } catch (error) {
    console.error('💥 Erro geral no envio de emails:', error);
    return { sucesso: false, erro: error.message };
  }
};

// Função de teste
export const testarEmail = async () => {
  try {
    const info = await transporter.sendMail({
      from: `"Teste Sistema" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: '🧪 Teste de Configuração de Email',
      html: `
        <div style="font-family: Arial; padding: 20px;">
          <h2>✅ Email Configurado com Sucesso!</h2>
          <p>Data/Hora: ${new Date().toLocaleString('pt-BR')}</p>
        </div>
      `,
    });
    return { sucesso: true, messageId: info.messageId };
  } catch (error) {
    return { sucesso: false, erro: error.message };
  }
};