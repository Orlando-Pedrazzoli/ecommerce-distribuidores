// components/TabelaPrecos/AbaEditar.js
// Aba de edição de preços com drag & drop

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { SortableCategory, SortableProduct } from './SortableItems';
import { IconDrag, IconReorder, IconCheck, IconChevron, IconEye } from './Icons';
import { formatarMoeda, calcularMargem, corMargem, badgeMargem } from '../../utils/formatters';

export default function AbaEditar({
  // Dados
  produtos,
  produtosFiltrados,
  ordemCategorias,
  precos,
  produtosOcultos,
  totalOcultos,
  totalOcultosGeral,
  categoriasExpandidas,
  fornecedores,
  fornecedoresOcultos,

  // UI State
  busca,
  setBusca,
  margemRapida,
  setMargemRapida,
  modoReordenar,
  setModoReordenar,
  mostrarOcultos,
  setMostrarOcultos,
  inputEmEdicao,
  valorTemporario,
  saving,
  hasChanges,
  sensors,
  activeId,
  activeType,

  // Handlers
  handleDragStart,
  handleDragEnd,
  handleFocus,
  handleBlur,
  handleChangeTemporario,
  handleKeyDown,
  toggleOculto,
  toggleFornecedorOculto,
  desocultarTodos,
  toggleCategoria,
  aplicarMargemGlobal,
  salvarAlteracoes,
}) {
  const [mostrarFiltroFornecedor, setMostrarFiltroFornecedor] = useState(false);
  return (
    <div>
      {/* Toolbar */}
      <div className='bg-white rounded-lg shadow-md p-4 mb-4'>
        <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'>
          {/* Margem rápida */}
          <div className='flex items-center gap-2'>
            <label className='text-sm text-gray-600'>Margem rápida:</label>
            <input
              type='number'
              value={margemRapida}
              onChange={(e) => setMargemRapida(e.target.value)}
              className='w-20 border rounded px-2 py-1 text-sm'
              min='0'
              max='200'
            />
            <span className='text-sm text-gray-500'>%</span>
            <button
              onClick={aplicarMargemGlobal}
              className='bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm transition'
            >
              Aplicar a todos
            </button>
          </div>

          {/* Busca */}
          <div className='flex items-center gap-2'>
            <input
              type='text'
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder='Buscar produto ou código...'
              className='border rounded px-3 py-1.5 text-sm w-full lg:w-64'
            />
          </div>

          {/* Botões de controle */}
          <div className='flex items-center gap-2 flex-wrap'>
            <button
              onClick={() => setModoReordenar(!modoReordenar)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition ${
                modoReordenar
                  ? 'bg-purple-500 text-white'
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}
            >
              <IconReorder />
              <span>{modoReordenar ? 'Sair Ordenação' : 'Ordenar'}</span>
            </button>

            {/* Filtro por Fornecedor */}
            {fornecedores.length > 0 && (
              <button
                onClick={() => setMostrarFiltroFornecedor(!mostrarFiltroFornecedor)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition ${
                  fornecedoresOcultos.length > 0
                    ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    : mostrarFiltroFornecedor
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z' />
                </svg>
                <span>
                  Fornecedores
                  {fornecedoresOcultos.length > 0 && ` (${fornecedoresOcultos.length} ocultos)`}
                </span>
              </button>
            )}

            {totalOcultosGeral > 0 && (
              <button
                onClick={() => setMostrarOcultos(!mostrarOcultos)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition ${
                  mostrarOcultos
                    ? 'bg-gray-200 text-gray-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <IconEye hidden={!mostrarOcultos} />
                <span>Ocultos ({totalOcultosGeral})</span>
              </button>
            )}
          </div>

          {/* Salvar */}
          <button
            onClick={salvarAlteracoes}
            disabled={saving || !hasChanges}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 ${
              hasChanges
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <>
                <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                Salvando...
              </>
            ) : (
              <>
                <IconCheck />
                Salvar Alterações
              </>
            )}
          </button>
        </div>

        {hasChanges && (
          <p className='text-sm text-yellow-600 mt-2'>⚠️ Você tem alterações não salvas</p>
        )}

        {modoReordenar && (
          <div className='mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg'>
            <p className='text-sm text-purple-800'>
              <strong>📋 Modo Ordenação:</strong> Arraste as categorias ou produtos usando o ícone ≡
              para reordenar. A nova ordem será aplicada na tabela, PDF e Excel após salvar.
            </p>
          </div>
        )}
      </div>

      {/* Painel de Filtro por Fornecedor */}
      {mostrarFiltroFornecedor && (
        <div className='bg-white rounded-lg shadow-md p-4 mb-4 border border-blue-200'>
          <div className='flex items-center justify-between mb-3'>
            <h3 className='font-medium text-gray-800 flex items-center gap-2'>
              <svg className='w-5 h-5 text-blue-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z' />
              </svg>
              Filtrar por Fornecedor
            </h3>
            <div className='flex items-center gap-2'>
              {(fornecedoresOcultos.length > 0 || totalOcultos > 0) && (
                <button
                  onClick={desocultarTodos}
                  className='text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1'
                >
                  <IconEye hidden={false} />
                  Mostrar Todos
                </button>
              )}
              <button
                onClick={() => setMostrarFiltroFornecedor(false)}
                className='text-gray-400 hover:text-gray-600 transition'
              >
                <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            </div>
          </div>
          <p className='text-xs text-gray-500 mb-3'>
            Clique no ícone do olho para ocultar/mostrar todos os produtos de um fornecedor na tabela, PDF e Excel.
          </p>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2'>
            {fornecedores.map((fornecedor) => {
              const isOculto = fornecedoresOcultos.includes(fornecedor);
              const qtdProdutos = produtos.filter((p) => p.fornecedor === fornecedor).length;
              return (
                <button
                  key={fornecedor}
                  onClick={() => toggleFornecedorOculto(fornecedor)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition ${
                    isOculto
                      ? 'bg-gray-100 border-gray-300 opacity-60'
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className={`flex-shrink-0 ${isOculto ? 'text-gray-400' : 'text-green-500'}`}>
                    <IconEye hidden={isOculto} />
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className={`text-sm font-medium truncate ${isOculto ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {fornecedor}
                    </p>
                    <p className='text-xs text-gray-400'>{qtdProdutos} produtos</p>
                  </div>
                  {isOculto && (
                    <span className='text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full flex-shrink-0'>
                      Oculto
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista com Drag & Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={ordemCategorias}
          strategy={verticalListSortingStrategy}
          disabled={!modoReordenar}
        >
          <div className='space-y-4'>
            {ordemCategorias.map((categoria) => {
              const produtosCategoria = produtosFiltrados[categoria];
              if (!produtosCategoria) return null;

              return (
                <SortableCategory key={categoria} id={categoria} disabled={!modoReordenar}>
                  {({ isDragging: catIsDragging }) => (
                    <div
                      className={`bg-white rounded-lg shadow-md overflow-hidden ${
                        catIsDragging ? 'ring-2 ring-purple-500 shadow-lg' : ''
                      } ${modoReordenar ? 'cursor-move' : ''}`}
                    >
                      {/* Header da categoria */}
                      <div
                        className={`flex items-center bg-gray-50 ${
                          modoReordenar ? 'cursor-grab active:cursor-grabbing' : ''
                        }`}
                        onClick={(e) => {
                          if (modoReordenar) e.stopPropagation();
                        }}
                      >
                        {modoReordenar && (
                          <div className='p-3 text-purple-500'>
                            <IconDrag />
                          </div>
                        )}

                        <button
                          onClick={(e) => {
                            if (modoReordenar) {
                              e.stopPropagation();
                            } else {
                              toggleCategoria(categoria);
                            }
                          }}
                          className='flex-1 flex items-center justify-between p-4 hover:bg-gray-100 transition text-left'
                        >
                          <div className='flex items-center gap-2'>
                            {modoReordenar && (
                              <span className='text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full'>
                                Arraste
                              </span>
                            )}
                            <span className='font-bold text-gray-800'>{categoria}</span>
                            <span className='text-sm text-gray-500'>
                              ({produtosCategoria.length} produtos)
                            </span>
                          </div>
                          <div className='flex items-center gap-2'>
                            {catIsDragging && (
                              <span className='text-xs bg-purple-500 text-white px-2 py-1 rounded-full animate-pulse'>
                                Solte para reposicionar
                              </span>
                            )}
                            <IconChevron expanded={categoriasExpandidas[categoria]} />
                          </div>
                        </button>
                      </div>

                      {/* Produtos */}
                      {categoriasExpandidas[categoria] && (
                        <div className='divide-y'>
                          {/* Header Desktop */}
                          <div className='hidden lg:grid lg:grid-cols-12 gap-4 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase'>
                            {modoReordenar && <div className='col-span-1'></div>}
                            <div className={modoReordenar ? 'col-span-1' : 'col-span-1'}>Código</div>
                            <div className={modoReordenar ? 'col-span-3' : 'col-span-4'}>Produto</div>
                            <div className='col-span-2 text-right'>Custo</div>
                            <div className='col-span-2 text-center'>Preço Venda</div>
                            <div className='col-span-3 text-right'>Margem</div>
                          </div>

                          <SortableContext
                            items={produtosCategoria.map((p) => p._id)}
                            strategy={verticalListSortingStrategy}
                            disabled={!modoReordenar}
                          >
                            {produtosCategoria.map((produto) => {
                              const margem = calcularMargem(produto._id, produtos, precos);
                              const isOculto = produtosOcultos.includes(produto._id);

                              return (
                                <SortableProduct
                                  key={produto._id}
                                  id={produto._id}
                                  disabled={!modoReordenar}
                                >
                                  {({ listeners: prodListeners, isDragging: prodIsDragging }) => (
                                    <div
                                      className={`p-4 hover:bg-gray-50 transition ${
                                        isOculto ? 'opacity-50 bg-gray-100' : ''
                                      } ${prodIsDragging ? 'bg-purple-50 ring-2 ring-purple-300' : ''}`}
                                    >
                                      {/* Mobile */}
                                      <div className='lg:hidden space-y-2'>
                                        <div className='flex justify-between items-start'>
                                          <div className='flex items-start gap-2'>
                                            {modoReordenar && (
                                              <div
                                                {...prodListeners}
                                                className='p-1 cursor-grab active:cursor-grabbing text-purple-400'
                                              >
                                                <IconDrag />
                                              </div>
                                            )}
                                            {!modoReordenar && (
                                              <button
                                                onClick={() => toggleOculto(produto._id)}
                                                className={`p-1 rounded transition ${
                                                  isOculto
                                                    ? 'text-gray-400'
                                                    : 'text-gray-300 hover:text-gray-500'
                                                }`}
                                                title={isOculto ? 'Mostrar produto' : 'Ocultar produto'}
                                              >
                                                <IconEye hidden={isOculto} />
                                              </button>
                                            )}
                                            <div>
                                              <span className='text-xs text-gray-500'>
                                                {produto.codigo}
                                              </span>
                                              <p className='font-medium text-gray-800 whitespace-normal break-words'>
                                                {produto.nome}
                                              </p>
                                            </div>
                                          </div>
                                          <span className={`text-sm font-bold ${corMargem(margem)}`}>
                                            {margem !== null
                                              ? `${margem.toFixed(1)}% ${badgeMargem(margem)}`
                                              : '-'}
                                          </span>
                                        </div>
                                        <div className='flex items-center justify-between'>
                                          <span className='text-sm text-gray-500'>
                                            Custo: R$ {formatarMoeda(produto.custoTotal)}
                                          </span>
                                          <div className='flex items-center gap-1'>
                                            <span className='text-sm'>R$</span>
                                            <input
                                              type='text'
                                              inputMode='decimal'
                                              value={
                                                inputEmEdicao === produto._id
                                                  ? valorTemporario
                                                  : precos[produto._id] !== null
                                                  ? formatarMoeda(precos[produto._id])
                                                  : ''
                                              }
                                              onChange={(e) => handleChangeTemporario(e.target.value)}
                                              onFocus={() => handleFocus(produto._id)}
                                              onBlur={() => handleBlur(produto._id)}
                                              onKeyDown={handleKeyDown}
                                              placeholder='0,00'
                                              disabled={modoReordenar}
                                              className='w-24 border rounded px-2 py-1 text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100'
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      {/* Desktop */}
                                      <div className='hidden lg:grid lg:grid-cols-12 gap-4 items-center'>
                                        {modoReordenar && (
                                          <div
                                            {...prodListeners}
                                            className='col-span-1 flex justify-center cursor-grab active:cursor-grabbing text-purple-400 hover:text-purple-600'
                                          >
                                            <IconDrag />
                                          </div>
                                        )}
                                        <div
                                          className={`${
                                            modoReordenar ? 'col-span-1' : 'col-span-1'
                                          } flex items-center`}
                                        >
                                          {!modoReordenar && (
                                            <button
                                              onClick={() => toggleOculto(produto._id)}
                                              className={`p-1 rounded transition ${
                                                isOculto
                                                  ? 'text-gray-400'
                                                  : 'text-gray-300 hover:text-gray-500'
                                              }`}
                                              title={isOculto ? 'Mostrar produto' : 'Ocultar produto'}
                                            >
                                              <IconEye hidden={isOculto} />
                                            </button>
                                          )}
                                          <span className='text-sm text-gray-600 ml-1'>
                                            {produto.codigo}
                                          </span>
                                        </div>
                                        <div className={modoReordenar ? 'col-span-3' : 'col-span-4'}>
                                          <p
                                            className='font-medium text-gray-800 whitespace-normal break-words'
                                            title={produto.nome}
                                          >
                                            {produto.nome}
                                          </p>
                                        </div>
                                        <div className='col-span-2 text-right text-sm text-gray-600'>
                                          R$ {formatarMoeda(produto.custoTotal)}
                                        </div>
                                        <div className='col-span-2 flex justify-center'>
                                          <div className='flex items-center gap-1'>
                                            <span className='text-sm text-gray-500'>R$</span>
                                            <input
                                              type='text'
                                              inputMode='decimal'
                                              value={
                                                inputEmEdicao === produto._id
                                                  ? valorTemporario
                                                  : precos[produto._id] !== null
                                                  ? formatarMoeda(precos[produto._id])
                                                  : ''
                                              }
                                              onChange={(e) => handleChangeTemporario(e.target.value)}
                                              onFocus={() => handleFocus(produto._id)}
                                              onBlur={() => handleBlur(produto._id)}
                                              onKeyDown={handleKeyDown}
                                              placeholder='0,00'
                                              disabled={modoReordenar}
                                              className='w-24 border rounded px-2 py-1.5 text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100'
                                            />
                                          </div>
                                        </div>
                                        <div
                                          className={`col-span-3 text-right font-medium ${corMargem(
                                            margem
                                          )}`}
                                        >
                                          {margem !== null ? (
                                            <span>
                                              {margem.toFixed(1)}% {badgeMargem(margem)}
                                            </span>
                                          ) : (
                                            <span className='text-gray-400'>-</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </SortableProduct>
                              );
                            })}
                          </SortableContext>
                        </div>
                      )}
                    </div>
                  )}
                </SortableCategory>
              );
            })}
          </div>
        </SortableContext>

        {/* Overlay durante arraste */}
        <DragOverlay>
          {activeId && activeType === 'category' ? (
            <div className='bg-purple-100 border-2 border-purple-500 rounded-lg p-4 shadow-xl transform rotate-2'>
              <div className='flex items-center gap-2'>
                <IconDrag />
                <span className='font-bold text-purple-800'>{activeId}</span>
                <span className='text-xs bg-purple-500 text-white px-2 py-1 rounded-full'>
                  Arrastando
                </span>
              </div>
            </div>
          ) : activeId && activeType === 'product' ? (
            <div className='bg-purple-50 border-2 border-purple-400 rounded p-3 shadow-lg'>
              <span className='text-purple-700'>
                {produtos.find((p) => p._id === activeId)?.nome || activeId}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}