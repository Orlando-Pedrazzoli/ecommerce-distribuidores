// components/AuthShell.js - LAYOUT DAS PÁGINAS DE AUTENTICAÇÃO
// ===================================
// Fundo escuro + cartão branco + logo, igual à tela de login.

import Head from 'next/head';
import Image from 'next/image';

export default function AuthShell({ titulo, subtitulo, children }) {
  return (
    <>
      <Head>
        <title>{titulo} - Elite Surfing</title>
      </Head>

      <div className='min-h-screen bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center p-4'>
        <div className='bg-white p-8 rounded-xl shadow-2xl w-full max-w-md'>
          <div className='text-center mb-8'>
            <div className='flex justify-center mb-4'>
              <Image
                src='/logo-dark.png'
                alt='Elite Surfing Logo'
                width={240}
                height={60}
                className='h-12 w-auto object-contain'
                priority
              />
            </div>
            <h2 className='text-xl font-semibold text-gray-700'>{titulo}</h2>
            {subtitulo && <p className='text-sm text-gray-500 mt-2'>{subtitulo}</p>}
          </div>
          {children}
        </div>
      </div>
    </>
  );
}

export const Alerta = ({ tipo = 'erro', children }) => {
  if (!children) return null;
  const estilos = {
    erro: 'bg-red-50 border-red-200 text-red-700',
    sucesso: 'bg-green-50 border-green-200 text-green-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };
  return (
    <div className={`border px-4 py-3 rounded-lg mb-6 text-sm ${estilos[tipo]}`}>
      {children}
    </div>
  );
};

export const BotaoPrimario = ({ loading, children, ...props }) => (
  <button
    type='submit'
    disabled={loading || props.disabled}
    {...props}
    className='w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold shadow-lg'
  >
    {loading ? (
      <>
        <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2'></div>
        Aguarde...
      </>
    ) : (
      children
    )}
  </button>
);

// Campo de senha com botão mostrar/ocultar e dica da política
export const CampoSenha = ({ id, label, value, onChange, autoComplete, dica, placeholder }) => {
  return (
    <div>
      <label htmlFor={id} className='block text-gray-700 text-sm font-semibold mb-2'>
        {label}
      </label>
      <input
        id={id}
        type='password'
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
        minLength={8}
        maxLength={72}
        className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200'
      />
      {dica && <p className='text-xs text-gray-400 mt-1'>{dica}</p>}
    </div>
  );
};

export const validarSenhaCliente = senha => {
  if (senha.length < 8) return 'A senha deve ter pelo menos 8 caracteres';
  if (!/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha)) {
    return 'A senha deve conter letras e números';
  }
  return null;
};
