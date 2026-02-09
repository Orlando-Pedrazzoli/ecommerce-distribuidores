// components/TabelaPrecos/AbaMargens.js
// Aba de análise de margens (informação confidencial)

import { IconChevron } from './Icons';
import { formatarMoeda, calcularMargem, corMargem, badgeMargem } from '../../utils/formatters';

export default function AbaMargens({
  stats,
  produtos,
  porCategoria,
  ordemCategorias,
  precos,
  categoriasExpandidas,
  toggleCategoria,
}) {
  return (
    <div>
      {/* Aviso confidencial */}
      <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4'>
        <div className='flex items-center gap-2'>
          <span className='text-xl'>🔒</span>
          <p className='text-yellow-800 font-medium'>Informação Confidencial</p>
        </div>
        <p className='text-sm text-yellow-700 mt-1'>
          Esta análise é privada e não será incluída nos arquivos compartilhados.
        </p>
      </div>

      {/* Resumo Geral */}
      {stats && (
        <div className='bg-white rounded-lg shadow-md p-4 mb-4'>
          <h3 className='font-bold text-gray-800 mb-4'>Resumo Geral</h3>
          <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'>
            <div className='text-center p-3 bg-gray-50 rounded-lg'>
              <p className='text-2xl font-bold text-gray-800'>{stats.totalProdutos}</p>
              <p className='text-xs text-gray-500'>Total Produtos</p>
            </div>
            <div className='text-center p-3 bg-blue-50 rounded-lg'>
              <p className='text-2xl font-bold text-blue-600'>{stats.comPreco}</p>
              <p className='text-xs text-gray-500'>Com Preço</p>
            </div>
            <div className='text-center p-3 bg-gray-50 rounded-lg'>
              <p className='text-2xl font-bold text-gray-600'>{stats.semPreco}</p>
              <p className='text-xs text-gray-500'>Sem Preço</p>
            </div>
            <div className='text-center p-3 bg-purple-50 rounded-lg'>
              <p className='text-2xl font-bold text-purple-600'>{stats.margemMedia.toFixed(1)}%</p>
              <p className='text-xs text-gray-500'>Margem Média</p>
            </div>
            <div className='text-center p-3 bg-green-50 rounded-lg'>
              <p className='text-2xl font-bold text-green-600'>{stats.margemVerde}</p>
              <p className='text-xs text-gray-500'>🟢 ≥30%</p>
            </div>
            <div className='text-center p-3 bg-yellow-50 rounded-lg'>
              <p className='text-2xl font-bold text-yellow-600'>{stats.margemAmarela}</p>
              <p className='text-xs text-gray-500'>🟡 15-29%</p>
            </div>
          </div>
        </div>
      )}

      {/* Categorias com margens */}
      <div className='space-y-4'>
        {ordemCategorias.map((categoria) => {
          const produtosCategoria = porCategoria[categoria];
          if (!produtosCategoria) return null;

          const produtosComMargem = produtosCategoria.filter((p) => precos[p._id]);
          if (produtosComMargem.length === 0) return null;

          const margemCategoria =
            produtosComMargem.reduce((sum, p) => {
              const m = calcularMargem(p._id, produtos, precos);
              return sum + (m || 0);
            }, 0) / produtosComMargem.length;

          return (
            <div key={categoria} className='bg-white rounded-lg shadow-md overflow-hidden'>
              <button
                onClick={() => toggleCategoria(categoria)}
                className='w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition'
              >
                <div className='flex items-center gap-3'>
                  <span className='font-bold text-gray-800'>{categoria}</span>
                  <span className={`text-sm font-medium ${corMargem(margemCategoria)}`}>
                    Margem média: {margemCategoria.toFixed(1)}%
                  </span>
                </div>
                <IconChevron expanded={categoriasExpandidas[categoria]} />
              </button>

              {categoriasExpandidas[categoria] && (
                <div className='divide-y'>
                  {/* Header Desktop */}
                  <div className='hidden lg:grid lg:grid-cols-12 gap-4 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase'>
                    <div className='col-span-1'>Código</div>
                    <div className='col-span-4'>Produto</div>
                    <div className='col-span-2 text-right'>Custo</div>
                    <div className='col-span-2 text-right'>Venda</div>
                    <div className='col-span-2 text-right'>Lucro</div>
                    <div className='col-span-1 text-right'>Margem</div>
                  </div>

                  {produtosCategoria.map((produto) => {
                    const preco = precos[produto._id];
                    const margem = calcularMargem(produto._id, produtos, precos);
                    const lucro = preco ? preco - produto.custoTotal : null;

                    return (
                      <div key={produto._id} className='p-4 hover:bg-gray-50'>
                        {/* Mobile */}
                        <div className='lg:hidden space-y-2'>
                          <div className='flex justify-between'>
                            <div>
                              <span className='text-xs text-gray-500'>{produto.codigo}</span>
                              <p className='font-medium whitespace-normal break-words'>
                                {produto.nome}
                              </p>
                            </div>
                            <span className={`font-bold ${corMargem(margem)}`}>
                              {margem !== null
                                ? `${margem.toFixed(1)}% ${badgeMargem(margem)}`
                                : '-'}
                            </span>
                          </div>
                          <div className='flex justify-between text-sm'>
                            <span className='text-gray-500'>
                              Custo: R$ {formatarMoeda(produto.custoTotal)}
                            </span>
                            <span className='text-gray-500'>
                              Venda: R$ {formatarMoeda(preco)}
                            </span>
                            <span
                              className={
                                lucro && lucro > 0 ? 'text-green-600 font-medium' : 'text-red-600'
                              }
                            >
                              {lucro !== null
                                ? `${lucro > 0 ? '+' : ''}R$ ${formatarMoeda(lucro)}`
                                : '-'}
                            </span>
                          </div>
                        </div>

                        {/* Desktop */}
                        <div className='hidden lg:grid lg:grid-cols-12 gap-4 items-center'>
                          <div className='col-span-1 text-sm text-gray-600'>{produto.codigo}</div>
                          <div className='col-span-4 font-medium whitespace-normal break-words'>
                            {produto.nome}
                          </div>
                          <div className='col-span-2 text-right text-sm text-gray-600'>
                            R$ {formatarMoeda(produto.custoTotal)}
                          </div>
                          <div className='col-span-2 text-right text-sm'>
                            {preco ? (
                              `R$ ${formatarMoeda(preco)}`
                            ) : (
                              <span className='text-gray-400'>-</span>
                            )}
                          </div>
                          <div className='col-span-2 text-right'>
                            {lucro !== null ? (
                              <span
                                className={
                                  lucro > 0 ? 'text-green-600 font-medium' : 'text-red-600'
                                }
                              >
                                {lucro > 0 ? '+' : ''}R$ {formatarMoeda(lucro)}
                              </span>
                            ) : (
                              <span className='text-gray-400'>-</span>
                            )}
                          </div>
                          <div className={`col-span-1 text-right font-bold ${corMargem(margem)}`}>
                            {margem !== null ? `${margem.toFixed(1)}%` : '-'} {badgeMargem(margem)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}