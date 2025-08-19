// PAGES/DASHBOARD.JS - ATUALIZADO COM FORNECEDORES REAIS
// ===================================

import Layout from '../components/Layout';
import Link from 'next/link';
import Image from 'next/image';

export default function Dashboard() {
  const fornecedores = [
    {
      codigo: 'A',
      nome: 'Vitor - Pandawa',
      especialidade: 'Especialista em Decks',
      descricao: 'Decks premium para todas as condições de surf',
      cor: 'from-gray-500 to-gray-600',
      icone: '🏄‍♂️',
    },
    {
      codigo: 'B',
      nome: 'Mauricio - Maos Acessórios',
      especialidade: 'Especialista em Capas e Acessórios',
      descricao: 'Capas e acessórios para proteção e transporte',
      cor: 'from-gray-500 to-gray-600',
      icone: '🛡️',
    },
    {
      codigo: 'C',
      nome: 'Rodrigo - Godas',
      especialidade: 'Especialista em Leashes',
      descricao: 'Leashes superiores para máxima segurança',
      cor: 'from-gray-500 to-gray-600',
      icone: '🔗',
    },
  ];

  return (
    <Layout>
      <div className='max-w-6xl mx-auto px-4 py-8'>
        {/* Hero Section */}
        <div className='text-center mb-12'>
          <h1 className='text-4xl font-bold text-gray-800 mb-4'>
            Bem-vindo, Distribuidor!
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
                  <h2 className='text-xl font-bold mb-2'>{fornecedor.nome}</h2>
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

                  <div className='bg-blue-50 text-blue-700 py-3 px-4 rounded-lg group-hover:bg-blue-100 transition'>
                    <span className='font-medium'>Ver Catálogo</span>
                    <span className='ml-2'>→</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Instruções de uso */}
        <div className='mt-12 bg-blue-50 rounded-xl p-8'>
          <h3 className='text-xl font-semibold text-blue-800 mb-4 text-center'>
            ℹ️ Como funciona
          </h3>
          <div className='grid md:grid-cols-3 gap-6 text-center'>
            <div>
              <div className='text-3xl mb-2'>1️⃣</div>
              <h4 className='font-medium text-blue-800 mb-2'>
                Escolha o Fornecedor
              </h4>
              <p className='text-sm text-blue-700'>
                Clique no card do fornecedor para ver seus produtos específicos
              </p>
            </div>
            <div>
              <div className='text-3xl mb-2'>2️⃣</div>
              <h4 className='font-medium text-blue-800 mb-2'>
                Filtre por Categoria
              </h4>
              <p className='text-sm text-blue-700'>
                Use a sidebar para filtrar produtos por categoria específica
              </p>
            </div>
            <div>
              <div className='text-3xl mb-2'>3️⃣</div>
              <h4 className='font-medium text-blue-800 mb-2'>
                Faça seu Pedido
              </h4>
              <p className='text-sm text-blue-700'>
                Adicione ao carrinho e finalize com pagamento na entrega
              </p>
            </div>
          </div>
        </div>

        {/* Informações de contato */}
        <div className='mt-8 text-center text-gray-600'>
          <p className='text-sm'>
            <strong>Dúvidas?</strong> Entre em contato com nosso suporte através
            do admin.
          </p>
        </div>
      </div>
    </Layout>
  );
}
