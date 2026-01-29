// PAGES/CHECKOUT.JS - SIMPLIFICADO (SEM OPÇÃO COM/SEM NF)
// ===================================
// Removido: Step de escolha de tipo de preço
// 3 steps: Endereço → Pagamento → Confirmar

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

  useEffect(() => {
    buscarDadosUsuario();
  }, []);

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

  const salvarEndereco = async novoEndereco => {
    try {
      const response = await fetch('/api/user/endereco', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endereco: novoEndereco }),
      });

      if (response.ok) {
        setEnderecoOriginal(novoEndereco);
        toast.success('📍 Endereço atualizado com sucesso!');
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
  // CÁLCULOS SIMPLIFICADOS
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

  // Royalties = 5% APENAS do subtotal BASE
  const royalties = subtotalBase * 0.05;

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

    if (!endereco.rua.trim()) newErrors.rua = 'Rua é obrigatória';
    if (!endereco.numero.trim()) newErrors.numero = 'Número é obrigatório';
    if (!endereco.bairro.trim()) newErrors.bairro = 'Bairro é obrigatório';
    if (!endereco.cidade.trim()) newErrors.cidade = 'Cidade é obrigatória';
    if (!endereco.cep.trim()) newErrors.cep = 'CEP é obrigatório';
    if (!endereco.estado.trim()) newErrors.estado = 'Estado é obrigatório';

    const cepRegex = /^\d{5}-?\d{3}$/;
    if (endereco.cep && !cepRegex.test(endereco.cep)) {
      newErrors.cep = 'CEP inválido (formato: 00000-000)';
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

          console.log('📦 Enviando pedido:', {
            fornecedor: dados.nome,
            itens: itensFormatados.length,
          });

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
      console.log('✅ Todos os pedidos criados:', resultados);

      clearCart();

      toast.success(
        `🎉 Pedido realizado com sucesso!\n\n` +
          `💵 Total: R$ ${total.toFixed(2)}\n\n` +
          `📧 Emails foram enviados automaticamente.\n` +
          `Acompanhe o status em "Meus Pedidos".`,
        8000
      );

      router.push('/meus-pedidos');
    } catch (error) {
      console.error('💥 Erro ao criar pedidos:', error);
      toast.error(`❌ Erro ao processar pedido:\n\n${error.message}`);
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
        <h2 className='text-lg sm:text-xl font-bold text-gray-800 mb-4'>
          Resumo do Pedido
        </h2>

        {/* Itens organizados */}
        <div className='space-y-4 mb-6 max-h-80 sm:max-h-96 overflow-y-auto'>
          {Object.entries(produtosOrganizados).map(([fornecedorId, dados]) => (
            <div
              key={fornecedorId}
              className='border border-gray-200 rounded-lg p-3 sm:p-4'
            >
              <h3 className='font-medium text-gray-800 mb-3 text-sm sm:text-base border-b pb-2'>
                {dados.nome}
              </h3>

              {Object.entries(dados.categorias).map(([categoria, catData]) => (
                <div key={categoria} className='mb-3'>
                  <div className='bg-gray-50 px-2 sm:px-3 py-1.5 sm:py-2 rounded mb-2'>
                    <h4 className='text-xs sm:text-sm font-semibold text-gray-700 flex items-center justify-between'>
                      <span>📂 {categoria}</span>
                      <span className='text-gray-500 text-xs'>
                        ({catData.itens.length}{' '}
                        {catData.itens.length === 1 ? 'item' : 'itens'})
                      </span>
                    </h4>
                  </div>

                  <div className='space-y-2 pl-2 sm:pl-3'>
                    {catData.itens.map((item, index) => {
                      const precoTotal = getPrecoTotalItem(item);
                      const subtotalItem = precoTotal * item.quantidade;

                      return (
                        <div
                          key={`${item._id}-${index}`}
                          className='flex justify-between items-start text-xs sm:text-sm hover:bg-gray-50 p-1.5 sm:p-2 rounded'
                        >
                          <div className='flex-1 mr-2 sm:mr-4'>
                            <p className='font-medium text-gray-900'>{item.nome}</p>
                            <p className='text-gray-600 text-xs mt-0.5 sm:mt-1'>
                              Qtd: {item.quantidade} × R$ {precoTotal.toFixed(2)}
                            </p>
                          </div>
                          <p className='font-bold text-green-600 text-right whitespace-nowrap'>
                            R$ {subtotalItem.toFixed(2)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Subtotal do fornecedor */}
              <div className='border-t mt-2 pt-2 bg-blue-50 -mx-3 sm:-mx-4 px-3 sm:px-4 pb-2 sm:pb-3 rounded-b'>
                <div className='flex justify-between text-xs sm:text-sm font-bold text-gray-800'>
                  <span>Total {dados.nome}:</span>
                  <span className='text-blue-600'>
                    R$ {dados.subtotalTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Totais */}
        <div className='border-t border-gray-200 pt-4 space-y-2'>
          <div className='flex justify-between items-center text-sm'>
            <span className='text-gray-600'>Subtotal Produtos:</span>
            <span>R$ {subtotalProdutos.toFixed(2)}</span>
          </div>
          <div className='flex justify-between items-center text-sm text-gray-500'>
            <span>Taxa de serviço (5%):</span>
            <span>R$ {royalties.toFixed(2)}</span>
          </div>
          <div className='flex justify-between items-center font-bold text-base sm:text-lg border-t pt-2'>
            <span>Total:</span>
            <span className='text-green-600'>R$ {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Informações */}
        <div className='mt-4 sm:mt-6 space-y-2 sm:space-y-3'>
          <div className='p-2 sm:p-3 bg-blue-50 rounded-lg'>
            <h4 className='font-medium text-blue-800 mb-1 sm:mb-2 text-xs sm:text-sm'>
              📦 Informações de Entrega
            </h4>
            <ul className='text-xs text-blue-700 space-y-0.5 sm:space-y-1'>
              <li>• Prazo: 5-10 dias úteis</li>
              <li>• Frete por conta do fornecedor</li>
            </ul>
          </div>
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
            <div className='animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-blue-500 mx-auto mb-4'></div>
            <p className='text-gray-600 text-sm sm:text-base'>Carregando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Carrinho vazio
  if (cart.length === 0) {
    return (
      <Layout>
        <div className='max-w-2xl mx-auto px-4 py-12 sm:py-16 text-center'>
          <div className='text-5xl sm:text-6xl mb-4'>🛒</div>
          <h1 className='text-2xl sm:text-3xl font-bold text-gray-800 mb-4'>
            Carrinho Vazio
          </h1>
          <p className='text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base'>
            Seu carrinho está vazio. Adicione produtos para continuar.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className='bg-blue-500 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg hover:bg-blue-600 transition text-sm sm:text-base'
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
        <title>Finalizar Pedido</title>
      </Head>
      <Layout>
        <div className='max-w-6xl mx-auto px-4 py-4 lg:py-8'>
          {/* Header */}
          <div className='text-center mb-4 sm:mb-6 lg:mb-8'>
            <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-2'>
              Finalizar Pedido
            </h1>
            <p className='text-xs sm:text-sm lg:text-base text-gray-600'>
              <span className='font-medium'>{user?.nome}</span> • {cartCount}{' '}
              {cartCount === 1 ? 'item' : 'itens'}
            </p>
            <p className='text-lg sm:text-xl font-bold text-green-600 mt-1'>
              Total: R$ {total.toFixed(2)}
            </p>
          </div>

          {/* Progress Steps - 3 STEPS */}
          <div className='mb-4 sm:mb-6 lg:mb-8 overflow-x-auto'>
            <div className='flex justify-center min-w-max px-2 sm:px-4'>
              <div className='flex items-center space-x-2 sm:space-x-4'>
                {[
                  { num: 1, label: 'Endereço', icon: '📍' },
                  { num: 2, label: 'Pagamento', icon: '💳' },
                  { num: 3, label: 'Confirmar', icon: '✅' },
                ].map(stepInfo => (
                  <div key={stepInfo.num} className='flex items-center'>
                    <div
                      className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-xs sm:text-base ${
                        step >= stepInfo.num
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {step > stepInfo.num ? '✓' : stepInfo.icon}
                    </div>
                    <span
                      className={`ml-1 sm:ml-2 text-xs sm:text-sm ${
                        step >= stepInfo.num
                          ? 'text-blue-600 font-medium'
                          : 'text-gray-500'
                      } ${step === stepInfo.num ? 'block' : 'hidden sm:block'}`}
                    >
                      {stepInfo.label}
                    </span>
                    {stepInfo.num < 3 && (
                      <div
                        className={`w-6 sm:w-8 h-px mx-2 sm:mx-4 ${
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
              className='w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium flex items-center justify-between text-sm'
            >
              <span>📋 Ver Resumo do Pedido</span>
              <span className='text-green-600 font-bold'>R$ {total.toFixed(2)}</span>
            </button>
          </div>

          {/* Mobile Summary Modal */}
          {showSummary && (
            <div className='lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end'>
              <div className='bg-white w-full max-h-[80vh] rounded-t-xl overflow-y-auto'>
                <div className='sticky top-0 bg-white border-b p-4 flex justify-between items-center'>
                  <h3 className='font-bold text-gray-800'>Resumo do Pedido</h3>
                  <button
                    onClick={() => setShowSummary(false)}
                    className='text-gray-500 hover:text-gray-700 text-2xl'
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

          <div className='lg:grid lg:grid-cols-3 lg:gap-8'>
            {/* Formulário */}
            <div className='lg:col-span-2 space-y-4 sm:space-y-6'>
              {/* Step 1: Endereço */}
              {step === 1 && (
                <div className='bg-white rounded-lg shadow-md p-4 sm:p-6'>
                  <h2 className='text-base sm:text-lg lg:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2'>
                    <span>📍</span>
                    Endereço de Entrega
                  </h2>

                  <div className='space-y-3 sm:space-y-4'>
                    {/* CEP */}
                    <div>
                      <label className='block text-gray-700 font-medium mb-1.5 sm:mb-2 text-sm'>
                        CEP *
                      </label>
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
                      {errors.cep && (
                        <p className='text-red-500 text-xs mt-1'>{errors.cep}</p>
                      )}
                    </div>

                    {/* Rua e Número */}
                    <div className='grid grid-cols-3 gap-3 sm:gap-4'>
                      <div className='col-span-2'>
                        <label className='block text-gray-700 font-medium mb-1.5 sm:mb-2 text-sm'>
                          Rua *
                        </label>
                        <input
                          type='text'
                          value={endereco.rua}
                          onChange={e =>
                            setEndereco({ ...endereco, rua: e.target.value })
                          }
                          className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                            errors.rua ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.rua && (
                          <p className='text-red-500 text-xs mt-1'>{errors.rua}</p>
                        )}
                      </div>
                      <div>
                        <label className='block text-gray-700 font-medium mb-1.5 sm:mb-2 text-sm'>
                          Nº *
                        </label>
                        <input
                          type='text'
                          value={endereco.numero}
                          onChange={e =>
                            setEndereco({ ...endereco, numero: e.target.value })
                          }
                          className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                            errors.numero ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.numero && (
                          <p className='text-red-500 text-xs mt-1'>{errors.numero}</p>
                        )}
                      </div>
                    </div>

                    {/* Complemento e Bairro */}
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
                      <div>
                        <label className='block text-gray-700 font-medium mb-1.5 sm:mb-2 text-sm'>
                          Complemento
                        </label>
                        <input
                          type='text'
                          value={endereco.complemento}
                          onChange={e =>
                            setEndereco({ ...endereco, complemento: e.target.value })
                          }
                          placeholder='Apto, bloco...'
                          className='w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500'
                        />
                      </div>
                      <div>
                        <label className='block text-gray-700 font-medium mb-1.5 sm:mb-2 text-sm'>
                          Bairro *
                        </label>
                        <input
                          type='text'
                          value={endereco.bairro}
                          onChange={e =>
                            setEndereco({ ...endereco, bairro: e.target.value })
                          }
                          className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                            errors.bairro ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.bairro && (
                          <p className='text-red-500 text-xs mt-1'>{errors.bairro}</p>
                        )}
                      </div>
                    </div>

                    {/* Cidade e Estado */}
                    <div className='grid grid-cols-3 gap-3 sm:gap-4'>
                      <div className='col-span-2'>
                        <label className='block text-gray-700 font-medium mb-1.5 sm:mb-2 text-sm'>
                          Cidade *
                        </label>
                        <input
                          type='text'
                          value={endereco.cidade}
                          onChange={e =>
                            setEndereco({ ...endereco, cidade: e.target.value })
                          }
                          className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                            errors.cidade ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.cidade && (
                          <p className='text-red-500 text-xs mt-1'>{errors.cidade}</p>
                        )}
                      </div>
                      <div>
                        <label className='block text-gray-700 font-medium mb-1.5 sm:mb-2 text-sm'>
                          UF *
                        </label>
                        <select
                          value={endereco.estado}
                          onChange={e =>
                            setEndereco({ ...endereco, estado: e.target.value })
                          }
                          className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
                            errors.estado ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value=''>UF</option>
                          {[
                            'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
                            'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
                            'RS','RO','RR','SC','SP','SE','TO',
                          ].map(estado => (
                            <option key={estado} value={estado}>
                              {estado}
                            </option>
                          ))}
                        </select>
                        {errors.estado && (
                          <p className='text-red-500 text-xs mt-1'>{errors.estado}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className='flex justify-end mt-4 sm:mt-6'>
                    <button
                      onClick={() => {
                        if (validateEndereco()) setStep(2);
                      }}
                      className='w-full sm:w-auto bg-blue-500 text-white px-6 py-2.5 rounded-lg hover:bg-blue-600 transition text-sm'
                    >
                      Continuar para Pagamento →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Pagamento */}
              {step === 2 && (
                <div className='bg-white rounded-lg shadow-md p-4 sm:p-6'>
                  <h2 className='text-base sm:text-lg lg:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2'>
                    <span>💳</span>
                    Forma de Pagamento
                  </h2>

                  <div className='grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6'>
                    <label
                      className={`border-2 rounded-lg p-3 sm:p-4 lg:p-6 cursor-pointer transition ${
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
                        <div className='text-2xl sm:text-3xl mb-2'>💳</div>
                        <h3 className='font-bold text-sm sm:text-base lg:text-lg mb-1'>
                          Boleto
                        </h3>
                        <p className='text-xs text-gray-600 hidden sm:block'>
                          Pagamento via boleto
                        </p>
                      </div>
                    </label>

                    <label
                      className={`border-2 rounded-lg p-3 sm:p-4 lg:p-6 cursor-pointer transition ${
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
                        <div className='text-2xl sm:text-3xl mb-2'>🏦</div>
                        <h3 className='font-bold text-sm sm:text-base lg:text-lg mb-1'>
                          Transferência
                        </h3>
                        <p className='text-xs text-gray-600 hidden sm:block'>
                          Transferência bancária
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className='flex flex-col sm:flex-row gap-3'>
                    <button
                      onClick={() => setStep(1)}
                      className='w-full sm:w-auto bg-gray-500 text-white px-6 py-2.5 rounded-lg hover:bg-gray-600 transition text-sm order-2 sm:order-1'
                    >
                      ← Voltar
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      className='w-full sm:flex-1 bg-blue-500 text-white px-6 py-2.5 rounded-lg hover:bg-blue-600 transition text-sm order-1 sm:order-2'
                    >
                      Revisar Pedido →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirmação */}
              {step === 3 && (
                <div className='bg-white rounded-lg shadow-md p-4 sm:p-6'>
                  <h2 className='text-base sm:text-lg lg:text-xl font-bold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2'>
                    <span>✅</span>
                    Confirmação do Pedido
                  </h2>

                  <div className='space-y-3 mb-4 sm:mb-6'>
                    {/* Dados do Pedido */}
                    <div className='p-3 bg-gray-50 rounded-lg'>
                      <h3 className='font-medium mb-2 text-sm'>👤 Cliente:</h3>
                      <p className='text-xs sm:text-sm text-gray-700'>
                        <strong>{user?.nome}</strong>
                        <br />
                        {user?.email}
                      </p>
                    </div>

                    {/* Endereço */}
                    <div className='p-3 bg-gray-50 rounded-lg'>
                      <h3 className='font-medium mb-2 text-sm'>📍 Endereço:</h3>
                      <p className='text-xs sm:text-sm text-gray-700'>
                        {endereco.rua}, {endereco.numero}
                        {endereco.complemento && `, ${endereco.complemento}`}
                        <br />
                        {endereco.bairro} - {endereco.cidade}/{endereco.estado}
                        <br />
                        CEP: {endereco.cep}
                      </p>
                    </div>

                    {/* Pagamento */}
                    <div className='p-3 bg-gray-50 rounded-lg'>
                      <h3 className='font-medium mb-2 text-sm'>💳 Pagamento:</h3>
                      <p className='text-xs sm:text-sm text-gray-700'>
                        {formaPagamento === 'boleto'
                          ? '💳 Boleto Bancário'
                          : '🏦 Transferência Bancária'}
                      </p>
                    </div>

                    {/* Total */}
                    <div className='p-3 bg-green-50 border border-green-200 rounded-lg'>
                      <div className='flex justify-between items-center'>
                        <span className='font-bold text-sm sm:text-base'>
                          💰 Total do Pedido:
                        </span>
                        <span className='font-bold text-lg sm:text-xl text-green-600'>
                          R$ {total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className='flex flex-col sm:flex-row gap-3'>
                    <button
                      onClick={() => setStep(2)}
                      className='w-full sm:w-auto bg-gray-500 text-white px-6 py-2.5 rounded-lg hover:bg-gray-600 transition text-sm order-2 sm:order-1'
                    >
                      ← Voltar
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className='w-full sm:flex-1 bg-green-500 text-white px-6 py-2.5 rounded-lg hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm order-1 sm:order-2'
                    >
                      {loading ? (
                        <>
                          <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                          Processando...
                        </>
                      ) : (
                        <>🛒 Finalizar Pedido</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - Desktop */}
            <div className='hidden lg:block lg:col-span-1'>
              <div className='bg-white rounded-lg shadow-md p-6 sticky top-4'>
                <ResumoContent />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}