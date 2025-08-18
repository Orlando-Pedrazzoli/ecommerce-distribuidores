// 24. PAGES/CHECKOUT.JS
// ===================================

import { useState, useEffect } from 'react';
import { useCart } from '../pages/_app';
import Layout from '../components/Layout';
import { useRouter } from 'next/router';

export default function Checkout() {
  const { cart, cartTotal, clearCart } = useCart();
  const [endereco, setEndereco] = useState({
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    cep: '',
    estado: '',
  });
  const [formaPagamento, setFormaPagamento] = useState('boleto');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Agrupar produtos por fornecedor
  const produtosPorFornecedor = cart.reduce((acc, item) => {
    const fornecedorId = item.fornecedorId;
    if (!acc[fornecedorId]) {
      acc[fornecedorId] = [];
    }
    acc[fornecedorId].push(item);
    return acc;
  }, {});

  const subtotal = cartTotal;
  const royalties = subtotal * 0.05;
  const total = subtotal + royalties;

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);

    try {
      // Processar cada fornecedor separadamente
      for (const [fornecedorId, itens] of Object.entries(
        produtosPorFornecedor
      )) {
        const itensFormatados = itens.map(item => ({
          produtoId: item._id,
          nome: item.nome,
          quantidade: item.quantidade,
          precoUnitario: item.preco,
        }));

        const pedidoData = {
          itens: itensFormatados,
          fornecedorId,
          distribuidorId: '507f1f77bcf86cd799439011', // ID fixo do distribuidor
          formaPagamento,
          endereco,
        };

        await fetch('/api/pedidos/criar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pedidoData),
        });
      }

      clearCart();
      alert(
        'Pedido realizado com sucesso! Você receberá uma confirmação por email.'
      );
      router.push('/dashboard');
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      alert('Erro ao processar pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <Layout>
        <div className='max-w-2xl mx-auto px-4 py-8 text-center'>
          <h1 className='text-2xl font-bold text-gray-800 mb-4'>
            Carrinho Vazio
          </h1>
          <p className='text-gray-600 mb-6'>
            Adicione produtos ao carrinho para continuar.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className='bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600'
          >
            Continuar Comprando
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className='max-w-4xl mx-auto px-4 py-8'>
        <h1 className='text-3xl font-bold text-gray-800 mb-8'>
          Finalizar Pedido
        </h1>

        <form onSubmit={handleSubmit} className='space-y-8'>
          {/* Endereço de Entrega */}
          <div className='bg-white rounded-lg shadow-md p-6'>
            <h2 className='text-xl font-bold text-gray-800 mb-4'>
              Endereço de Entrega
            </h2>
            <div className='grid md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-gray-700 font-medium mb-2'>
                  Rua
                </label>
                <input
                  type='text'
                  value={endereco.rua}
                  onChange={e =>
                    setEndereco({ ...endereco, rua: e.target.value })
                  }
                  className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
                  required
                />
              </div>
              <div>
                <label className='block text-gray-700 font-medium mb-2'>
                  Número
                </label>
                <input
                  type='text'
                  value={endereco.numero}
                  onChange={e =>
                    setEndereco({ ...endereco, numero: e.target.value })
                  }
                  className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
                  required
                />
              </div>
              <div>
                <label className='block text-gray-700 font-medium mb-2'>
                  Bairro
                </label>
                <input
                  type='text'
                  value={endereco.bairro}
                  onChange={e =>
                    setEndereco({ ...endereco, bairro: e.target.value })
                  }
                  className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
                  required
                />
              </div>
              <div>
                <label className='block text-gray-700 font-medium mb-2'>
                  Cidade
                </label>
                <input
                  type='text'
                  value={endereco.cidade}
                  onChange={e =>
                    setEndereco({ ...endereco, cidade: e.target.value })
                  }
                  className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
                  required
                />
              </div>
              <div>
                <label className='block text-gray-700 font-medium mb-2'>
                  CEP
                </label>
                <input
                  type='text'
                  value={endereco.cep}
                  onChange={e =>
                    setEndereco({ ...endereco, cep: e.target.value })
                  }
                  className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
                  required
                />
              </div>
              <div>
                <label className='block text-gray-700 font-medium mb-2'>
                  Estado
                </label>
                <input
                  type='text'
                  value={endereco.estado}
                  onChange={e =>
                    setEndereco({ ...endereco, estado: e.target.value })
                  }
                  className='w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500'
                  required
                />
              </div>
            </div>
          </div>

          {/* Resumo do Pedido */}
          <div className='bg-white rounded-lg shadow-md p-6'>
            <h2 className='text-xl font-bold text-gray-800 mb-4'>
              Resumo do Pedido
            </h2>

            {cart.map(item => (
              <div
                key={item._id}
                className='flex justify-between items-center py-2 border-b border-gray-200'
              >
                <div>
                  <p className='font-medium'>{item.nome}</p>
                  <p className='text-gray-600 text-sm'>
                    Quantidade: {item.quantidade}
                  </p>
                </div>
                <p className='font-medium'>
                  R$ {(item.preco * item.quantidade).toFixed(2)}
                </p>
              </div>
            ))}

            <div className='mt-4 pt-4 border-t border-gray-200'>
              <div className='flex justify-between mb-2'>
                <span>Subtotal:</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className='flex justify-between mb-2'>
                <span>Royalties (5%):</span>
                <span>R$ {royalties.toFixed(2)}</span>
              </div>
              <div className='flex justify-between font-bold text-lg'>
                <span>Total:</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Forma de Pagamento */}
          <div className='bg-white rounded-lg shadow-md p-6'>
            <h2 className='text-xl font-bold text-gray-800 mb-4'>
              Forma de Pagamento
            </h2>
            <div className='grid md:grid-cols-2 gap-4'>
              <label
                className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                  formaPagamento === 'boleto'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300'
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
                  <div className='text-2xl mb-2'>💳</div>
                  <h3 className='font-bold'>Boleto Bancário</h3>
                  <p className='text-sm text-gray-600'>Pagamento na entrega</p>
                </div>
              </label>

              <label
                className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                  formaPagamento === 'transferencia'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300'
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
                  <div className='text-2xl mb-2'>🏦</div>
                  <h3 className='font-bold'>Transferência</h3>
                  <p className='text-sm text-gray-600'>Pagamento na entrega</p>
                </div>
              </label>
            </div>
          </div>

          {/* Botão Finalizar */}
          <button
            type='submit'
            disabled={loading}
            className='w-full bg-green-500 text-white py-4 rounded-lg text-lg font-bold hover:bg-green-600 transition disabled:opacity-50'
          >
            {loading
              ? 'Processando...'
              : `Finalizar Pedido - R$ ${total.toFixed(2)}`}
          </button>
        </form>
      </div>
    </Layout>
  );
}
