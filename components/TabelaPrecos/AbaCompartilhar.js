// components/TabelaPrecos/AbaCompartilhar.js
// Aba de compartilhamento (Excel, PDF, Email)

import { IconDownload, IconShare, IconPrint, IconExcel, IconPDF, IconMail, IconSend } from './Icons';

export default function AbaCompartilhar({
  stats,
  exportando,
  jsPdfLoaded,
  emailCliente,
  setEmailCliente,
  setAbaAtiva,
  // Export handlers
  exportarExcel,
  baixarPDF,
  visualizarPDF,
  compartilharExcel,
  compartilharPDF,
  enviarPorEmail,
}) {
  return (
    <div className='bg-white rounded-lg shadow-md p-6'>
      <h2 className='text-lg font-bold text-gray-800 mb-2'>Compartilhar Tabela de Preços</h2>

      {stats?.comPreco === 0 ? (
        <div className='text-center py-8'>
          <div className='text-5xl mb-4'>📋</div>
          <p className='text-gray-600 mb-4'>Você ainda não definiu preços de venda.</p>
          <button
            onClick={() => setAbaAtiva('editar')}
            className='bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition'
          >
            Definir Preços
          </button>
        </div>
      ) : (
        <>
          <p className='text-gray-600 mb-6'>
            Exporte sua tabela para compartilhar com seus clientes.
            <span className='text-sm text-gray-500 ml-2'>({stats?.comPreco} produtos com preço)</span>
          </p>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Excel */}
            <div className='border-2 border-gray-200 rounded-xl p-6 hover:border-green-500 hover:shadow-lg transition'>
              <div className='flex items-center gap-3 mb-4'>
                <div className='w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center'>
                  <IconExcel />
                </div>
                <div>
                  <h3 className='font-bold text-lg'>Excel (.xlsx)</h3>
                  <p className='text-sm text-gray-500'>Arquivo leve e editável</p>
                </div>
              </div>

              <div className='space-y-3'>
                <button
                  onClick={exportarExcel}
                  disabled={exportando}
                  className='w-full bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium'
                >
                  <IconDownload />
                  Baixar Excel
                </button>

                <button
                  onClick={compartilharExcel}
                  disabled={exportando}
                  className='w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium'
                >
                  <IconShare />
                  Compartilhar
                </button>
              </div>
            </div>

            {/* PDF */}
            <div className='border-2 border-gray-200 rounded-xl p-6 hover:border-red-500 hover:shadow-lg transition'>
              <div className='flex items-center gap-3 mb-4'>
                <div className='w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center'>
                  <IconPDF />
                </div>
                <div>
                  <h3 className='font-bold text-lg'>PDF</h3>
                  <p className='text-sm text-gray-500'>Visual formatado para impressão</p>
                </div>
              </div>

              <div className='space-y-3'>
                <button
                  onClick={baixarPDF}
                  disabled={exportando || !jsPdfLoaded}
                  className='w-full bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium'
                >
                  <IconDownload />
                  Baixar PDF
                </button>

                <button
                  onClick={compartilharPDF}
                  disabled={exportando || !jsPdfLoaded}
                  className='w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium'
                >
                  <IconShare />
                  Compartilhar
                </button>

                <button
                  onClick={visualizarPDF}
                  disabled={exportando || !jsPdfLoaded}
                  className='w-full bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm'
                >
                  <IconPrint />
                  Visualizar / Imprimir
                </button>
              </div>
            </div>
          </div>

          {/* Email */}
          <div className='mt-6 border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg transition'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center'>
                <IconMail />
              </div>
              <div>
                <h3 className='font-bold text-lg'>Enviar por Email</h3>
                <p className='text-sm text-gray-500'>Baixe o arquivo e envie para seu cliente</p>
              </div>
            </div>

            <div className='space-y-3'>
              <div>
                <label className='block text-sm text-gray-600 mb-1'>Email do cliente:</label>
                <input
                  type='email'
                  value={emailCliente}
                  onChange={(e) => setEmailCliente(e.target.value)}
                  placeholder='cliente@email.com'
                  className='w-full border rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none'
                />
              </div>

              <button
                onClick={() => enviarPorEmail(emailCliente)}
                disabled={!emailCliente.trim()}
                className='w-full bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium'
              >
                <IconSend />
                Abrir Email para Enviar
              </button>

              <p className='text-xs text-gray-500 text-center'>
                Abre seu aplicativo de email com a mensagem pronta. Anexe o PDF ou Excel antes de
                enviar.
              </p>
            </div>
          </div>

          <div className='mt-6 p-4 bg-blue-50 rounded-lg'>
            <p className='text-sm text-blue-800'>
              <strong>💡 Dica:</strong> No celular, o botão "Compartilhar" abre diretamente o
              WhatsApp, Email e outros apps. No computador, o arquivo será baixado para você enviar
              manualmente.
            </p>
          </div>
        </>
      )}
    </div>
  );
}