// pages/_document.js
// ===================================

import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang='pt-BR'>
      <Head>
        {/* 🎯 FAVICON SVG */}
        <link rel='icon' href='/ES_Icon.svg' type='image/svg+xml' />

        {/* 🎯 TÍTULO PADRÃO */}
        <title>Elite Surfing - Distribuidores</title>
      </Head>
      <body className='antialiased'>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
