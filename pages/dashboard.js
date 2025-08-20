import Layout from '../components/Layout';
import Link from 'next/link';
import Image from 'next/image';
import Head from 'next/head';
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    buscarDadosUsuario();
  }, []);

  const buscarDadosUsuario = async () => {
    try {
      setLoadingUser(true);
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  };

  const fornecedores = [
    {
      codigo: 'A',
      nome: 'Vitor - Pandawa',
      especialidade: 'Especialista em Decks',
      descricao: 'Decks premium para todas as condições de surf',
      cor: 'bg-gradient-to-r from-[#ff7e5f] to-[#feb47b]',
      icone: '🏄‍♂️',
    },
    {
      codigo: 'B',
      nome: 'Mauricio - Maos Acessórios',
      especialidade: 'Especialista em Capas e Acessórios',
      descricao: 'Capas e acessórios para proteção e transporte',
      cor: 'bg-gradient-to-r from-[#43cea2] to-[#185a9d]',
      icone: '🛡️',
    },
    {
      codigo: 'C',
      nome: 'Rodrigo - Godas',
      especialidade: 'Especialista em Leashes',
      descricao: 'Leashes superiores para máxima segurança',
      cor: 'bg-gradient-to-r from-[#6a11cb] to-[#2575fc]',
      icone: '🔗',
    },
  ];

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
          <div className='text-center mb-12'>
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

          {/* Cards dos Fornecedores */}
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
