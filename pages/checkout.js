// PAGES/CHECKOUT.JS - COM CATEGORIAS ISENTAS DE ROYALTIES
// ===================================
// 3 steps: Endereço → Pagamento → Confirmar
// 🆕 Verifica categorias isentas de royalties por fornecedor

import { useState, useEffect } from 'react';
import { useCart } from '../pages/_app';
import Layout from '../components/Layout';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useToastContext } from '../pages/_app';

export default function Checkout() {
  const toast = useToastContext();
  const { cart, cartTotal, clearCart, cartCount } = useCart();
  const [user, setUser] = useState(null);
  const [endereco, setEndereco] = useState({
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    cep: '',
    estado: '',
  });
  const [enderecoOriginal, setEnderecoOriginal] = useState(null);
  const [formaPagamento, setFormaPagamento] = useState('boleto');
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);
  const [showSummary, setShowSummary] = useState(false);
  const router = useRouter();

  // 🆕 Estado para fornecedores com categorias isentas
  const [fornecedoresInfo, setFornecedoresInfo] = useState({});

  // Formato brasileiro de moeda
  const formatarMoeda = (valor) => {
    return `R$ ${(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  useEffect(() => {
    buscarDadosUsuario();
  }, []);

  // 🆕 Buscar informações dos fornecedores quando o carrinho mudar
  useEffect(() => {
    if (cart.length > 0) {
      buscarFornecedoresInfo();
    }
  }, [cart]);

  useEffect(() => {
    if (!loadingUser && cart.length === 0) {
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [cart.length, router, loadingUser]);

  const buscarDadosUsuario = async () => {
    try {
      setLoadingUser(true);
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        if (data.user.endereco) {
          setEndereco(data.user.endereco);
          setEnderecoOriginal(data.user.endereco);
        }
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      router.push('/');
    } finally {
      setLoadingUser(false);
    }
  };

  // 🆕 Buscar informações dos fornecedores (categorias isentas)
  const buscarFornecedoresInfo = async () => {
    try {
      const response = await fetch('/api/produtos/fornecedores-info');
      if (response.ok) {
        const data = await response.json();
        // Criar mapa de fornecedorId -> categoriasIsentas
        const info = {};
        (data.fornecedores || []).forEach(f => {
          info[f._id] = f.categoriasIsentasRoyalty || [];
        });
        setFornecedoresInfo(info);
      }
    } catch (error) {
      console.error('Erro ao buscar info dos fornecedores:', error);
    }
  };

  // 🆕 Verificar se item é isento de royalties
  const isItemIsentoRoyalty = (item) => {
    const fornecedorId = item.fornecedorId?._id || item.fornecedorId;
    const categoriasIsentas = fornecedoresInfo[fornecedorId] || [];
    return categoriasIsentas.includes(item.categoria);
  };

  const salvarEndereco = async novoEndereco => {
    try {
      const response = await fetch('/api/user/endereco', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endereco: novoEndereco }),
      });

      if (response.ok) {
        setEnderecoOriginal(novoEndereco);
        toast.success('Endereço atualizado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao salvar endereço:', error);
    }
  };

  const enderecoMudou = () => {
    if (!enderecoOriginal) return false;
    return JSON.stringify(endereco) !== JSON.stringify(enderecoOriginal);
  };

  // ══════════════════════════════════════════════════════════════
  // CÁLCULOS - 🆕 COM VERIFICAÇÃO DE ISENÇÃO
  // ══════════════════════════════════════════════════════════════

  // Função para calcular preço total de um item
  const getPrecoTotalItem = item => {
    return (item.preco || 0) + (item.precoEtiqueta || 0) + (item.precoEmbalagem || 0);
  };

  // Subtotal BASE (para cálculo de royalties)
  const subtotalBase = cart.reduce(
    (acc, item) => acc + (item.preco || 0) * item.quantidade,
    0
  );

  // 🆕 Subtotal APENAS de itens que pagam royalties (não isentos)
  const subtotalComRoyalty = cart.reduce((acc, item) => {
    if (isItemIsentoRoyalty(item)) {
      return acc;
    }
    return acc + (item.preco || 0) * item.quantidade;
  }, 0);

  // 🆕 Subtotal de itens isentos
  const subtotalIsento = subtotalBase - subtotalComRoyalty;

  // Total de etiquetas
  const totalEtiquetas = cart.reduce(
    (acc, item) => acc + (item.precoEtiqueta || 0) * item.quantidade,
    0
  );

  // Total de embalagens
  const totalEmbalagens = cart.reduce(
    (acc, item) => acc + (item.precoEmbalagem || 0) * item.quantidade,
    0
  );

  // Subtotal dos produtos (base + etiqueta + embalagem)
  const subtotalProdutos = subtotalBase + totalEtiquetas + totalEmbalagens;

  // 🆕 Royalties = 5% APENAS do subtotal COM royalties (não isentos)
  const royalties = subtotalComRoyalty * 0.05;

  // Total final
  const total = subtotalProdutos + royalties;

  // Organizar produtos por fornecedor e categoria
  const organizarProdutos = () => {
    const resultado = {};

    cart.forEach(item => {
      const fornecedorId = item.fornecedorId?._id || item.fornecedorId || 'unknown';
      const fornecedorNome = item.fornecedorId?.nome || 'Fornecedor não identificado';
      const categoria = item.categoria || 'Sem categoria';

      if (!resultado[fornecedorId]) {
        resultado[fornecedorId] = {
          nome: fornecedorNome,
          categorias: {},
          subtotalBase: 0,
          subtotalTotal: 0,
        };
      }

      if (!resultado[fornecedorId].categorias[categoria]) {
        resultado[fornecedorId].categorias[categoria] = {
          itens: [],
          subtotalBase: 0,
          subtotalTotal: 0,
          // 🆕 Flag se categoria é isenta
          isenta: isItemIsentoRoyalty(item),
        };
      }

      resultado[fornecedorId].categorias[categoria].itens.push(item);

      const itemPrecoBase = (item.preco || 0) * item.quantidade;
      const itemPrecoTotal = getPrecoTotalItem(item) * item.quantidade;

      resultado[fornecedorId].categorias[categoria].subtotalBase += itemPrecoBase;
      resultado[fornecedorId].categorias[categoria].subtotalTotal += itemPrecoTotal;
      resultado[fornecedorId].subtotalBase += itemPrecoBase;
      resultado[fornecedorId].subtotalTotal += itemPrecoTotal;
    });

    return resultado;
  };

  const produtosOrganizados = organizarProdutos();

  const validateEndereco = () => {
    const newErrors = {};

    if (!endereco.rua.trim()) newErrors.rua = 'Obrigatório';
    if (!endereco.numero.trim()) newErrors.numero = 'Obrigatório';
    if (!endereco.bairro.trim()) newErrors.bairro = 'Obrigatório';
    if (!endereco.cidade.trim()) newErrors.cidade = 'Obrigatório';
    if (!endereco.cep.trim()) newErrors.cep = 'Obrigatório';
    if (!endereco.estado.trim()) newErrors.estado = 'Obrigatório';

    const cepRegex = /^\d{5}-?\d{3}$/;
    if (endereco.cep && !cepRegex.test(endereco.cep)) {
      newErrors.cep = 'CEP inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatCEP = value => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const handleCEPChange = e => {
    const formatted = formatCEP(e.target.value);
    setEndereco({ ...endereco, cep: formatted });
  };

  const handleSubmit = async () => {
    if (!validateEndereco()) {
      toast.warning('Por favor, corrija os erros no endereço');
      setStep(1);
      return;
    }

    setLoading(true);

    try {
      if (enderecoMudou()) {
        await salvarEndereco(endereco);
      }

      const pedidosPromises = Object.entries(produtosOrganizados).map(
        async ([fornecedorId, dados]) => {
          const itensFormatados = [];

          Object.entries(dados.categorias).forEach(([categoria, catData]) => {
            catData.itens.forEach(item => {
              itensFormatados.push({
                produtoId: item._id,
                codigo: item.codigo,
                nome: item.nome,
                categoria: categoria,
                quantidade: item.quantidade,
                precoUnitario: item.preco || 0,
                precoEtiqueta: item.precoEtiqueta || 0,
                precoEmbalagem: item.precoEmbalagem || 0,
              });
            });
          });

          const pedidoData = {
            userId: user.id,
            itens: itensFormatados,
            fornecedorId,
            formaPagamento,
            endereco,
          };

          const response = await fetch('/api/pedidos/criar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pedidoData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao criar pedido');
          }

          return response.json();
        }
      );

      const resultados = await Promise.all(pedidosPromises);

      clearCart();

      toast.success(
        `Pedido realizado com sucesso!\n\n` +
          `Total: ${formatarMoeda(total)}\n\n` +
          `Emails foram enviados automaticamente.\n` +
          `Acompanhe o status em "Meus Pedidos".`,
        8000
      );

      router.push('/meus-pedidos');
    } catch (error) {
      console.error('Erro ao criar pedidos:', error);
      toast.error(`Erro ao processar pedido:\n\n${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // COMPONENTE: Resumo do Pedido
  // ══════════════════════════════════════════════════════════════
  function ResumoContent() {
    return (
      <>
        <h2 className='text-lg font-bold text-gray-800 mb-4'>
          Resumo do Pedido
        </h2>

        {/* Itens organizados */}
        <div className='space-y-3 mb-4 max-h-[40vh] overflow-y-auto'>
          {Object.entries(produtosOrganizados).map(([fornecedorId, dados]) => (
            <div
              key={fornecedorId}
              className='border border-gray-200 rounded-lg p-3'
            >
              <h3 className='font-medium text-gray-800 mb-2 text-sm border-b pb-2'>
                {dados.nome}
              </h3>

              {Object.entries(dados.categorias).map(([categoria, catData]) => (
                <div key={categoria} className='mb-2'>
                  <div className='bg-gray-50 px-2 py-1 rounded mb-1'>
                    <h4 className='text-xs font-semibold text-gray-600 flex items-center justify-between'>
                      <span className='flex items-center gap-1'>
                        {categoria}
                        {/* 🆕 Badge se categoria é isenta */}
                        {catData.isenta && (
                          <span className='bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium'>
                            Sem royalty
                          </span>
                        )}
                      </span>
                      <span className='text-gray-400'>
                        {catData.itens.length} {catData.itens.length === 1 ? 'item' : 'itens'}
                      </span>
                    </h4>
                  </div>

                  <div className='space-y-1 pl-2'>
                    {catData.itens.map((item, index) => {
                      const precoTotal = getPrecoTotalItem(item);
                      const subtotalItem = precoTotal * item.quantidade;

                      return (
                        <div
                          key={`${item._id}-${index}`}
                          className='flex justify-between items-start text-xs hover:bg-gray-50 p-1 rounded'
                        >
                          <div className='flex-1 mr-2'>
                            <p className='font-medium text-gray-800 truncate'>{item.nome}</p>
                            <p className='text-gray-500'>
                              {item.quantidade} × {formatarMoeda(precoTotal)}
                            </p>
                          </div>
                          <p className='font-bold text-green-600 whitespace-nowrap'>
                            {formatarMoeda(subtotalItem)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Subtotal do fornecedor */}
              <div className='border-t mt-2 pt-2 flex justify-between text-xs font-bold'>
                <span>Subtotal:</span>
                <span className='text-blue-600'>
                  {formatarMoeda(dados.subtotalTotal)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Totais Detalhados */}
        <div className='border-t border-gray-200 pt-3 space-y-2'>
          <div className='flex justify-between items-center text-sm'>
            <span className='text-gray-600'>Subtotal Produtos:</span>
            <span className='font-medium'>{formatarMoeda(subtotalBase)}</span>
          </div>

          {totalEtiquetas > 0 && (
            <div className='flex justify-between items-center text-sm text-gray-500'>
              <span>Etiquetas:</span>
              <span>+ {formatarMoeda(totalEtiquetas)}</span>
            </div>
          )}

          {totalEmbalagens > 0 && (
            <div className='flex justify-between items-center text-sm text-gray-500'>
              <span>Embalagens:</span>
              <span>+ {formatarMoeda(totalEmbalagens)}</span>
            </div>
          )}

          {/* 🆕 Mostrar royalties com info de isenção */}
          <div className='flex justify-between items-center text-sm text-gray-500'>
            <span className='flex items-center gap-1'>
              Royalties (5%)
              {subtotalIsento > 0 && (
                <span className='text-[10px] text-green-600'>*</span>
              )}
            </span>
            <span>+ {formatarMoeda(royalties)}</span>
          </div>

          <div className='flex justify-between items-center font-bold text-base border-t pt-2'>
            <span>Total:</span>
            <span className='text-green-600'>{formatarMoeda(total)}</span>
          </div>
        </div>

        {/* Info sobre royalties */}
        <div className='mt-3 pt-3 border-t'>
          <p className='text-xs text-gray-400 text-center'>
            Royalties calculados sobre o preço base pago ao fornecedor.
          </p>
          <p className='text-xs text-gray-400 text-center'>
            Etiquetas e embalagens são isentas de Royalties.
          </p>
          {/* 🆕 Info se há itens isentos */}
          {subtotalIsento > 0 && (
            <p className='text-xs text-green-600 text-center mt-1'>
              * Produtos isentos: {formatarMoeda(subtotalIsento)} (sem royalty)
            </p>
          )}
        </div>
      </>
    );
  }

  // Loading
  if (loadingUser) {
    return (
      <Layout>
        <div className='flex justify-center items-center h-64'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4'></div>
            <p className='text-gray-600 text-sm'>Carregando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Carrinho vazio
  if (cart.length === 0) {
    return (
      <Layout>
        <div className='max-w-2xl mx-auto px-4 py-12 text-center'>
          <div className='text-5xl mb-4'>🛒</div>
          <h1 className='text-2xl font-bold text-gray-800 mb-4'>
            Carrinho Vazio
          </h1>
          <p className='text-gray-600 mb-6 text-sm'>
            Seu carrinho está vazio. Adicione produtos para continuar.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className='bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition text-sm'
          >
            Continuar Comprando
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>Finalizar Pedido - Elite Surfing</title>
      </Head>
      <Layout>
        <div className='max-w-6xl mx-auto px-4 py-4 lg:py-6'>
          {/* Header Compacto */}
          <div className='text-center mb-4'>
            <h1 className='text-xl lg:text-2xl font-bold text-gray-800 mb-1'>
              Finalizar Pedido
            </h1>
            <p className='text-sm text-gray-600'>
              {user?.nome} • {cartCount} {cartCount === 1 ? 'item' : 'itens'} • 
              <span className='font-bold text-green-600 ml-1'>{formatarMoeda(total)}</span>
            </p>
          </div>

          {/* Progress Steps - Compacto */}
          <div className='mb-4 lg:mb-6'>
            <div className='flex justify-center'>
              <div className='flex items-center space-x-2'>
                {[
                  { num: 1, label: 'Endereço' },
                  { num: 2, label: 'Pagamento' },
                  { num: 3, label: 'Confirmar' },
                ].map(stepInfo => (
                  <div key={stepInfo.num} className='flex items-center'>
                    <div
                      className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        step >= stepInfo.num
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {step > stepInfo.num ? '✓' : stepInfo.num}
                    </div>
                    <span
                      className={`ml-1 text-xs ${
                        step >= stepInfo.num
                          ? 'text-blue-600 font-medium'
                          : 'text-gray-400'
                      } hidden sm:block`}
                    >
                      {stepInfo.label}
                    </span>
                    {stepInfo.num < 3 && (
                      <div
                        className={`w-6 h-px mx-2 ${
                          step > stepInfo.num ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile Summary Button */}
          <div className='lg:hidden mb-4'>
            <button
              onClick={() => setShowSummary(!showSummary)}
              className='w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium flex items-center justify-between text-sm'
            >
              <span>Ver Resumo</span>
              <span className='text-green-600 font-bold'>{formatarMoeda(total)}</span>
            </button>
          </div>

          {/* Mobile Summary Modal */}
          {showSummary && (
            <div className='lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end'>
              <div className='bg-white w-full max-h-[85vh] rounded-t-xl overflow-y-auto'>
                <div className='sticky top-0 bg-white border-b p-3 flex justify-between items-center'>
                  <h3 className='font-bold text-gray-800'>Resumo do Pedido</h3>
                  <button
                    onClick={() => setShowSummary(false)}
                    className='text-gray-500 hover:text-gray-700 text-xl'
                  >
                    ✕
                  </button>
                </div>
                <div className='p-4'>
                  <ResumoContent />
                </div>
              </div>
            </div>
          )}

          {/* Layout: Formulário menor + Resumo maior */}
          <div className='lg:grid lg:grid-cols-5 lg:gap-6'>
            {/* Formulário - 2 colunas */}
            <div className='lg:col-span-2 space-y-4'>
              {/* Step 1: Endereço - Compacto */}
              {step === 1 && (
                <div className='bg-white rounded-lg shadow-md p-4'>
                  <h2 className='text-base font-bold text-gray-800 mb-3 flex items-center gap-2'>
                    Endereço de Entrega
                  </h2>

                  <div className='space-y-3'>
                    {/* CEP e Estado na mesma linha */}
                    <div className='grid grid-cols-2 gap-3'>
                      <div>
                        <label className='block text-gray-600 text-xs mb-1'>CEP *</label>
                        <input
                          type='text'
                          value={endereco.cep}
                          onChange={handleCEPChange}
                          placeholder='00000-000'
                          maxLength='9'
                          className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                            errors.cep ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.cep && <p className='text-red-500 text-xs mt-0.5'>{errors.cep}</p>}
                      </div>
                      <div>
                        <label className='block text-gray-600 text-xs mb-1'>UF *</label>
                        <select
                          value={endereco.estado}
                          onChange={e => setEndereco({ ...endereco, estado: e.target.value })}
                          className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                            errors.estado ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value=''>Selecione</option>
                          {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(estado => (
                            <option key={estado} value={estado}>{estado}</option>
                          ))}
                        </select>
                        {errors.estado && <p className='text-red-500 text-xs mt-0.5'>{errors.estado}</p>}
                      </div>
                    </div>

                    {/* Rua e Número */}
                    <div className='grid grid-cols-4 gap-3'>
                      <div className='col-span-3'>
                        <label className='block text-gray-600 text-xs mb-1'>Rua *</label>
                        <input
                          type='text'
                          value={endereco.rua}
                          onChange={e => setEndereco({ ...endereco, rua: e.target.value })}
                          className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                            errors.rua ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.rua && <p className='text-red-500 text-xs mt-0.5'>{errors.rua}</p>}
                      </div>
                      <div>
                        <label className='block text-gray-600 text-xs mb-1'>Nº *</label>
                        <input
                          type='text'
                          value={endereco.numero}
                          onChange={e => setEndereco({ ...endereco, numero: e.target.value })}
                          className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                            errors.numero ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.numero && <p className='text-red-500 text-xs mt-0.5'>{errors.numero}</p>}
                      </div>
                    </div>

                    {/* Complemento e Bairro */}
                    <div className='grid grid-cols-2 gap-3'>
                      <div>
                        <label className='block text-gray-600 text-xs mb-1'>Complemento</label>
                        <input
                          type='text'
                          value={endereco.complemento}
                          onChange={e => setEndereco({ ...endereco, complemento: e.target.value })}
                          placeholder='Apto, bloco...'
                          className='w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500'
                        />
                      </div>
                      <div>
                        <label className='block text-gray-600 text-xs mb-1'>Bairro *</label>
                        <input
                          type='text'
                          value={endereco.bairro}
                          onChange={e => setEndereco({ ...endereco, bairro: e.target.value })}
                          className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                            errors.bairro ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.bairro && <p className='text-red-500 text-xs mt-0.5'>{errors.bairro}</p>}
                      </div>
                    </div>

                    {/* Cidade */}
                    <div>
                      <label className='block text-gray-600 text-xs mb-1'>Cidade *</label>
                      <input
                        type='text'
                        value={endereco.cidade}
                        onChange={e => setEndereco({ ...endereco, cidade: e.target.value })}
                        className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                          errors.cidade ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.cidade && <p className='text-red-500 text-xs mt-0.5'>{errors.cidade}</p>}
                    </div>
                  </div>

                  <button
                    onClick={() => { if (validateEndereco()) setStep(2); }}
                    className='w-full mt-4 bg-blue-500 text-white px-4 py-2.5 rounded-lg hover:bg-blue-600 transition text-sm font-medium'
                  >
                    Continuar →
                  </button>
                </div>
              )}

              {/* Step 2: Pagamento - Compacto */}
              {step === 2 && (
                <div className='bg-white rounded-lg shadow-md p-4'>
                  <h2 className='text-base font-bold text-gray-800 mb-3'>
                    Forma de Pagamento
                  </h2>

                  <div className='grid grid-cols-2 gap-3 mb-4'>
                    <label
                      className={`border-2 rounded-lg p-3 cursor-pointer transition ${
                        formaPagamento === 'boleto'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type='radio'
                        name='pagamento'
                        value='boleto'
                        checked={formaPagamento === 'boleto'}
                        onChange={e => setFormaPagamento(e.target.value)}
                        className='sr-only'
                      />
                      <div className='text-center'>
                        <div className='text-2xl mb-1'>💳</div>
                        <h3 className='font-bold text-sm'>Boleto</h3>
                      </div>
                    </label>

                    <label
                      className={`border-2 rounded-lg p-3 cursor-pointer transition ${
                        formaPagamento === 'transferencia'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type='radio'
                        name='pagamento'
                        value='transferencia'
                        checked={formaPagamento === 'transferencia'}
                        onChange={e => setFormaPagamento(e.target.value)}
                        className='sr-only'
                      />
                      <div className='text-center'>
                        <div className='text-2xl mb-1'>🏦</div>
                        <h3 className='font-bold text-sm'>Transferência</h3>
                      </div>
                    </label>
                  </div>

                  <div className='flex gap-3'>
                    <button
                      onClick={() => setStep(1)}
                      className='flex-1 bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-300 transition text-sm'
                    >
                      ← Voltar
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      className='flex-1 bg-blue-500 text-white px-4 py-2.5 rounded-lg hover:bg-blue-600 transition text-sm font-medium'
                    >
                      Revisar →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirmação - Compacto */}
              {step === 3 && (
                <div className='bg-white rounded-lg shadow-md p-4'>
                  <h2 className='text-base font-bold text-gray-800 mb-3'>
                    Confirmação
                  </h2>

                  <div className='space-y-2 mb-4'>
                    {/* Cliente */}
                    <div className='p-2 bg-gray-50 rounded-lg text-sm'>
                      <span className='font-medium'>Cliente:</span> {user?.nome}
                    </div>

                    {/* Endereço */}
                    <div className='p-2 bg-gray-50 rounded-lg text-sm'>
                      <span className='font-medium'>Endereço:</span><br/>
                      <span className='text-gray-600 text-xs'>
                        {endereco.rua}, {endereco.numero}
                        {endereco.complemento && `, ${endereco.complemento}`} - {endereco.bairro}, {endereco.cidade}/{endereco.estado} - CEP: {endereco.cep}
                      </span>
                    </div>

                    {/* Pagamento */}
                    <div className='p-2 bg-gray-50 rounded-lg text-sm'>
                      <span className='font-medium'>Pagamento:</span> {formaPagamento === 'boleto' ? 'Boleto' : 'Transferência'}
                    </div>

                    {/* Total */}
                    <div className='p-3 bg-green-50 border border-green-200 rounded-lg'>
                      <div className='flex justify-between items-center'>
                        <span className='font-bold text-sm'>Total:</span>
                        <span className='font-bold text-lg text-green-600'>{formatarMoeda(total)}</span>
                      </div>
                    </div>
                  </div>

                  <div className='flex gap-3'>
                    <button
                      onClick={() => setStep(2)}
                      className='flex-1 bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-300 transition text-sm'
                    >
                      ← Voltar
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className='flex-1 bg-green-500 text-white px-4 py-2.5 rounded-lg hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium'
                    >
                      {loading ? (
                        <>
                          <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                          Processando...
                        </>
                      ) : (
                        'Finalizar Pedido'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Resumo - 3 colunas (maior) */}
            <div className='hidden lg:block lg:col-span-3'>
              <div className='bg-white rounded-lg shadow-md p-5 sticky top-4'>
                <ResumoContent />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}