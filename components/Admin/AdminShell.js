// components/Admin/AdminShell.js - LAYOUT DA ÁREA ADMIN (SIDEBAR + HEADER)
// ===================================
// Estrutura no estilo CDC Manager: sidebar fixa no desktop, drawer no mobile,
// header com título/subtítulo/ações. Faz a verificação de admin e redireciona
// para a home se a sessão não for de administrador.
//
// Uso:
//   <AdminShell titulo='Fornecedores' subtitulo='...' acoes={<button/>}>
//     ...conteúdo...
//   </AdminShell>

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import Image from 'next/image';

// ══════════════════════════════════════════════════════════════
// NAVEGAÇÃO
// ══════════════════════════════════════════════════════════════
const NAV = [
  {
    grupo: 'Visão geral',
    itens: [{ href: '/admin', label: 'Dashboard', icone: IconeDashboard }],
  },
  {
    grupo: 'Operação',
    itens: [
      { href: '/admin-pedidos', label: 'Pedidos', icone: IconePedidos },
      { href: '/admin-produtos', label: 'Produtos', icone: IconeProdutos },
    ],
  },
  {
    grupo: 'Parceiros',
    itens: [
      { href: '/admin/fornecedores', label: 'Fornecedores', icone: IconeFornecedores },
      { href: '/admin/distribuidores', label: 'Distribuidores', icone: IconeDistribuidores },
    ],
  },
  {
    grupo: 'Financeiro',
    itens: [{ href: '/admin/financeiro', label: 'Controle financeiro', icone: IconeFinanceiro }],
  },
];

export default function AdminShell({
  titulo,
  subtitulo,
  acoes,
  children,
  larguraMax = 'max-w-7xl',
}) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [verificando, setVerificando] = useState(true);
  const [drawerAberto, setDrawerAberto] = useState(false);

  // ── Guarda de admin ──
  useEffect(() => {
    let ativo = true;
    fetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(data => {
        if (!ativo) return;
        if (data.user?.tipo !== 'admin') {
          router.replace(data.user ? '/dashboard' : '/');
          return;
        }
        setUser(data.user);
        setVerificando(false);
      })
      .catch(() => ativo && router.replace('/'));
    return () => {
      ativo = false;
    };
  }, [router]);

  // Fecha o drawer ao navegar
  useEffect(() => {
    const fechar = () => setDrawerAberto(false);
    router.events.on('routeChangeStart', fechar);
    return () => router.events.off('routeChangeStart', fechar);
  }, [router.events]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/');
    }
  };

  const ativo = href =>
    href === '/admin' ? router.pathname === '/admin' : router.pathname.startsWith(href);

  if (verificando) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800'></div>
      </div>
    );
  }

  const sidebar = (
    <div className='flex flex-col h-full'>
      {/* Marca */}
      <div className='h-16 flex items-center gap-3 px-5 border-b border-gray-800'>
        <Image
          src='/logo.png'
          alt='Elite Surfing'
          width={140}
          height={36}
          className='h-8 w-auto object-contain'
          priority
        />
      </div>

      {/* Menu */}
      <nav className='flex-1 overflow-y-auto px-3 py-4 space-y-6'>
        {NAV.map(grupo => (
          <div key={grupo.grupo}>
            <p className='px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500'>
              {grupo.grupo}
            </p>
            <ul className='space-y-0.5'>
              {grupo.itens.map(item => {
                const Icone = item.icone;
                const on = ativo(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                        on
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <Icone
                        className={`w-[18px] h-[18px] ${on ? 'text-blue-600' : 'text-gray-400'}`}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Utilizador */}
      <div className='border-t border-gray-800 p-4'>
        <div className='flex items-center gap-3'>
          <div className='w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm'>
            {(user?.nome || 'A').charAt(0).toUpperCase()}
          </div>
          <div className='min-w-0 flex-1'>
            <p className='text-sm font-semibold text-white truncate'>{user?.nome}</p>
            <p className='text-xs text-gray-400 truncate'>Administrador</p>
          </div>
          <button
            onClick={handleLogout}
            title='Sair'
            className='p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white'
          >
            <IconeSair className='w-[18px] h-[18px]' />
          </button>
        </div>
        <Link
          href='/dashboard'
          className='mt-3 block text-center text-xs text-gray-400 hover:text-white'
        >
          Ver portal como distribuidor →
        </Link>
      </div>
    </div>
  );

  return (
    <div className='min-h-screen bg-gray-50'>
      <Head>
        <title>{titulo ? `${titulo} · Admin` : 'Admin'} - Elite Surfing Portal</title>
      </Head>

      {/* Sidebar desktop */}
      <aside className='hidden lg:flex lg:flex-col fixed inset-y-0 left-0 w-64 bg-gray-900 z-30'>
        {sidebar}
      </aside>

      {/* Drawer mobile */}
      {drawerAberto && (
        <div className='lg:hidden fixed inset-0 z-50 flex'>
          <div className='fixed inset-0 bg-black/50' onClick={() => setDrawerAberto(false)} />
          <aside className='relative w-72 max-w-[85vw] bg-gray-900 h-full shadow-2xl'>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Conteúdo */}
      <div className='lg:pl-64 flex flex-col min-h-screen'>
        <header className='sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-gray-200'>
          <div className={`${larguraMax} mx-auto px-4 sm:px-6 lg:px-8`}>
            <div className='min-h-16 py-3 flex items-center justify-between gap-4'>
              <div className='flex items-center gap-3 min-w-0'>
                <button
                  onClick={() => setDrawerAberto(true)}
                  className='lg:hidden p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100'
                  aria-label='Abrir menu'
                >
                  <IconeMenu className='w-6 h-6' />
                </button>
                <div className='min-w-0'>
                  <h1 className='text-lg sm:text-xl font-bold text-gray-900 truncate'>{titulo}</h1>
                  {subtitulo && (
                    <p className='text-xs sm:text-sm text-gray-500 truncate'>{subtitulo}</p>
                  )}
                </div>
              </div>
              {acoes && <div className='flex items-center gap-2 shrink-0'>{acoes}</div>}
            </div>
          </div>
        </header>

        <main className={`${larguraMax} w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1`}>
          {children}
        </main>

        <footer className='py-4 text-center text-xs text-gray-400'>
          Elite Surfing Portal · Painel administrativo
        </footer>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ÍCONES (SVG inline, sem dependências)
// ══════════════════════════════════════════════════════════════
const svgProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
};

function IconeDashboard({ className }) {
  return (
    <svg className={className} {...svgProps}>
      <rect x='3' y='3' width='7' height='9' rx='1.5' />
      <rect x='14' y='3' width='7' height='5' rx='1.5' />
      <rect x='14' y='12' width='7' height='9' rx='1.5' />
      <rect x='3' y='16' width='7' height='5' rx='1.5' />
    </svg>
  );
}
function IconePedidos({ className }) {
  return (
    <svg className={className} {...svgProps}>
      <path d='M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z' />
      <path d='M3 6h18' />
      <path d='M16 10a4 4 0 0 1-8 0' />
    </svg>
  );
}
function IconeProdutos({ className }) {
  return (
    <svg className={className} {...svgProps}>
      <path d='M21 8 12 3 3 8v8l9 5 9-5V8Z' />
      <path d='M3 8l9 5 9-5' />
      <path d='M12 13v8' />
    </svg>
  );
}
function IconeFornecedores({ className }) {
  return (
    <svg className={className} {...svgProps}>
      <path d='M3 21h18' />
      <path d='M5 21V7l7-4 7 4v14' />
      <path d='M9 21v-6h6v6' />
      <path d='M9 10h.01M15 10h.01M12 10h.01' />
    </svg>
  );
}
function IconeDistribuidores({ className }) {
  return (
    <svg className={className} {...svgProps}>
      <circle cx='9' cy='8' r='3.5' />
      <path d='M2.5 20a6.5 6.5 0 0 1 13 0' />
      <circle cx='17' cy='9' r='2.5' />
      <path d='M21.5 19a5 5 0 0 0-6-4.5' />
    </svg>
  );
}
function IconeFinanceiro({ className }) {
  return (
    <svg className={className} {...svgProps}>
      <rect x='2' y='6' width='20' height='12' rx='2' />
      <circle cx='12' cy='12' r='2.5' />
      <path d='M6 12h.01M18 12h.01' />
    </svg>
  );
}
function IconeSair({ className }) {
  return (
    <svg className={className} {...svgProps}>
      <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' />
      <path d='M16 17l5-5-5-5' />
      <path d='M21 12H9' />
    </svg>
  );
}
function IconeMenu({ className }) {
  return (
    <svg className={className} {...svgProps}>
      <path d='M4 6h16M4 12h16M4 18h16' />
    </svg>
  );
}
