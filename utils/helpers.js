// UTILS/HELPERS.JS - CORRIGIDO
// ===================================

// Formatação de moeda
export const formatCurrency = value => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Formatação de data
export const formatDate = date => {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Formatação de CEP
export const formatCEP = cep => {
  const cleaned = cep.replace(/\D/g, '');
  return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
};

// Formatação de telefone
export const formatPhone = phone => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
};

// Validação de email
export const validateEmail = email => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validação de CEP
export const validateCEP = cep => {
  const cleaned = cep.replace(/\D/g, '');
  return cleaned.length === 8;
};

// Calcular total do carrinho
export const calculateCartTotal = cart => {
  return cart.reduce((total, item) => total + item.preco * item.quantidade, 0);
};

// Calcular royalties
export const calculateRoyalties = (subtotal, percentage = 0.05) => {
  return subtotal * percentage;
};

// Gerar ID único simples
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Slug para URLs amigáveis
export const generateSlug = text => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

// Truncar texto
export const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
};

// Capitalizar primeira letra
export const capitalize = text => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

// Validar campos obrigatórios
export const validateRequiredFields = (data, requiredFields) => {
  const errors = {};

  requiredFields.forEach(field => {
    if (!data[field] || data[field].toString().trim() === '') {
      errors[field] = `${field} é obrigatório`;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Formatar endereço completo
export const formatFullAddress = endereco => {
  const { rua, numero, complemento, bairro, cidade, estado, cep } = endereco;

  let address = `${rua}, ${numero}`;
  if (complemento) address += `, ${complemento}`;
  address += ` - ${bairro} - ${cidade}`;
  if (cep) address += `, CEP: ${cep}`;

  return address;
};

// Debounce para buscas
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Verificar se é mobile
export const isMobile = () => {
  return typeof window !== 'undefined' && window.innerWidth < 768;
};

// Mascaras para inputs
export const masks = {
  cep: value => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
  },

  phone: value => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  },

  currency: value => {
    const cleaned = value.replace(/\D/g, '');
    const number = cleaned / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(number);
  },
};

// Status dos pedidos
export const orderStatus = {
  pendente: { label: 'Pendente', color: 'yellow', icon: '⏳' },
  confirmado: { label: 'Confirmado', color: 'blue', icon: '✅' },
  enviado: { label: 'Enviado', color: 'green', icon: '🚚' },
  entregue: { label: 'Entregue', color: 'green', icon: '📦' },
};

// Categorias de produtos
export const productCategories = [
  { value: 'Capas', label: 'Capas', icon: '🛡️' },
  { value: 'Decks', label: 'Decks', icon: '🏄' },
  { value: 'Leashes', label: 'Leashes', icon: '🔗' },
  { value: 'Acessórios', label: 'Acessórios', icon: '⚙️' },
];

// Estados brasileiros
export const brazilianStates = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];

// Configurações padrão
export const defaultSettings = {
  itemsPerPage: 12,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  royaltyPercentage: 0.05, // 5%
  currency: 'BRL',
  locale: 'pt-BR',
};
