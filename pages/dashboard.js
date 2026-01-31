// PAGES/DASHBOARD.JS - PAINEL PRINCIPAL DO DISTRIBUIDOR
// =====================================================
// Visão geral: fornecedores, pedidos, pagamentos pendentes

import Layout from '../components/Layout';
import Link from 'next/link';
import Image from 'next/image';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [resumo, setResumo] = useState(null);
  const [loadingResumo, setLoadingResumo] = useState(true);
  const [pedidosRecentes, setPedidosRecentes] = useState([]);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    buscarDadosUsuario();
  }, []);

  const buscarDadosUsuario = async () => {
    try {
      setLoadingUser(true);
      setErro(null);
      
      const response = await fetch('/api/auth/me');
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        
        // Após buscar usuário, buscar dados financeiros
        if (data.user?.tipo === 'distribuidor') {
          await Promise.all([
            buscarResumoFinanceiro(),
            buscarPedidosRecentes()
          ]);
        }
      } else {
        // Se não autorizado, redirecionar para login
        router.push('/');
      }
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      setErro('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoadingUser(false);
    }
  };

  const buscarResumoFinanceiro = async () => {
    try {
      setLoadingResumo(true);
      const response = await fetch('/api/user/pagamentos');
      
      if (response.ok) {
        const data = await response.json();
        setResumo(data.resumo);
      } else {
        console.error('Erro ao buscar resumo:', response.status);
      }
    } catch (error) {
      console.error('Erro ao buscar resumo:', error);
    } finally {
      setLoadingResumo(false);
    }
  };

  const buscarPedidosRecentes = async () => {
    try {
      const response = await fetch('/api/user/pedidos?limit=5');
      
      if (response.ok) {
        const data = await response.json();
        setPedidosRecentes(data.pedidos || []);
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos recentes:', error);
    }
  };

  const fornecedores = [
    {
      codigo: 'A',
      nome: 'Vitor - Pandawa',
      especialidade: 'Especialista em Decks',
      descricao: 'Decks premium para todas as condições de surf',
      cor: 'from-[#ff7e5f] to-[#feb47b]',
      icone: '🏄‍♂️',
    },
    {
      codigo: 'B',
      nome: 'Mauricio - Maos Acessórios',
      especialidade: 'Especialista em Capas e Acessórios',
      descricao: 'Capas e acessórios para proteção e transporte',
      cor: 'from-[#43cea2] to-[#185a9d]',
      icone: '🛡️',
    },
    {
      codigo: 'C',
      nome: 'Rodrigo - Godas',
      especialidade: 'Especialista em Leashes',
      descricao: 'Leashes superiores para máxima segurança',
      cor: 'from-[#6a11cb] to-[#2575fc]',
      icone: '🔗',
    },
  ];

  // Calcular total pendente
  const totalPendente = resumo
    ? (resumo.royaltiesPendentes || 0) +
      (resumo.etiquetasPendentes || 0) +
      (resumo.embalagensPendentes || 0)
    : 0;

  // Status do pedido formatado
  const getStatusColor = status => {
    const colors = {
      pendente: 'bg-yellow-100 text-yellow-800',
      confirmado: 'bg-blue-100 text-blue-800',
      enviado: 'bg-orange-100 text-orange-800',
      entregue: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Se ainda está carregando, mostra loading
  if (loadingUser) {
    return (
      <>
        <Head>
          <title>Dashboard - Elite Surfing</title>
          <meta
            name='description'
            content='Painel principal dos distribuidores - Escolha o fornecedor e navegue pelos produtos'
          />
        </Head>

        <Layout>
          <div className='max-w-6xl mx-auto px-4 py-8'>
            <div className='text-center mb-12'>
              <div className='animate-pulse'>
                <div className='h-10 bg-gray-300 rounded w-64 mx-auto mb-4'></div>
                <div className='h-6 bg-gray-200 rounded w-96 mx-auto mb-2'></div>
                <div className='h-4 bg-gray-200 rounded w-80 mx-auto'></div>
              </div>
            </div>
          </div>
        </Layout>
      </>
    );
  }

  // Se houve erro
  if (erro) {
    return (
      <>
        <Head>
          <title>Dashboard - Elite Surfing</title>
        </Head>
        <Layout>
          <div className='max-w-6xl mx-auto px-4 py-8'>
            <div className='bg-red-50 border border-red-200 rounded-xl p-6 text-center'>
              <p className='text-red-600 mb-4'>{erro}</p>
              <button
                onClick={buscarDadosUsuario}
                className='bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600'
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard - Elite Surfing</title>
        <meta
          name='description'
          content='Painel principal dos distribuidores - Escolha o fornecedor e navegue pelos produtos'
        />
      </Head>

      <Layout>
        <div className='max-w-6xl mx-auto px-4 py-8'>
          {/* Hero Section */}
          <div className='text-center mb-8'>
            <h1 className='text-4xl font-bold text-gray-800 mb-4'>
              Bem-vindo, {user?.nome || 'Usuário'}!
            </h1>
            <p className='text-xl text-gray-600 mb-2'>
              Escolha o fornecedor para ver os produtos disponíveis
            </p>
            <p className='text-gray-500'>
              Sistema exclusivo para distribuidores autorizados
            </p>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* ALERTA DE PAGAMENTOS PENDENTES - COMPACTO NO MOBILE */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {!loadingResumo && totalPendente > 0 && (
            <div className='mb-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-3 sm:p-4 shadow-lg'>
              <div className='flex items-center justify-between gap-3 sm:gap-4'>
                {/* Ícone e texto - compacto no mobile */}
                <div className='flex items-center gap-2 sm:gap-4'>
                  <div className='w-10 h-10 sm:w-14 sm:h-14 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0'>
                    <span className='text-xl sm:text-3xl'>💰</span>
                  </div>
                  <div className='text-white'>
                    <p className='font-bold text-sm sm:text-lg'>Pagamentos Pendentes</p>
                    <p className='text-red-100 text-xs sm:text-sm hidden sm:block'>
                      Você tem valores a pagar referentes aos Royalties
                    </p>
                  </div>
                </div>

                {/* Valor e botão */}
                <div className='flex items-center gap-2 sm:gap-4'>
                  <div className='text-white text-right'>
                    <p className='text-xs text-red-100 sm:hidden'>Royalties</p>
                    <p className='text-lg sm:text-3xl font-bold'>
                      R$ {totalPendente.toFixed(2)}
                    </p>
                  </div>
                  <Link
                    href='/pagamentos'
                    className='bg-white text-red-600 px-3 sm:px-5 py-2 rounded-lg font-medium hover:bg-red-50 transition shadow-md text-sm sm:text-base whitespace-nowrap'
                  >
                    <span className='hidden sm:inline'>Ver Detalhes</span> →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* CARDS DE ACESSO RÁPIDO - APENAS PEDIDOS E PAGAMENTOS */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className='grid grid-cols-2 gap-4 mb-8 max-w-md mx-auto sm:max-w-lg'>
            {/* Meus Pedidos */}
            <Link
              href='/meus-pedidos'
              className='bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition group'
            >
              <div className='flex items-center gap-3'>
                <div className='w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition'>
                  <span className='text-2xl'>📋</span>
                </div>
                <div>
                  <p className='font-medium text-gray-800'>Meus Pedidos</p>
                  <p className='text-xs text-gray-500'>Ver histórico</p>
                </div>
              </div>
            </Link>

            {/* Pagamentos */}
            <Link
              href='/pagamentos'
              className='bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition group relative'
            >
              <div className='flex items-center gap-3'>
                <div className='w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition'>
                  <span className='text-2xl'>💳</span>
                </div>
                <div>
                  <p className='font-medium text-gray-800'>Pagamentos</p>
                  <p className='text-xs text-gray-500'>Ver status</p>
                </div>
              </div>
              {/* Badge de pendente */}
              {!loadingResumo && totalPendente > 0 && (
                <div className='absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse'>
                  !
                </div>
              )}
            </Link>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* RESUMO FINANCEIRO COMPLETO */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {!loadingResumo && resumo && (
            <div className='bg-white rounded-xl shadow-md p-6 mb-8'>
              <h2 className='text-lg font-bold text-gray-800 mb-4 flex items-center gap-2'>
                📊 Resumo Financeiro
              </h2>
              
              <div className='grid grid-cols-2 md:grid-cols-5 gap-4'>
                {/* Total em Pedidos */}
                <div className='bg-blue-50 rounded-lg p-4 text-center'>
                  <p className='text-xs text-gray-500 mb-1'>Total em Pedidos</p>
                  <p className='text-xl font-bold text-blue-600'>
                    R$ {(resumo.totalPedidos || 0).toFixed(2)}
                  </p>
                </div>
                
                {/* Royalties Pendentes */}
                <div className='bg-yellow-50 rounded-lg p-4 text-center'>
                  <p className='text-xs text-gray-500 mb-1'>Royalties Pend.</p>
                  <p className='text-xl font-bold text-yellow-600'>
                    R$ {(resumo.royaltiesPendentes || 0).toFixed(2)}
                  </p>
                </div>
                
                {/* Etiquetas Pendentes */}
                <div className='bg-orange-50 rounded-lg p-4 text-center'>
                  <p className='text-xs text-gray-500 mb-1'>Etiquetas Pend.</p>
                  <p className='text-xl font-bold text-orange-600'>
                    R$ {(resumo.etiquetasPendentes || 0).toFixed(2)}
                  </p>
                </div>
                
                {/* Embalagens Pendentes */}
                <div className='bg-purple-50 rounded-lg p-4 text-center'>
                  <p className='text-xs text-gray-500 mb-1'>Embalagens Pend.</p>
                  <p className='text-xl font-bold text-purple-600'>
                    R$ {(resumo.embalagensPendentes || 0).toFixed(2)}
                  </p>
                </div>
                
                {/* Total Pendente */}
                <div className='bg-red-50 rounded-lg p-4 text-center border-2 border-red-200'>
                  <p className='text-xs text-gray-500 mb-1'>TOTAL PENDENTE</p>
                  <p className='text-xl font-bold text-red-600'>
                    R$ {totalPendente.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className='mt-4 pt-4 border-t flex justify-end'>
                <Link
                  href='/pagamentos'
                  className='text-blue-600 hover:text-blue-800 text-sm font-medium'
                >
                  Ver detalhes completos →
                </Link>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* PEDIDOS RECENTES - OCULTO NO MOBILE */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {pedidosRecentes.length > 0 && (
            <div className='hidden sm:block bg-white rounded-xl shadow-md p-6 mb-8'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-lg font-bold text-gray-800 flex items-center gap-2'>
                  📦 Pedidos Recentes
                </h2>
                <Link
                  href='/meus-pedidos'
                  className='text-blue-600 hover:text-blue-800 text-sm font-medium'
                >
                  Ver todos →
                </Link>
              </div>
              
              <div className='space-y-3'>
                {pedidosRecentes.slice(0, 3).map(pedido => (
                  <div
                    key={pedido._id}
                    className='flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition'
                  >
                    <div className='flex items-center gap-3'>
                      <div className='w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center'>
                        <span className='text-lg'>📦</span>
                      </div>
                      <div>
                        <p className='font-medium text-gray-800'>
                          Pedido #{pedido._id?.slice(-8).toUpperCase()}
                        </p>
                        <p className='text-xs text-gray-500'>
                          {new Date(pedido.createdAt).toLocaleDateString('pt-BR')} • {pedido.fornecedorId?.nome || 'Fornecedor'}
                        </p>
                      </div>
                    </div>
                    <div className='text-right'>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(pedido.status)}`}>
                        {pedido.status?.charAt(0).toUpperCase() + pedido.status?.slice(1)}
                      </span>
                      <p className='text-sm font-bold text-green-600 mt-1'>
                        R$ {pedido.total?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* CARDS DOS FORNECEDORES */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className='mb-6'>
            <h2 className='text-xl font-bold text-gray-800 mb-4'>
              🏭 Fornecedores Disponíveis
            </h2>
          </div>

          <div className='grid md:grid-cols-3 gap-8'>
            {fornecedores.map(fornecedor => (
              <Link
                key={fornecedor.codigo}
                href={`/produtos/${fornecedor.codigo}`}
                className='group block'
              >
                <div className='bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-2'>
                  {/* Header colorido */}
                  <div
                    className={`bg-gradient-to-r ${fornecedor.cor} p-6 text-white text-center relative`}
                  >
                    {/* Ícone ou Logo */}
                    <div className='flex justify-center mb-3'>
                      {fornecedor.codigo === 'A' ? (
                        <div className='w-16 h-16 rounded-full overflow-hidden bg-white p-1 shadow-lg'>
                          <Image
                            src='/vitor-logo.jpg'
                            alt='Vitor Pandawa Logo'
                            width={64}
                            height={64}
                            className='w-full h-full object-cover rounded-full'
                          />
                        </div>
                      ) : fornecedor.codigo === 'B' ? (
                        <div className='w-16 h-16 rounded-full overflow-hidden bg-white p-1 shadow-lg'>
                          <Image
                            src='/maos-logo.jpg'
                            alt='Maos Acessórios Logo'
                            width={64}
                            height={64}
                            className='w-full h-full object-cover rounded-full'
                          />
                        </div>
                      ) : fornecedor.codigo === 'C' ? (
                        <div className='w-16 h-16 rounded-full overflow-hidden bg-white p-1 shadow-lg'>
                          <Image
                            src='/godas-logo.jpg'
                            alt='Godas Logo'
                            width={64}
                            height={64}
                            className='w-full h-full object-cover rounded-full'
                          />
                        </div>
                      ) : (
                        <div className='text-4xl'>{fornecedor.icone}</div>
                      )}
                    </div>
                    <h2 className='text-xl font-bold mb-2'>
                      {fornecedor.nome}
                    </h2>
                    <p className='text-sm opacity-90 font-medium'>
                      {fornecedor.especialidade}
                    </p>

                    {/* Badge do código */}
                    <div className='absolute top-3 right-3'>
                      <span className='bg-white bg-opacity-20 text-white px-2 py-1 rounded-full text-sm font-bold'>
                        {fornecedor.codigo}
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className='p-6 text-center'>
                    <p className='text-gray-600 mb-4'>{fornecedor.descricao}</p>

                    <div className='bg-gray-100 text-gray-700 py-3 px-6 rounded-lg group-hover:bg-gray-200 transition-all duration-300 border border-gray-200 group-hover:border-gray-300 group-hover:shadow-md'>
                      <div className='flex items-center justify-center gap-2'>
                        <svg
                          className='w-4 h-4'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
                          />
                        </svg>
                        <span className='font-semibold'>Ver Produtos</span>
                        <svg
                          className='w-4 h-4 group-hover:translate-x-1 transition-transform duration-300'
                          fill='none'
                          stroke='currentColor'
                          viewBox='0 0 24 24'
                        >
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M9 5l7 7-7 7'
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Instruções de uso */}
          <div className='mt-12 bg-gray-50 rounded-xl p-8'>
            <h3 className='text-lg font-bold text-gray-800 mb-6 text-center'>
              📖 Como Funciona
            </h3>
            <div className='grid md:grid-cols-3 gap-6 text-center'>
              <div>
                <div className='flex items-center justify-center w-12 h-12 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full mb-3 mx-auto text-white font-bold text-lg shadow-lg'>
                  1
                </div>
                <h4 className='font-medium text-gray-800 mb-2'>
                  Escolha o Fornecedor
                </h4>
                <p className='text-sm text-gray-600'>
                  Clique no card do fornecedor para ver seus produtos
                  específicos
                </p>
              </div>
              <div>
                <div className='flex items-center justify-center w-12 h-12 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full mb-3 mx-auto text-white font-bold text-lg shadow-lg'>
                  2
                </div>
                <h4 className='font-medium text-gray-800 mb-2'>
                  Filtre por Categoria
                </h4>
                <p className='text-sm text-gray-600'>
                  Use a sidebar para filtrar produtos por categoria específica
                </p>
              </div>
              <div>
                <div className='flex items-center justify-center w-12 h-12 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full mb-3 mx-auto text-white font-bold text-lg shadow-lg'>
                  3
                </div>
                <h4 className='font-medium text-gray-800 mb-2'>
                  Faça seu Pedido
                </h4>
                <p className='text-sm text-gray-600'>
                  Adicione ao carrinho e finalize com pagamento na entrega
                </p>
              </div>
            </div>
          </div>

          {/* Informações de contato */}
          <div className='mt-8 text-center text-gray-600'>
            <p className='text-sm'>
              <strong>Dúvidas?</strong> Entre em contato com nosso suporte
              através do WhatsApp.
            </p>
          </div>
        </div>
      </Layout>
    </>
  );
}