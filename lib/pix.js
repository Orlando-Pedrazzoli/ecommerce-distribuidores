// lib/pix.js - PIX COPIA E COLA (BR CODE ESTÁTICO) SEM API EXTERNA
// ===================================
// Gera o código "Pix Copia e Cola" e o QR Code a partir de uma chave Pix e de
// um valor, seguindo o padrão BR Code do Banco Central (EMV QRCPS-MPM).
// Não fala com nenhum banco/PSP: o dinheiro vai direto para a chave e a
// confirmação é feita pelo comprovante que o distribuidor anexa.
//
// Só é importado por API routes (usa `crypto` e `qrcode`).

import crypto from 'crypto';
import QRCode from 'qrcode';

export const TIPOS_CHAVE = ['cpf', 'cnpj', 'email', 'telefone', 'aleatoria'];

export const ROTULO_TIPO_CHAVE = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'Email',
  telefone: 'Telefone',
  aleatoria: 'Chave aleatória',
};

// ══════════════════════════════════════════════════════════════
// VALIDAÇÃO DA CHAVE
// ══════════════════════════════════════════════════════════════
const cpfValido = cpf => {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const dv = n => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(cpf[i]) * (n + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return dv(9) === Number(cpf[9]) && dv(10) === Number(cpf[10]);
};

// Aceita também o CNPJ alfanumérico (12 posições A-Z/0-9 + 2 dígitos)
const cnpjValido = cnpj => {
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  const valor = ch => ch.charCodeAt(0) - 48;
  const dv = n => {
    const pesos =
      n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < n; i++) soma += valor(cnpj[i]) * pesos[i];
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return dv(12) === Number(cnpj[12]) && dv(13) === Number(cnpj[13]);
};

/**
 * Normaliza a chave para o formato que vai dentro do BR Code.
 * @returns {{ ok: true, chave: string } | { ok: false, erro: string }}
 */
export const normalizarChavePix = (tipo, chaveBruta) => {
  const chave = String(chaveBruta || '').trim();
  if (!TIPOS_CHAVE.includes(tipo)) return { ok: false, erro: 'Selecione o tipo da chave Pix' };
  if (!chave) return { ok: false, erro: 'Informe a chave Pix' };

  if (tipo === 'cpf') {
    const cpf = chave.replace(/\D/g, '');
    return cpfValido(cpf) ? { ok: true, chave: cpf } : { ok: false, erro: 'CPF da chave Pix inválido' };
  }
  if (tipo === 'cnpj') {
    const cnpj = chave.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return cnpjValido(cnpj)
      ? { ok: true, chave: cnpj }
      : { ok: false, erro: 'CNPJ da chave Pix inválido' };
  }
  if (tipo === 'email') {
    const email = chave.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 77
      ? { ok: true, chave: email }
      : { ok: false, erro: 'Email da chave Pix inválido' };
  }
  if (tipo === 'telefone') {
    let d = chave.replace(/\D/g, '');
    if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
    return d.length === 10 || d.length === 11
      ? { ok: true, chave: `+55${d}` }
      : { ok: false, erro: 'Telefone da chave Pix inválido (use DDD + número)' };
  }
  // aleatória (EVP)
  const evp = chave.toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(evp)
    ? { ok: true, chave: evp }
    : {
        ok: false,
        erro: 'Chave aleatória inválida (formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
      };
};

// O BR Code só aceita ASCII no nome e na cidade
export const textoPix = (valor, max) =>
  String(valor || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .trim();

/**
 * Valida e normaliza um conjunto { tipo, chave, titular, cidade }.
 * Chave vazia = "sem Pix configurado" (devolve dados: null).
 * @returns {{ ok: true, dados: object|null } | { ok: false, erro: string }}
 */
export const validarDadosPix = (entrada = {}) => {
  const chaveBruta = String(entrada?.chave || '').trim();
  if (!chaveBruta) return { ok: true, dados: null };

  const r = normalizarChavePix(String(entrada.tipo || ''), chaveBruta);
  if (!r.ok) return r;

  const titular = textoPix(entrada.titular, 25);
  if (!titular) return { ok: false, erro: 'Informe o nome do titular da conta Pix' };

  return {
    ok: true,
    dados: {
      tipo: entrada.tipo,
      chave: r.chave,
      titular,
      cidade: textoPix(entrada.cidade, 15) || 'BRASIL',
    },
  };
};

export const pixConfigurado = pix => Boolean(pix && pix.chave && TIPOS_CHAVE.includes(pix.tipo));

// ══════════════════════════════════════════════════════════════
// BR CODE
// ══════════════════════════════════════════════════════════════
const tlv = (id, valor) => `${id}${String(valor.length).padStart(2, '0')}${valor}`;

// CRC16-CCITT (polinómio 0x1021, valor inicial 0xFFFF)
export const crc16 = texto => {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

export const txidValido = txid => /^[A-Za-z0-9]{6,25}$/.test(String(txid || ''));

/** Identificador que aparece no extrato de quem recebe (máx. 25, só letras/números). */
export const gerarTxid = (prefixo = 'ESP') => {
  const tempo = Date.now().toString(36).toUpperCase();
  const acaso = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `${prefixo}${tempo}${acaso}`.replace(/[^A-Z0-9]/g, '').slice(0, 25);
};

/**
 * Monta o payload "Pix Copia e Cola".
 * @param {object} p
 * @param {string} p.chave   chave já normalizada
 * @param {string} p.nome    titular (máx. 25)
 * @param {string} p.cidade  cidade (máx. 15)
 * @param {number} [p.valor] valor em reais; sem valor, quem paga digita
 * @param {string} [p.txid]  identificador da transação
 */
export const gerarPayloadPix = ({ chave, nome, cidade, valor, txid }) => {
  if (!chave) throw new Error('Chave Pix não informada');
  const conta = tlv('00', 'br.gov.bcb.pix') + tlv('01', chave);
  if (conta.length > 99) throw new Error('Chave Pix longa demais');

  let payload = tlv('00', '01') + tlv('26', conta) + tlv('52', '0000') + tlv('53', '986');
  if (Number(valor) > 0) payload += tlv('54', Number(valor).toFixed(2));
  payload +=
    tlv('58', 'BR') +
    tlv('59', (nome || 'RECEBEDOR').slice(0, 25)) +
    tlv('60', (cidade || 'BRASIL').slice(0, 15)) +
    tlv('62', tlv('05', txidValido(txid) ? txid : '***')) +
    '6304';
  return payload + crc16(payload);
};

export const gerarQrSvg = payload =>
  QRCode.toString(payload, { type: 'svg', errorCorrectionLevel: 'M', margin: 2, width: 280 });

/**
 * Tudo o que a tela de pagamento precisa para uma cobrança.
 * @param {object} p
 * @param {{tipo:string,chave:string,titular:string,cidade:string}} p.pix
 * @param {number} p.valor
 * @param {string} [p.txid]    reutiliza um identificador já emitido
 * @param {string} [p.prefixo] prefixo de um identificador novo
 */
export const montarCobrancaPix = async ({ pix, valor, txid, prefixo }) => {
  const id = txidValido(txid) ? txid : gerarTxid(prefixo);
  const payload = gerarPayloadPix({
    chave: pix.chave,
    nome: textoPix(pix.titular, 25),
    cidade: textoPix(pix.cidade, 15),
    valor,
    txid: id,
  });
  return {
    valor,
    txid: id,
    payload,
    qrSvg: await gerarQrSvg(payload),
    chave: pix.chave,
    tipoChave: pix.tipo,
    tipoChaveRotulo: ROTULO_TIPO_CHAVE[pix.tipo] || 'Chave',
    titular: pix.titular,
  };
};
