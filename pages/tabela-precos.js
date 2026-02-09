// pages/tabela-precos.js
// ===================================
// Página de Tabela de Preços do Distribuidor
// Refatorada - componentes divididos em ficheiros separados

import Head from 'next/head';
import Script from 'next/script';
import Layout from '../components/Layout';
import useTabelaPrecos from '../hooks/useTabelaPrecos';
import useExportTabela from '../hooks/useExportTabela';
import AbaEditar from '../components/TabelaPrecos/AbaEditar';
import AbaCompartilhar from '../components/TabelaPrecos/AbaCompartilhar';
import AbaMargens from '../components/TabelaPrecos/AbaMargens';

export default function TabelaPrecos() {
  const tabela = useTabelaPrecos();
  
  const exportar = useExportTabela({
    user: tabela.user,
    stats: tabela.stats,
    precos: tabela.precos,
    produtosOcultos: tabela.produtosOcultos,
    fornecedoresOcultos: tabela.fornecedoresOcultos,
    ordemCategorias: tabela.ordemCategorias,
    porCategoria: tabela.porCategoria,
    exportando: tabela.exportando,
    setExportando: tabela.setExportando,
    toast: tabela.toast,
  });

  // Loading
  if (tabela.loading) {
    return (
      <Layout>
        <div className='flex justify-center items-center h-64'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4'></div>
            <p className='text-gray-600'>Carregando tabela de preços...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>Tabela de Preços - Elite Surfing</title>
      </Head>

      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
        onLoad={() => tabela.setJsPdfLoaded(true)}
      />

      <Layout>
        <div className='max-w-7xl mx-auto px-4 py-4 lg:py-6'>
          {/* Header */}
          <div className='mb-4'>
            <h1 className='text-xl lg:text-2xl font-bold text-gray-800'>Tabela de Preços</h1>
            {tabela.ultimaAtualizacao && (
              <p className='text-sm text-gray-500'>
                Última atualização: {new Date(tabela.ultimaAtualizacao).toLocaleString('pt-BR')}
              </p>
            )}
          </div>

          {/* Abas */}
          <div className='border-b border-gray-200 mb-4'>
            <nav className='flex space-x-4 overflow-x-auto'>
              {[
                { id: 'editar', label: 'Editar Preços' },
                { id: 'compartilhar', label: 'Compartilhar' },
                { id: 'margens', label: 'Minhas Margens' },
              ].map((aba) => (
                <button
                  key={aba.id}
                  onClick={() => tabela.setAbaAtiva(aba.id)}
                  className={`py-3 px-4 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                    tabela.abaAtiva === aba.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {aba.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Conteúdo da aba ativa */}
          {tabela.abaAtiva === 'editar' && (
            <AbaEditar
              produtos={tabela.produtos}
              produtosFiltrados={tabela.produtosFiltrados}
              ordemCategorias={tabela.ordemCategorias}
              precos={tabela.precos}
              produtosOcultos={tabela.produtosOcultos}
              totalOcultos={tabela.totalOcultos}
              totalOcultosGeral={tabela.totalOcultosGeral}
              categoriasExpandidas={tabela.categoriasExpandidas}
              fornecedores={tabela.fornecedores}
              fornecedoresOcultos={tabela.fornecedoresOcultos}
              busca={tabela.busca}
              setBusca={tabela.setBusca}
              margemRapida={tabela.margemRapida}
              setMargemRapida={tabela.setMargemRapida}
              modoReordenar={tabela.modoReordenar}
              setModoReordenar={tabela.setModoReordenar}
              mostrarOcultos={tabela.mostrarOcultos}
              setMostrarOcultos={tabela.setMostrarOcultos}
              inputEmEdicao={tabela.inputEmEdicao}
              valorTemporario={tabela.valorTemporario}
              saving={tabela.saving}
              hasChanges={tabela.hasChanges}
              sensors={tabela.sensors}
              activeId={tabela.activeId}
              activeType={tabela.activeType}
              handleDragStart={tabela.handleDragStart}
              handleDragEnd={tabela.handleDragEnd}
              handleFocus={tabela.handleFocus}
              handleBlur={tabela.handleBlur}
              handleChangeTemporario={tabela.handleChangeTemporario}
              handleKeyDown={tabela.handleKeyDown}
              toggleOculto={tabela.toggleOculto}
              toggleFornecedorOculto={tabela.toggleFornecedorOculto}
              desocultarTodos={tabela.desocultarTodos}
              toggleCategoria={tabela.toggleCategoria}
              aplicarMargemGlobal={tabela.aplicarMargemGlobal}
              salvarAlteracoes={tabela.salvarAlteracoes}
            />
          )}

          {tabela.abaAtiva === 'compartilhar' && (
            <AbaCompartilhar
              stats={tabela.stats}
              exportando={tabela.exportando}
              jsPdfLoaded={tabela.jsPdfLoaded}
              emailCliente={tabela.emailCliente}
              setEmailCliente={tabela.setEmailCliente}
              setAbaAtiva={tabela.setAbaAtiva}
              exportarExcel={exportar.exportarExcel}
              baixarPDF={exportar.baixarPDF}
              visualizarPDF={exportar.visualizarPDF}
              compartilharExcel={exportar.compartilharExcel}
              compartilharPDF={exportar.compartilharPDF}
              enviarPorEmail={exportar.enviarPorEmail}
            />
          )}

          {tabela.abaAtiva === 'margens' && (
            <AbaMargens
              stats={tabela.stats}
              produtos={tabela.produtos}
              porCategoria={tabela.porCategoria}
              ordemCategorias={tabela.ordemCategorias}
              precos={tabela.precos}
              categoriasExpandidas={tabela.categoriasExpandidas}
              toggleCategoria={tabela.toggleCategoria}
            />
          )}
        </div>
      </Layout>
    </>
  );
}