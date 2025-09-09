// pages/_document.js - VERSÃO SIMPLES
// ===================================

import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang='pt-BR'>
      <Head>
        {/* FAVICON FUNCIONANDO EM TODOS DISPOSITIVOS */}
        <link rel='icon' href='/ES_Icon.ico' />
      </Head>
      <body className='antialiased'>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
