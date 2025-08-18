// 19. PAGES/DASHBOARD.JS
// ===================================

import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Link from 'next/link';

export default function Dashboard() {
  const [fornecedores] = useState([
    {
      codigo: 'A',
      nome: 'Fornecedor A',
      descricao: 'Especializado em pranchas e acessórios premium',
    },
    {
      codigo: 'B',
      nome: 'Fornecedor B',
      descricao: 'Linha completa de capas e leashes',
    },
    {
      codigo: 'C',
      nome: 'Fornecedor C',
      descricao: 'Acessórios e equipamentos diversos',
    },
  ]);

  return (
    <Layout>
      <div className='max-w-7xl mx-auto px-4 py-8'>
        <div className='text-center mb-12'>
          <h1 className='text-4xl font-bold text-gray-800 mb-4'>
            Selecione o Fornecedor
          </h1>
          <p className='text-gray-600 text-lg'>
            Escolha o fornecedor para visualizar os produtos disponíveis
          </p>
        </div>

        <div className='grid md:grid-cols-3 gap-8'>
          {fornecedores.map(fornecedor => (
            <Link
              key={fornecedor.codigo}
              href={`/produtos/${fornecedor.codigo}`}
              className='group'
            >
              <div className='bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition duration-300 transform group-hover:-translate-y-2'>
                <div className='bg-gradient-to-r from-blue-500 to-blue-600 p-8 text-white text-center'>
                  <h3 className='text-2xl font-bold'>{fornecedor.nome}</h3>
                </div>
                <div className='p-6 text-center'>
                  <p className='text-gray-600 mb-4'>{fornecedor.descricao}</p>
                  <div className='bg-blue-500 text-white py-2 px-4 rounded inline-block group-hover:bg-blue-600 transition'>
                    Ver Produtos
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
