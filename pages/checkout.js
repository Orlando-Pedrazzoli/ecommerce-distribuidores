// pages/checkout.js - ATUALIZADO COM SELEÇÃO DE TIPO DE PREÇO
// ===================================

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
  // 🆕 NOVO ESTADO: Tipo de preço
  const [tipoPreco, setTipoPreco] = useState('comNF'); // 'comNF' ou 'semNF'
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1);
  const router = useRouter();

  // Buscar dados do usuário
  useEffect(() => {
    buscarDadosUsuario();
  }, []);

  // Verificar se há itens no carrinho
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
      console.log('💾 Salvando endereço:', novoEndereco);

      const response = await fetch('/api/user/endereco', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endereco: novoEndereco }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Endereço salvo com sucesso');
        setEnderecoOriginal(novoEndereco);
        toast.success('📍 Endereço atualizado com sucesso!');
      } else {
        console.error('❌ Erro ao salvar endereço:', data.message);
        toast.warning(
          'Não foi possível salvar o endereço, mas o pedido continuará normalmente.'
        );
      }
    } catch (error) {
      console.error('❌ Erro ao salvar endereço:', error);
      toast.warning(
        'Erro ao salvar endereço, mas o pedido continuará normalmente.'
      );
    }
  };

  const enderecoMudou = () => {
    if (!enderecoOriginal) return false;
    return JSON.stringify(endereco) !== JSON.stringify(enderecoOriginal);
  };

  // Agrupar produtos por fornecedor
  const produtosPorFornecedor = cart.reduce((acc, item) => {
    const fornecedorId =
      item.fornecedorId?._id || item.fornecedorId || 'unknown';
    const fornecedorNome =
      item.fornecedorId?.nome || 'Fornecedor não identificado';

    if (!acc[fornecedorId]) {
      acc[fornecedorId] = {
        nome: fornecedorNome,
        itens: [],
        subtotalComNF: 0,
        subtotalSemNF: 0,
      };
    }

    acc[fornecedorId].itens.push(item);
    acc[fornecedorId].subtotalComNF += (item.preco || 0) * item.quantidade;
    acc[fornecedorId].subtotalSemNF += (item.precoSemNF || 0) * item.quantidade;

    return acc;
  }, {});

  // 🆕 CÁLCULOS BASEADOS NO TIPO DE PREÇO SELECIONADO
  const subtotalComNF = cart.reduce(
    (acc, item) => acc + (item.preco || 0) * item.quantidade,
    0
  );

  const subtotalSemNF = cart.reduce(
    (acc, item) => acc + (item.precoSemNF || 0) * item.quantidade,
    0
  );

  const royaltiesComNF = subtotalComNF * 0.05;
  const royaltiesSemNF = subtotalSemNF * 0.05;
  const totalComNF = subtotalComNF + royaltiesComNF;
  const totalSemNF = subtotalSemNF + royaltiesSemNF;

  const subtotal = tipoPreco === 'comNF' ? subtotalComNF : subtotalSemNF;
  const royalties = subtotal * 0.05;
  const total = subtotal + royalties;
  const economia = totalComNF - totalSemNF;

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
        console.log('📍 Endereço foi alterado, salvando...');
        await salvarEndereco(endereco);
      }

      const pedidosPromises = Object.entries(produtosPorFornecedor).map(
        async ([fornecedorId, dados]) => {
          // 🆕 USAR PREÇO BASEADO NA SELEÇÃO
          const itensFormatados = dados.itens.map(item => ({
            produtoId: item._id,
            codigo: item.codigo,
            nome: item.nome,
            quantidade: item.quantidade,
            precoUnitario: tipoPreco === 'comNF' ? item.preco : item.precoSemNF,
            tipoPreco: tipoPreco, // 🆕 SALVAR TIPO DE PREÇO ESCOLHIDO
          }));

          const pedidoData = {
            userId: user.id,
            itens: itensFormatados,
            fornecedorId,
            formaPagamento,
            endereco,
            tipoPreco, // 🆕 SALVAR TIPO DE PREÇO NO PEDIDO
          };

          console.log('📦 Enviando pedido:', {
            fornecedor: dados.nome,
            itens: itensFormatados.length,
            total:
              tipoPreco === 'comNF' ? dados.subtotalComNF : dados.subtotalSemNF,
            tipoPreco,
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

      const tipoPrecoTexto =
        tipoPreco === 'comNF' ? 'COM Nota Fiscal' : 'SEM Nota Fiscal';

      toast.success(
        `🎉 Pedido realizado com sucesso!\n\n` +
          `💰 Tipo de preço: ${tipoPrecoTexto}\n` +
          `💵 Total: R$ ${total.toFixed(2)}\n\n` +
          `📧 Emails foram enviados automaticamente.\n` +
          `Acompanhe o status em "Meus Pedidos".\n\n` +
          `Obrigado pela sua compra!`,
        8000
      );

      router.push('/meus-pedidos');
    } catch (error) {
      console.error('💥 Erro ao criar pedidos:', error);
      toast.error(
        `❌ Erro ao processar pedido:\n\n${error.message}\n\n` +
          'Tente novamente ou entre em contato.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loadingUser) {
    return (
      <Layout>
        <div className='flex justify-center items-center h-64'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4'></div>
            <p className='text-gray-600'>Carregando...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Empty cart state
  if (cart.length === 0) {
    return (
      <Layout>
        <div className='max-w-2xl mx-auto px-4 py-16 text-center'>
          <div className='text-6xl mb-4'>🛒</div>
          <h1 className='text-3xl font-bold text-gray-800 mb-4'>
            Carrinho Vazio
          </h1>
          <p className='text-gray-600 mb-8'>
            Seu carrinho está vazio. Adicione produtos para continuar com a
            compra.
          </p>
          <div className='space-y-4'>
            <button
              onClick={() => router.push('/dashboard')}
              className='bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition'
            >
              Continuar Comprando
            </button>
            <p className='text-sm text-gray-500'>
              Redirecionando automaticamente em 3 segundos...
            </p>
          </div>
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
        <div className='max-w-6xl mx-auto px-4 py-8'>
          {/* Header */}
          <div className='text-center mb-8'>
            <h1 className='text-3xl font-bold text-gray-800 mb-2'>
              Finalizar Pedido
            </h1>
            <p className='text-gray-600'>
              Olá, <span className='font-medium'>{user?.nome}</span> •{' '}
              {cartCount} {cartCount === 1 ? 'item' : 'itens'} • Total: R${' '}
              {total.toFixed(2)}
            </p>
            {enderecoMudou() && (
              <p className='text-sm text-blue-600 mt-2'>
                📍 Endereço será atualizado automaticamente
              </p>
            )}
          </div>

          {/* Progress Steps */}
          <div className='flex justify-center mb-8'>
            <div className='flex items-center space-x-4'>
              {[
                { num: 1, label: 'Endereço', icon: '📍' },
                { num: 2, label: 'Pagamento', icon: '💳' },
                { num: 3, label: 'Tipo de Preço', icon: '💰' }, // 🆕 NOVO STEP
                { num: 4, label: 'Confirmação', icon: '✅' },
              ].map(stepInfo => (
                <div key={stepInfo.num} className='flex items-center'>
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      step >= stepInfo.num
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step > stepInfo.num ? '✓' : stepInfo.icon}
                  </div>
                  <span
                    className={`ml-2 text-sm ${
                      step >= stepInfo.num
                        ? 'text-blue-600 font-medium'
                        : 'text-gray-500'
                    }`}
                  >
                    {stepInfo.label}
                  </span>
                  {stepInfo.num < 4 && (
                    <div
                      className={`w-8 h-px mx-4 ${
                        step > stepInfo.num ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className='grid lg:grid-cols-3 gap-8'>
            {/* Formulário */}
            <div className='lg:col-span-2 space-y-6'>
              {/* Step 1: Endereço */}
              {step === 1 && (
                <div className='bg-white rounded-lg shadow-md p-6'>
                  <div className='flex justify-between items-center mb-6'>
                    <h2 className='text-xl font-bold text-gray-800 flex items-center gap-2'>
                      <span>📍</span>
                      Endereço de Entrega
                    </h2>
                    {enderecoMudou() && (
                      <span className='text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded'>
                        Alterado
                      </span>
                    )}
                  </div>

                  <div className='grid md:grid-cols-2 gap-4'>
                    <div className='md:col-span-2'>
                      <label className='block text-gray-700 font-medium mb-2'>
                        CEP *
                      </label>
                      <input
                        type='text'
                        value={endereco.cep}
                        onChange={handleCEPChange}
                        placeholder='00000-000'
                        maxLength='9'
                        className={`w-full border rounded px-3 py-2 focus:outline-none focus:border-blue-500 ${
                          errors.cep ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.cep && (
                        <p className='text-red-500 text-sm mt-1'>
                          {errors.cep}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className='block text-gray-700 font-medium mb-2'>
                        Rua *
                      </label>
                      <input
                        type='text'
                        value={endereco.rua}
                        onChange={e =>
                          setEndereco({ ...endereco, rua: e.target.value })
                        }
                        className={`w-full border rounded px-3 py-2 focus:outline-none focus:border-blue-500 ${
                          errors.rua ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.rua && (
                        <p className='text-red-500 text-sm mt-1'>
                          {errors.rua}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className='block text-gray-700 font-medium mb-2'>
                        Número *
                      </label>
                      <input
                        type='text'
                        value={endereco.numero}
                        onChange={e =>
                          setEndereco({ ...endereco, numero: e.target.value })
                        }
                        className={`w-full border rounded px-3 py-2 focus:outline-none focus:border-blue-500 ${
                          errors.numero ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.numero && (
                        <p className='text-red-500 text-sm mt-1'>
                          {errors.numero}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className='block text-gray-700 font-medium mb-2'>
                        Complemento
                      </label>
                      <input
                        type='text'
                        value={endereco.complemento}
                        onChange={e =>
                          setEndereco({
                            ...endereco,
                            complemento: e.target.value,
                          })
                        }
                        placeholder='Apto, bloco, etc.'
                        className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
                      />
                    </div>

                    <div>
                      <label className='block text-gray-700 font-medium mb-2'>
                        Bairro *
                      </label>
                      <input
                        type='text'
                        value={endereco.bairro}
                        onChange={e =>
                          setEndereco({ ...endereco, bairro: e.target.value })
                        }
                        className={`w-full border rounded px-3 py-2 focus:outline-none focus:border-blue-500 ${
                          errors.bairro ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.bairro && (
                        <p className='text-red-500 text-sm mt-1'>
                          {errors.bairro}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className='block text-gray-700 font-medium mb-2'>
                        Cidade *
                      </label>
                      <input
                        type='text'
                        value={endereco.cidade}
                        onChange={e =>
                          setEndereco({ ...endereco, cidade: e.target.value })
                        }
                        className={`w-full border rounded px-3 py-2 focus:outline-none focus:border-blue-500 ${
                          errors.cidade ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.cidade && (
                        <p className='text-red-500 text-sm mt-1'>
                          {errors.cidade}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className='block text-gray-700 font-medium mb-2'>
                        Estado *
                      </label>
                      <select
                        value={endereco.estado}
                        onChange={e =>
                          setEndereco({ ...endereco, estado: e.target.value })
                        }
                        className={`w-full border rounded px-3 py-2 focus:outline-none focus:border-blue-500 ${
                          errors.estado ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value=''>Selecione...</option>
                        {[
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
                        ].map(estado => (
                          <option key={estado} value={estado}>
                            {estado}
                          </option>
                        ))}
                      </select>
                      {errors.estado && (
                        <p className='text-red-500 text-sm mt-1'>
                          {errors.estado}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className='flex justify-end mt-6'>
                    <button
                      onClick={() => {
                        if (validateEndereco()) setStep(2);
                      }}
                      className='bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition'
                    >
                      Continuar para Pagamento
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Pagamento */}
              {step === 2 && (
                <div className='bg-white rounded-lg shadow-md p-6'>
                  <h2 className='text-xl font-bold text-gray-800 mb-6 flex items-center gap-2'>
                    <span>💳</span>
                    Forma de Pagamento
                  </h2>

                  <div className='grid md:grid-cols-2 gap-4 mb-6'>
                    <label
                      className={`border-2 rounded-lg p-6 cursor-pointer transition ${
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
                        <div className='text-3xl mb-3'>💳</div>
                        <h3 className='font-bold text-lg mb-2'>
                          Boleto Bancário
                        </h3>
                        <p className='text-sm text-gray-600'>
                          Pagamento através de boleto bancário
                        </p>
                        <p className='text-xs text-gray-500 mt-2'>
                          Processamento em até 2 dias úteis
                        </p>
                      </div>
                    </label>

                    <label
                      className={`border-2 rounded-lg p-6 cursor-pointer transition ${
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
                        <div className='text-3xl mb-3'>🏦</div>
                        <h3 className='font-bold text-lg mb-2'>
                          Transferência
                        </h3>
                        <p className='text-sm text-gray-600'>
                          Transferência bancária direta
                        </p>
                        <p className='text-xs text-gray-500 mt-2'>
                          Confirmação imediata
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className='flex justify-between'>
                    <button
                      onClick={() => setStep(1)}
                      className='bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition'
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      className='bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition'
                    >
                      Escolher Tipo de Preço
                    </button>
                  </div>
                </div>
              )}

              {/* 🆕 Step 3: Tipo de Preço */}
              {step === 3 && (
                <div className='bg-white rounded-lg shadow-md p-6'>
                  <h2 className='text-xl font-bold text-gray-800 mb-6 flex items-center gap-2'>
                    <span>💰</span>
                    Escolha o Tipo de Preço
                  </h2>

                  <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6'>
                    <div className='flex items-start'>
                      <span className='text-yellow-600 text-xl mr-3'>💡</span>
                      <div>
                        <h3 className='font-medium text-yellow-800 mb-2'>
                          Escolha importante:
                        </h3>
                        <p className='text-sm text-yellow-700'>
                          Selecione se você deseja comprar COM ou SEM nota
                          fiscal. Esta escolha afetará o preço final do seu
                          pedido.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className='grid md:grid-cols-2 gap-6 mb-6'>
                    {/* Opção COM NF */}
                    <label
                      className={`border-2 rounded-lg p-6 cursor-pointer transition ${
                        tipoPreco === 'comNF'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type='radio'
                        name='tipoPreco'
                        value='comNF'
                        checked={tipoPreco === 'comNF'}
                        onChange={e => setTipoPreco(e.target.value)}
                        className='sr-only'
                      />
                      <div className='text-center'>
                        <div className='text-4xl mb-3'>💳</div>
                        <h3 className='font-bold text-lg mb-3 text-blue-700'>
                          COM Nota Fiscal
                        </h3>
                        <div className='bg-white rounded-lg p-4 border'>
                          <p className='text-2xl font-bold text-blue-600 mb-2'>
                            R$ {subtotalComNF.toFixed(2)}
                          </p>
                          <p className='text-sm text-gray-600 mb-2'>
                            + Royalties: R$ {(subtotalComNF * 0.05).toFixed(2)}
                          </p>
                          <p className='text-lg font-bold text-blue-600 border-t pt-2'>
                            Total: R${' '}
                            {(subtotalComNF + subtotalComNF * 0.05).toFixed(2)}
                          </p>
                        </div>
                        <div className='mt-3'>
                          <p className='text-xs text-blue-700 font-medium'>
                            ✓ Nota fiscal inclusa
                          </p>
                          <p className='text-xs text-blue-700'>
                            ✓ Garantia completa
                          </p>
                        </div>
                      </div>
                    </label>

                    {/* Opção SEM NF */}
                    <label
                      className={`border-2 rounded-lg p-6 cursor-pointer transition relative ${
                        tipoPreco === 'semNF'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type='radio'
                        name='tipoPreco'
                        value='semNF'
                        checked={tipoPreco === 'semNF'}
                        onChange={e => setTipoPreco(e.target.value)}
                        className='sr-only'
                      />

                      {/* Badge de economia */}
                      {economia > 0 && (
                        <span className='absolute -top-3 -right-3 bg-red-500 text-white text-sm px-3 py-1 rounded-full font-bold shadow-lg'>
                          ECONOMIZE R$ {economia.toFixed(2)}
                        </span>
                      )}

                      <div className='text-center'>
                        <div className='text-4xl mb-3'>🏷️</div>
                        <h3 className='font-bold text-lg mb-3 text-green-700'>
                          SEM Nota Fiscal
                        </h3>
                        <div className='bg-white rounded-lg p-4 border'>
                          <p className='text-2xl font-bold text-green-600 mb-2'>
                            R$ {subtotalSemNF.toFixed(2)}
                          </p>
                          <p className='text-sm text-gray-600 mb-2'>
                            + Royalties: R$ {(subtotalSemNF * 0.05).toFixed(2)}
                          </p>
                          <p className='text-lg font-bold text-green-600 border-t pt-2'>
                            Total: R${' '}
                            {(subtotalSemNF + subtotalSemNF * 0.05).toFixed(2)}
                          </p>
                        </div>
                        <div className='mt-3'>
                          <p className='text-xs text-green-700 font-medium'>
                            💰 Preço reduzido
                          </p>
                          <p className='text-xs text-green-700'>
                            💸 Economia de{' '}
                            {((economia / subtotalComNF) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Comparação */}
                  <div className='bg-gray-50 rounded-lg p-4 mb-6'>
                    <h4 className='font-medium text-gray-800 mb-3 text-center'>
                      📊 Comparação de Preços
                    </h4>
                    <div className='grid grid-cols-3 gap-4 text-center text-sm'>
                      <div>
                        <p className='text-gray-600'>COM NF</p>
                        <p className='text-lg font-bold text-blue-600'>
                          R$ {(subtotalComNF + subtotalComNF * 0.05).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className='text-gray-600'>SEM NF</p>
                        <p className='text-lg font-bold text-green-600'>
                          R$ {(subtotalSemNF + subtotalSemNF * 0.05).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className='text-gray-600'>ECONOMIA</p>
                        <p className='text-lg font-bold text-red-600'>
                          R$ {economia.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className='flex justify-between'>
                    <button
                      onClick={() => setStep(2)}
                      className='bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition'
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => setStep(4)}
                      className='bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition'
                    >
                      Revisar Pedido
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Confirmação */}
              {step === 4 && (
                <div className='bg-white rounded-lg shadow-md p-6'>
                  <h2 className='text-xl font-bold text-gray-800 mb-6 flex items-center gap-2'>
                    <span>✅</span>
                    Confirmação do Pedido
                  </h2>

                  {/* Resumo do Usuário */}
                  <div className='mb-6 p-4 bg-gray-50 rounded-lg'>
                    <h3 className='font-medium mb-2'>👤 Dados do Pedido:</h3>
                    <p className='text-sm text-gray-700'>
                      <strong>Cliente:</strong> {user?.nome}
                      <br />
                      <strong>Email:</strong> {user?.email}
                    </p>
                  </div>

                  {/* Resumo do Endereço */}
                  <div className='mb-6 p-4 bg-gray-50 rounded-lg'>
                    <h3 className='font-medium mb-2 flex items-center gap-2'>
                      📍 Endereço de Entrega:
                      {enderecoMudou() && (
                        <span className='text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded'>
                          Será atualizado
                        </span>
                      )}
                    </h3>
                    <p className='text-sm text-gray-700'>
                      {endereco.rua}, {endereco.numero}
                      {endereco.complemento && `, ${endereco.complemento}`}
                      <br />
                      {endereco.bairro} - {endereco.cidade} - {endereco.estado}
                      <br />
                      CEP: {endereco.cep}
                    </p>
                  </div>

                  {/* Resumo do Pagamento */}
                  <div className='mb-6 p-4 bg-gray-50 rounded-lg'>
                    <h3 className='font-medium mb-2'>💳 Forma de Pagamento:</h3>
                    <p className='text-sm text-gray-700'>
                      {formaPagamento === 'boleto'
                        ? '💳 Boleto Bancário'
                        : '🏦 Transferência Bancária'}
                    </p>
                  </div>

                  {/* 🆕 Resumo do Tipo de Preço */}
                  <div className='mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border'>
                    <h3 className='font-medium mb-3 flex items-center gap-2'>
                      💰 Tipo de Preço Selecionado:
                    </h3>
                    <div className='text-center'>
                      {tipoPreco === 'comNF' ? (
                        <div>
                          <span className='inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-bold'>
                            💳 COM Nota Fiscal - R$ {total.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className='inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full font-bold'>
                            🏷️ SEM Nota Fiscal - R$ {total.toFixed(2)}
                          </span>
                          <p className='text-sm text-green-700 mt-2'>
                            💰 Economizando R$ {economia.toFixed(2)} em relação
                            ao preço com NF
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className='flex justify-between'>
                    <button
                      onClick={() => setStep(3)}
                      className='bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition'
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className='bg-green-500 text-white px-8 py-2 rounded-lg hover:bg-green-600 transition disabled:opacity-50 flex items-center gap-2'
                    >
                      {loading ? (
                        <>
                          <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                          Processando...
                        </>
                      ) : (
                        <>
                          <span>🛒</span>
                          Finalizar Pedido
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 🆕 Resumo do Pedido - Sidebar Atualizada */}
            <div className='lg:col-span-1'>
              <div className='bg-white rounded-lg shadow-md p-6 sticky top-4'>
                <h2 className='text-xl font-bold text-gray-800 mb-4'>
                  Resumo do Pedido
                </h2>

                {/* Seletor de Visualização de Preço */}
                <div className='mb-4'>
                  <div className='flex rounded-lg overflow-hidden border'>
                    <button
                      onClick={() => setTipoPreco('comNF')}
                      className={`flex-1 py-2 px-3 text-xs font-medium transition ${
                        tipoPreco === 'comNF'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      💳 COM NF
                    </button>
                    <button
                      onClick={() => setTipoPreco('semNF')}
                      className={`flex-1 py-2 px-3 text-xs font-medium transition ${
                        tipoPreco === 'semNF'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      🏷️ SEM NF
                    </button>
                  </div>
                  {economia > 0 && tipoPreco === 'semNF' && (
                    <p className='text-xs text-green-600 text-center mt-2'>
                      💰 Economizando R$ {economia.toFixed(2)}
                    </p>
                  )}
                </div>

                {/* Itens agrupados por fornecedor */}
                <div className='space-y-4 mb-6'>
                  {Object.entries(produtosPorFornecedor).map(
                    ([fornecedorId, dados]) => (
                      <div
                        key={fornecedorId}
                        className='border border-gray-200 rounded-lg p-3'
                      >
                        <h3 className='font-medium text-gray-800 mb-3 text-sm border-b pb-2'>
                          {dados.nome}
                        </h3>

                        <div className='space-y-2'>
                          {dados.itens.map(item => (
                            <div
                              key={item._id}
                              className='flex justify-between items-center text-sm'
                            >
                              <div className='flex-1'>
                                <p className='font-medium text-gray-900 truncate'>
                                  {item.nome}
                                </p>
                                <p className='text-gray-600'>
                                  {item.quantidade}x R${' '}
                                  {(tipoPreco === 'comNF'
                                    ? item.preco
                                    : item.precoSemNF
                                  ).toFixed(2)}
                                </p>
                              </div>
                              <p className='font-medium text-green-600'>
                                R${' '}
                                {(
                                  (tipoPreco === 'comNF'
                                    ? item.preco
                                    : item.precoSemNF) * item.quantidade
                                ).toFixed(2)}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className='border-t mt-2 pt-2'>
                          <div className='flex justify-between text-sm font-medium'>
                            <span>Subtotal:</span>
                            <span>
                              R${' '}
                              {(tipoPreco === 'comNF'
                                ? dados.subtotalComNF
                                : dados.subtotalSemNF
                              ).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Totais */}
                <div className='border-t border-gray-200 pt-4 space-y-2'>
                  <div className='flex justify-between items-center'>
                    <span className='font-medium'>Subtotal:</span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-gray-600'>
                      Royalties (5%):
                    </span>
                    <span className='text-sm'>R$ {royalties.toFixed(2)}</span>
                  </div>
                  <div className='flex justify-between items-center font-bold text-lg border-t pt-2'>
                    <span>Total:</span>
                    <span
                      className={
                        tipoPreco === 'comNF'
                          ? 'text-blue-600'
                          : 'text-green-600'
                      }
                    >
                      R$ {total.toFixed(2)}
                    </span>
                  </div>

                  {/* Indicador de economia */}
                  {tipoPreco === 'semNF' && economia > 0 && (
                    <div className='bg-red-50 rounded p-2 text-center'>
                      <p className='text-sm font-medium text-red-600'>
                        💰 Economizando R$ {economia.toFixed(2)}
                      </p>
                      <p className='text-xs text-red-500'>
                        {((economia / totalComNF) * 100).toFixed(1)}% de
                        desconto
                      </p>
                    </div>
                  )}
                </div>

                {/* Informações de entrega */}
                <div className='mt-6 p-3 bg-blue-50 rounded-lg'>
                  <h4 className='font-medium text-blue-800 mb-2 text-sm'>
                    📦 Informações de Entrega
                  </h4>
                  <ul className='text-xs text-blue-700 space-y-1'>
                    <li>• Prazo: 5-10 dias úteis</li>
                    <li>• Frete por conta do fornecedor</li>
                    <li>• Acompanhe em "Meus Pedidos"</li>
                  </ul>
                </div>

                {/* Informações de segurança */}
                <div className='mt-4 p-3 bg-green-50 rounded-lg'>
                  <h4 className='font-medium text-green-800 mb-2 text-sm'>
                    🔒 Compra Segura
                  </h4>
                  <ul className='text-xs text-green-700 space-y-1'>
                    <li>• Dados protegidos</li>
                    <li>• Emails automáticos</li>
                    <li>• Histórico em "Meus Pedidos"</li>
                  </ul>
                </div>

                {/* Tipo de preço selecionado */}
                {step >= 3 && (
                  <div className='mt-4 p-3 bg-yellow-50 rounded-lg'>
                    <h4 className='font-medium text-yellow-800 mb-2 text-sm'>
                      💰 Preço Selecionado
                    </h4>
                    <div className='text-center'>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                          tipoPreco === 'comNF'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {tipoPreco === 'comNF' ? '💳 COM NF' : '🏷️ SEM NF'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}
