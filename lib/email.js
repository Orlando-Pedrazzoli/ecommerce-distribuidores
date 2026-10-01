// LIB/EMAIL.JS - ATUALIZADO COM 3 TEMPLATES DIFERENTES
// ===================================
// FORNECEDOR: Apenas o preço dos produtos (NÃO vê royalties)
// DISTRIBUIDOR: Preço total + royalties detalhados + lembrete de pagamentos
// ADMIN: TUDO + links para controle financeiro
// SINAL: os três emails mostram o sinal pago por Pix; fornecedor e admin
//        recebem o comprovante em anexo.
// FOTOS: cada item aparece com a foto do produto (gravada no pedido em
//        itens[].imagem), para o fornecedor produzir exatamente o que foi pedido.

import { enviarEmail } from './mailer';

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
// HELPERS: Foto do produto em cada item
// ══════════════════════════════════════════════════════════════
const esc = valor =>
  String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Tamanho da foto (px) em cada email
const FOTO_FORNECEDOR = 150;
const FOTO_DISTRIBUIDOR = 110;
const FOTO_ADMIN = 64;

// O email só consegue mostrar imagens com endereço completo (https://...)
const urlFoto = url => {
  const u = String(url || '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('//')) return `https:${u}`;
  const base = (process.env.BASE_URL || '').replace(/\/$/, '');
  return u.startsWith('/') && base ? `${base}${u}` : '';
};

/** Foto quadrada do item; clicar abre a imagem em tamanho real. */
const fotoItem = (item, lado) => {
  const src = urlFoto(item.imagem);
  if (!src) {
    return `<div style="width: ${lado}px; height: ${lado}px; line-height: ${lado}px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center; color: #9ca3af; font-size: 11px;">sem foto</div>`;
  }
  return `<a href="${esc(src)}" target="_blank" title="Abrir a foto em tamanho real"><img src="${esc(src)}" width="${lado}" height="${lado}" alt="${esc(`Foto: ${item.nome} (${item.codigo})`)}" style="display: block; width: ${lado}px; height: ${lado}px; object-fit: contain; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;"></a>`;
};

/**
 * Linha de um item: foto à esquerda, dados à direita (lê-se bem no celular).
 * @param {object} item
 * @param {number} lado          tamanho da foto
 * @param {number} precoUnitario preço mostrado a quem recebe o email
 */
const linhaItemComFoto = (item, lado, precoUnitario) => `
                <tr>
                  <td style="padding: 12px 10px; border-bottom: 1px solid #eee; width: ${lado}px; vertical-align: top;">
                    ${fotoItem(item, lado)}
                  </td>
                  <td style="padding: 12px 10px; border-bottom: 1px solid #eee; vertical-align: top;">
                    <div style="font-size: 16px; font-weight: bold; color: #222;">${esc(item.nome)}</div>
                    <div style="color: #666; font-size: 13px; margin: 2px 0 10px 0;">Código: <strong>${esc(item.codigo)}</strong></div>
                    <div style="font-size: 14px;">Quantidade: <strong style="font-size: 20px;">${item.quantidade}</strong></div>
                    <div style="color: #666; font-size: 13px; margin-top: 6px;">
                      R$ ${precoUnitario.toFixed(2)} cada &middot;
                      <strong style="color: #2c5530; font-size: 14px;">R$ ${(item.quantidade * precoUnitario).toFixed(2)}</strong>
                    </div>
                  </td>
                </tr>
`;

// ══════════════════════════════════════════════════════════════
// HELPER: Bloco do sinal pago por Pix
// publico: 'fornecedor' | 'distribuidor' | 'admin'
// ══════════════════════════════════════════════════════════════
const temSinal = pedido =>
  Boolean(pedido.sinal && pedido.sinal.status !== 'nao_aplicavel' && pedido.sinal.valor > 0);

const blocoSinal = (pedido, publico) => {
  if (!temSinal(pedido)) return '';
  const { sinal } = pedido;
  const saldo = Math.max(0, (pedido.totalFornecedor || pedido.subtotal || 0) - sinal.valor);

  const textos = {
    fornecedor: `O distribuidor declarou ter pago o sinal por Pix para a sua chave. <strong>O comprovante segue em anexo</strong> &mdash; confira o crédito no seu extrato antes de iniciar o pedido.`,
    distribuidor: `Recebemos o comprovante do seu Pix. O fornecedor vai conferir o crédito e, se houver alguma divergência, entraremos em contato.`,
    admin: `Comprovante em anexo. Depois de o fornecedor confirmar o crédito, marque o sinal como conferido em Pedidos.`,
  };

  return `
        <div style="background: #ecfdf5; border: 2px solid #10b981; padding: 20px; border-radius: 8px; margin: 15px 0;">
          <h3 style="margin-top: 0; color: #047857;">✅ Sinal de ${sinal.percentual}% pago por Pix</h3>
          <table style="width: 100%;">
            <tr>
              <td style="padding: 6px 0;">Sinal pago:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold; font-size: 18px; color: #047857;">R$ ${sinal.valor.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0;">Saldo restante do pedido:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold;">R$ ${saldo.toFixed(2)}</td>
            </tr>
            ${
              sinal.txid
                ? `
            <tr>
              <td style="padding: 6px 0; color: #666; font-size: 13px;">Identificador do Pix:</td>
              <td style="padding: 6px 0; text-align: right; color: #666; font-size: 13px; font-family: monospace;">${sinal.txid}</td>
            </tr>`
                : ''
            }
          </table>
          <p style="margin: 12px 0 0 0; font-size: 13px; color: #065f46;">${textos[publico]}</p>
        </div>
  `;
};

// ══════════════════════════════════════════════════════════════
// TEMPLATE 1: EMAIL PARA FORNECEDOR
// MOSTRA APENAS: Preço base × quantidade
// NÃO MOSTRA: Royalties
// ══════════════════════════════════════════════════════════════
const gerarEmailFornecedor = (pedido, fornecedor, distribuidor) => {
  const itensPorCategoria = organizarItensPorCategoria(pedido.itens);

  // Gerar tabela de itens (APENAS preço base)
  const htmlItens = Object.entries(itensPorCategoria)
    .map(([categoria, itens]) => {
      const subtotalCategoria = itens.reduce(
        (acc, item) => acc + item.quantidade * item.precoUnitario,
        0,
      );

      return `
        <div style="margin-bottom: 20px;">
          <h4 style="background: #f0f0f0; padding: 10px; margin: 0; border-radius: 5px 5px 0 0; color: #333;">
            📂 ${categoria}
          </h4>
          <table style="width: 100%; border-collapse: collapse; background: white;">
            <tbody>
              ${itens.map(item => linhaItemComFoto(item, FOTO_FORNECEDOR, item.precoUnitario)).join('')}
            </tbody>
            <tfoot>
              <tr style="background: #f0f8ff;">
                <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">
                  Subtotal ${esc(categoria)}:
                  <span style="color: #2c5530; margin-left: 8px;">R$ ${subtotalCategoria.toFixed(2)}</span>
                </td>
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
      <meta name="viewport" content="width=device-width, initial-scale=1">
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

        ${blocoSinal(pedido, 'fornecedor')}

        <div class="section">
          <h3>🚚 Próximos Passos</h3>
          <ol style="margin: 0; padding-left: 20px;">
            <li>Confirme a disponibilidade dos produtos</li>
            <li>${
              temSinal(pedido)
                ? 'Confira o sinal no seu extrato (comprovante em anexo) e combine o saldo restante'
                : 'Processe o pagamento'
            }</li>
            <li>Separe os produtos e combine a entrega com o distribuidor</li>
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

  // Gerar tabela de itens
  const htmlItens = Object.entries(itensPorCategoria)
    .map(([categoria, itens]) => {
      const subtotalCategoria = itens.reduce(
        (acc, item) => acc + item.quantidade * item.precoUnitario,
        0,
      );

      return `
        <div style="margin-bottom: 20px;">
          <h4 style="background: #f0f0f0; padding: 10px; margin: 0; border-radius: 5px 5px 0 0; color: #333;">
            📂 ${categoria}
          </h4>
          <table style="width: 100%; border-collapse: collapse; background: white;">
            <tbody>
              ${itens.map(item => linhaItemComFoto(item, FOTO_DISTRIBUIDOR, item.precoUnitario)).join('')}
            </tbody>
            <tfoot>
              <tr style="background: #f0f8ff;">
                <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">
                  Subtotal ${esc(categoria)}:
                  <span style="color: #2c5530; margin-left: 8px;">R$ ${subtotalCategoria.toFixed(2)}</span>
                </td>
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
      <meta name="viewport" content="width=device-width, initial-scale=1">
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

        ${blocoSinal(pedido, 'distribuidor')}

        <!-- SEÇÃO DE PAGAMENTOS PENDENTES -->
        <div class="pagamentos">
          <h3 style="margin-top: 0; color: #e65100;">⚠️ Pagamentos Pendentes</h3>
          <p style="margin-bottom: 15px; color: #333;">
            Os royalties deste pedido estão pendentes de pagamento ao administrador:
          </p>
          <table style="width: 100%; background: white; border-radius: 5px;">
            <tr style="background: #fafafa;">
              <td style="padding: 10px; border-bottom: 1px solid #eee;">Royalties (5%)</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">R$ ${pedido.royalties.toFixed(2)}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
                <span style="background: #fff3e0; color: #e65100; padding: 3px 8px; border-radius: 10px; font-size: 12px;">⏳ Pendente</span>
              </td>
            </tr>
            <tr style="background: #fff3e0;">
              <td style="padding: 12px; font-weight: bold;">Total Pendente:</td>
              <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: #e65100;">R$ ${pedido.royalties.toFixed(2)}</td>
              <td></td>
            </tr>
          </table>
          <p style="margin-top: 15px; font-size: 13px; color: #666;">
            📱 Os royalties podem ser pagos por Pix (valor total ou parcial) na área <strong>"Pagamentos"</strong> do sistema.
          </p>
        </div>

        <div class="section">
          <h3>📱 Acompanhe seu Pedido</h3>
          <p>Você pode acompanhar o status do seu pedido na área "Meus Pedidos" do sistema.</p>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Prazo estimado: 5-10 dias úteis</li>
            <li>O status muda para "Confirmado" assim que o pedido for confirmado</li>
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
                <td style="padding: 8px; width: ${FOTO_ADMIN}px;">${fotoItem(item, FOTO_ADMIN)}</td>
                <td style="padding: 8px;">
                  ${esc(item.nome)}<br>
                  <span style="color: #666; font-size: 11px;">${esc(item.codigo)}</span>
                </td>
                <td style="padding: 8px; text-align: center;">${item.quantidade}x</td>
                <td style="padding: 8px; text-align: right;">
                  R$ ${item.precoUnitario.toFixed(2)}<br>
                  <span style="color: #666; font-size: 11px;">
                    Total: R$ ${(item.quantidade * item.precoUnitario).toFixed(2)}
                  </span>
                </td>
              </tr>
            `,
              )
              .join('')}
          </table>
        </div>
      `;
    })
    .join('');

  const totalAdmin = pedido.royalties;

  // URL do painel (ajuste conforme necessário)
  const urlPainel = (process.env.BASE_URL || '').replace(/\/$/, '');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
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
          </table>
        </div>

        ${blocoSinal(pedido, 'admin')}

        <!-- Resumo Admin -->
        <div class="admin-total">
          <h3 style="margin-top: 0; color: #9C27B0;">👑 SEU RECEBIMENTO (Admin)</h3>
          <table style="width: 100%;">
            <tr>
              <td>Royalties (5%):</td>
              <td style="text-align: right;">R$ ${pedido.royalties.toFixed(2)}</td>
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
// `anexos`: comprovante do Pix do sinal (vai para o admin e para o fornecedor)
export const enviarEmailsPedido = async (pedido, fornecedor, distribuidor, { anexos } = {}) => {
  try {
    console.log('📧 Preparando envio de emails...');

    const emailsEnvio = [
      // 1. ADMIN - Template completo com controle financeiro
      {
        destinatario: process.env.ADMIN_EMAIL,
        assunto: `🆕 PEDIDO #${pedido._id.toString().slice(-8).toUpperCase()} - ${fornecedor.nome} - R$ ${pedido.total.toFixed(2)}`,
        html: gerarEmailAdmin(pedido, fornecedor, distribuidor),
        tipo: 'ADMIN',
        anexos,
      },
      // 2. FORNECEDOR - Template simples (só preço base)
      // (emailsCopia configurados em /admin/fornecedores também recebem)
      {
        destinatario: [fornecedor.email, ...(fornecedor.emailsCopia || [])].filter(Boolean),
        assunto: `📦 Novo Pedido de ${distribuidor.nome} - #${pedido._id.toString().slice(-8).toUpperCase()}`,
        html: gerarEmailFornecedor(pedido, fornecedor, distribuidor),
        tipo: 'FORNECEDOR',
        anexos,
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
        const messageId = await enviarEmail({
          para: email.destinatario,
          assunto: email.assunto,
          html: email.html,
          anexos: email.anexos,
        });

        console.log(`✅ Email enviado para ${email.tipo}: ${email.destinatario}`);
        resultados.push({ tipo: email.tipo, sucesso: true, messageId });
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
    return { sucesso: false, erro: error.message };
  }
};

// Função de teste
export const testarEmail = async () => {
  try {
    const messageId = await enviarEmail({
      para: process.env.ADMIN_EMAIL,
      assunto: '🧪 Teste de Configuração de Email',
      html: `
        <div style="font-family: Arial; padding: 20px;">
          <h2>✅ Email Configurado com Sucesso!</h2>
          <p>Data/Hora: ${new Date().toLocaleString('pt-BR')}</p>
        </div>
      `,
    });
    return { sucesso: true, messageId };
  } catch (error) {
    return { sucesso: false, erro: error.message };
  }
};
