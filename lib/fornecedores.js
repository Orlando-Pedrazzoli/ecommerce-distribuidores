// lib/fornecedores.js - VALIDAÇÃO E NORMALIZAÇÃO DE FORNECEDORES
// ===================================
// Partilhado pelas API routes de criação e edição.

const CODIGO_REGEX = /^[A-Z0-9]{1,6}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COR_REGEX = /^#[0-9a-fA-F]{6}$/;

const limparLista = valor => {
  const arr = Array.isArray(valor)
    ? valor
    : String(valor || '')
        .split(/[\n,]/)
        .map(s => s.trim());
  const vistos = new Set();
  return arr
    .map(s => String(s || '').trim())
    .filter(s => {
      if (!s) return false;
      const k = s.toLowerCase();
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });
};

const numeroOuNulo = v => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Valida o corpo do pedido. Devolve a mensagem de erro ou null.
 * @param {object} body
 * @param {{ novo?: boolean }} opts  novo=true exige código
 */
export const validarFornecedor = (body = {}, { novo } = {}) => {
  if (novo) {
    const codigo = String(body.codigo || '')
      .trim()
      .toUpperCase();
    if (!CODIGO_REGEX.test(codigo)) {
      return 'Código inválido: use 1 a 6 letras ou números (ex.: A, WKM, F01)';
    }
  }
  if (!String(body.nome || '').trim()) return 'Nome é obrigatório';
  if (!EMAIL_REGEX.test(String(body.email || '').trim())) return 'Email inválido';

  const copias = limparLista(body.emailsCopia);
  const invalido = copias.find(e => !EMAIL_REGEX.test(e));
  if (invalido) return `Email em cópia inválido: ${invalido}`;

  if (body.cor && !COR_REGEX.test(String(body.cor).trim()))
    return 'Cor inválida (use o formato #RRGGBB)';

  const categorias = limparLista(body.categorias);
  const isentas = limparLista(body.categoriasIsentasRoyalty);
  const foraDaLista = isentas.find(c => !categorias.some(x => x.toLowerCase() === c.toLowerCase()));
  if (foraDaLista) {
    return `A categoria isenta "${foraDaLista}" não existe na lista de categorias do fornecedor`;
  }

  if (
    body.pedidoMinimo !== undefined &&
    body.pedidoMinimo !== '' &&
    Number(body.pedidoMinimo) < 0
  ) {
    return 'Pedido mínimo não pode ser negativo';
  }
  if (
    body.prazoEntregaDias !== undefined &&
    body.prazoEntregaDias !== '' &&
    Number(body.prazoEntregaDias) < 0
  ) {
    return 'Prazo de entrega não pode ser negativo';
  }
  return null;
};

/** Copia os campos editáveis do body para o documento (não toca no código). */
export const aplicarCampos = (doc, body = {}) => {
  const texto = (campo, max = 500) => {
    if (body[campo] === undefined) return;
    doc[campo] = String(body[campo] || '')
      .trim()
      .slice(0, max);
  };

  texto('nome', 120);
  if (body.email !== undefined) doc.email = String(body.email).trim().toLowerCase();
  if (body.emailsCopia !== undefined)
    doc.emailsCopia = limparLista(body.emailsCopia).map(e => e.toLowerCase());
  texto('telefone', 40);
  texto('whatsapp', 40);
  texto('responsavel', 120);
  texto('cnpj', 30);
  texto('cidade', 80);
  texto('estado', 2);
  if (body.estado !== undefined) doc.estado = doc.estado.toUpperCase();

  texto('especialidade', 120);
  texto('descricao', 300);
  if (body.cor !== undefined)
    doc.cor = body.cor ? String(body.cor).trim().toLowerCase() : '#374151';
  if (body.logo !== undefined) doc.logo = String(body.logo || '').trim();
  if (body.ordem !== undefined) doc.ordem = numeroOuNulo(body.ordem) ?? 0;

  if (body.categorias !== undefined) doc.categorias = limparLista(body.categorias);
  if (body.categoriasIsentasRoyalty !== undefined) {
    doc.categoriasIsentasRoyalty = limparLista(body.categoriasIsentasRoyalty);
  }

  if (body.prazoEntregaDias !== undefined)
    doc.prazoEntregaDias = numeroOuNulo(body.prazoEntregaDias);
  if (body.pedidoMinimo !== undefined) doc.pedidoMinimo = numeroOuNulo(body.pedidoMinimo) ?? 0;
  texto('observacoes', 2000);

  if (body.ativo !== undefined) doc.ativo = Boolean(body.ativo);
  return doc;
};

/** Campos públicos (o que o distribuidor vê no portal) */
export const fornecedorPublico = f => ({
  _id: f._id,
  nome: f.nome,
  codigo: f.codigo,
  especialidade: f.especialidade || '',
  descricao: f.descricao || '',
  cor: f.cor || '#374151',
  logo: f.logo || '',
  ordem: f.ordem || 0,
  categorias: f.categorias || [],
  categoriasIsentasRoyalty: f.categoriasIsentasRoyalty || [],
  prazoEntregaDias: f.prazoEntregaDias ?? null,
  pedidoMinimo: f.pedidoMinimo || 0,
});
