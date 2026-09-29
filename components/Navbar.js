// components/Navbar.js - NAVEGAÇÃO DO PORTAL (DISTRIBUIDOR + ADMIN)
// ===================================
// Desktop: barra superior com links, carrinho e menu do utilizador.
// Mobile: barra superior compacta (logo + carrinho) e TAB BAR fixa em baixo
// com Início · Pedidos · Carrinho · Pagamentos · Mais. Os distribuidores
// fazem pedidos sobretudo pelo telemóvel, por isso o polegar manda.

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '../pages/_app';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import Cart from './Cart';

export default function Navbar() {
  const { cartCount } = useCart();
  const router = useRouter();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [menuMaisAberto, setMenuMaisAberto] = useState(false);
  const [menuUserAberto, setMenuUserAberto] = useState(false);
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [pendencias, setPendencias] = useState(0);
  const menuUserRef = useRef(null);

  useEffect(() => {
    buscarDadosUsuario();
  }, []);

  // Fecha menus ao navegar
  useEffect(() => {
    const fechar = () => {
      setMenuMaisAberto(false);
      setMenuUserAberto(false);
    };
    router.events.on('routeChangeStart', fechar);
    return () => router.events.off('routeChangeStart', fechar);
  }, [router.events]);

  // Fecha o menu do utilizador ao clicar fora
  useEffect(() => {
    const handler = e => {
      if (menuUserRef.current && !menuUserRef.current.contains(e.target)) setMenuUserAberto(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const buscarDadosUsuario = async () => {
    try {
      setLoadingUser(true);
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        if (data.user?.tipo === 'distribuidor') buscarPendencias();
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  };

  const buscarPendencias = async () => {
    try {
      const response = await fetch('/api/user/pagamentos');
      if (response.ok) {
        const data = await response.json();
        setPendencias(data.resumo?.totalPendente || 0);
      }
    } catch (error) {
      console.error('Erro ao buscar pendências:', error);
    }
  };

  const handleLogout = async () => {
    if (!confirm('Deseja realmente sair?')) return;
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Erro ao encerrar sessão:', error);
    } finally {
      setUser(null);
      router.push('/');
    }
  };

  const isActive = path =>
    path === '/dashboard' ? router.pathname === path : router.pathname.startsWith(path);

  if (loadingUser) {
    return <div className='h-14 bg-gray-900' />;
  }
  if (!user) return null;

  const ehDistribuidor = user.tipo === 'distribuidor';

  const linksDesktop = ehDistribuidor
    ? [
        { href: '/dashboard', label: 'Início', Icone: IconeInicio },
        { href: '/meus-pedidos', label: 'Pedidos', Icone: IconePedidos },
        {
          href: '/pagamentos',
          label: 'Pagamentos',
          Icone: IconePagamentos,
          alerta: pendencias > 0,
        },
        { href: '/tabela-precos', label: 'Tabela de preços', Icone: IconeTabela },
      ]
    : [{ href: '/admin', label: 'Painel admin', Icone: IconeInicio }];

  return (
    <>
      {/* ═══════════ BARRA SUPERIOR ═══════════ */}
      <nav className='sticky top-0 z-40 bg-gray-900 text-white shadow-md'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='h-14 flex items-center justify-between gap-3'>
            {/* Logo */}
            <Link
              href={ehDistribuidor ? '/dashboard' : '/admin'}
              className='flex items-center shrink-0 hover:opacity-80 transition'
            >
              <Image
                src='/logo.png'
                alt='Elite Surfing'
                width={150}
                height={34}
                className='h-7 md:h-8 w-auto object-contain'
                priority
              />
            </Link>

            {/* Links desktop */}
            <div className='hidden md:flex items-center gap-1 flex-1 justify-center'>
              {linksDesktop.map(({ href, label, Icone, alerta }) => (
                <Link
                  key={href}
                  href={href}
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                    isActive(href)
                      ? 'bg-white text-gray-900'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icone className='w-4 h-4' />
                  {label}
                  {alerta && (
                    <span className='absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-gray-900' />
                  )}
                </Link>
              ))}
            </div>

            {/* Direita: carrinho + utilizador */}
            <div className='flex items-center gap-1'>
              {ehDistribuidor && (
                <button
                  onClick={() => setIsCartOpen(true)}
                  className='relative p-2.5 rounded-lg hover:bg-gray-800 transition'
                  title='Abrir carrinho'
                  aria-label='Carrinho'
                >
                  <IconeCarrinho className='w-6 h-6' />
                  {cartCount > 0 && (
                    <span className='absolute -top-0.5 -right-0.5 bg-blue-500 text-white rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center text-[11px] font-bold ring-2 ring-gray-900'>
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </button>
              )}

              {/* Menu do utilizador (desktop) */}
              <div className='relative hidden md:block' ref={menuUserRef}>
                <button
                  onClick={() => setMenuUserAberto(v => !v)}
                  className='flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-gray-800 transition'
                >
                  <span className='w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold'>
                    {(user.nome || '?').charAt(0).toUpperCase()}
                  </span>
                  <span className='text-sm font-medium max-w-[140px] truncate'>{user.nome}</span>
                  <svg
                    className='w-4 h-4 text-gray-400'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth={2}
                    viewBox='0 0 24 24'
                  >
                    <path strokeLinecap='round' strokeLinejoin='round' d='M19 9l-7 7-7-7' />
                  </svg>
                </button>
                {menuUserAberto && (
                  <div className='absolute right-0 mt-1 w-56 bg-white text-gray-800 rounded-lg shadow-xl border border-gray-200 overflow-hidden'>
                    <div className='px-4 py-3 border-b border-gray-100'>
                      <p className='text-sm font-semibold truncate'>{user.nome}</p>
                      <p className='text-xs text-gray-500 truncate'>{user.email}</p>
                    </div>
                    {ehDistribuidor && (
                      <Link
                        href='/tabela-precos'
                        className='block px-4 py-2.5 text-sm hover:bg-gray-50'
                      >
                        Tabela de preços
                      </Link>
                    )}
                    <Link
                      href='/alterar-senha'
                      className='block px-4 py-2.5 text-sm hover:bg-gray-50'
                    >
                      Alterar senha
                    </Link>
                    {user.tipo === 'admin' && (
                      <Link href='/admin' className='block px-4 py-2.5 text-sm hover:bg-gray-50'>
                        Painel admin
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className='w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100'
                    >
                      Sair
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* ═══════════ TAB BAR MOBILE (só distribuidor) ═══════════ */}
      {ehDistribuidor && (
        <>
          <nav
            className='md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]'
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className='grid grid-cols-5 h-16'>
              <TabItem
                href='/dashboard'
                label='Início'
                Icone={IconeInicio}
                ativo={isActive('/dashboard')}
              />
              <TabItem
                href='/meus-pedidos'
                label='Pedidos'
                Icone={IconePedidos}
                ativo={isActive('/meus-pedidos')}
              />
              <button
                onClick={() => setIsCartOpen(true)}
                className='relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-gray-500 active:bg-gray-100'
              >
                <span className='relative -mt-5 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg ring-4 ring-white'>
                  <IconeCarrinho className='w-6 h-6' />
                  {cartCount > 0 && (
                    <span className='absolute -top-1 -right-1 bg-red-500 text-white rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center text-[11px] font-bold ring-2 ring-white'>
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </span>
                Carrinho
              </button>
              <TabItem
                href='/pagamentos'
                label='Pagamentos'
                Icone={IconePagamentos}
                ativo={isActive('/pagamentos')}
                alerta={pendencias > 0}
              />
              <button
                onClick={() => setMenuMaisAberto(true)}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium active:bg-gray-100 ${
                  menuMaisAberto || isActive('/tabela-precos') || isActive('/alterar-senha')
                    ? 'text-blue-600'
                    : 'text-gray-500'
                }`}
              >
                <IconeMais className='w-6 h-6' />
                Mais
              </button>
            </div>
          </nav>

          {/* Folha "Mais" */}
          {menuMaisAberto && (
            <div className='md:hidden fixed inset-0 z-50' onClick={() => setMenuMaisAberto(false)}>
              <div className='absolute inset-0 bg-black/40' />
              <div
                className='absolute bottom-0 inset-x-0 bg-white rounded-t-2xl shadow-2xl p-4'
                style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
                onClick={e => e.stopPropagation()}
              >
                <div className='mx-auto w-10 h-1 rounded-full bg-gray-300 mb-4' />
                <div className='flex items-center gap-3 px-1 pb-3 mb-2 border-b border-gray-100'>
                  <span className='w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold'>
                    {(user.nome || '?').charAt(0).toUpperCase()}
                  </span>
                  <div className='min-w-0'>
                    <p className='text-sm font-semibold text-gray-900 truncate'>{user.nome}</p>
                    <p className='text-xs text-gray-500 truncate'>{user.email}</p>
                  </div>
                </div>
                <ItemFolha
                  href='/tabela-precos'
                  Icone={IconeTabela}
                  titulo='Tabela de preços'
                  desc='Monte e partilhe a sua tabela de revenda'
                />
                <ItemFolha
                  href='/alterar-senha'
                  Icone={IconeCadeado}
                  titulo='Alterar senha'
                  desc='Segurança da sua conta'
                />
                <button
                  onClick={handleLogout}
                  className='w-full mt-2 flex items-center gap-3 px-3 py-3 rounded-xl text-red-600 active:bg-red-50'
                >
                  <IconeSair className='w-5 h-5' />
                  <span className='text-sm font-semibold'>Sair</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Carrinho */}
      {ehDistribuidor && <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ══════════════════════════════════════════════════════════════
const TabItem = ({ href, label, Icone, ativo, alerta }) => (
  <Link
    href={href}
    className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium active:bg-gray-100 ${
      ativo ? 'text-blue-600' : 'text-gray-500'
    }`}
  >
    <Icone className='w-6 h-6' />
    {label}
    {alerta && (
      <span className='absolute top-2 right-1/2 translate-x-4 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white' />
    )}
  </Link>
);

const ItemFolha = ({ href, Icone, titulo, desc }) => (
  <Link href={href} className='flex items-center gap-3 px-3 py-3 rounded-xl active:bg-gray-100'>
    <span className='w-10 h-10 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center'>
      <Icone className='w-5 h-5' />
    </span>
    <span className='min-w-0'>
      <span className='block text-sm font-semibold text-gray-900'>{titulo}</span>
      <span className='block text-xs text-gray-500'>{desc}</span>
    </span>
  </Link>
);

// ── Ícones ──
const p = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
};
function IconeInicio({ className }) {
  return (
    <svg className={className} {...p}>
      <path d='M3 11 12 3l9 8' />
      <path d='M5 10v10h5v-6h4v6h5V10' />
    </svg>
  );
}
function IconePedidos({ className }) {
  return (
    <svg className={className} {...p}>
      <path d='M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z' />
      <path d='M3 6h18' />
      <path d='M16 10a4 4 0 0 1-8 0' />
    </svg>
  );
}
function IconePagamentos({ className }) {
  return (
    <svg className={className} {...p}>
      <rect x='2' y='6' width='20' height='12' rx='2' />
      <path d='M2 10h20' />
      <path d='M6 15h4' />
    </svg>
  );
}
function IconeTabela({ className }) {
  return (
    <svg className={className} {...p}>
      <rect x='4' y='3' width='16' height='18' rx='2' />
      <path d='M8 7h8M8 11h8M8 15h5' />
    </svg>
  );
}
function IconeCarrinho({ className }) {
  return (
    <svg className={className} {...p}>
      <circle cx='9' cy='20' r='1.5' />
      <circle cx='18' cy='20' r='1.5' />
      <path d='M2 3h3l2.6 11.4a1 1 0 0 0 1 .8h9.6a1 1 0 0 0 1-.8L21 7H6' />
    </svg>
  );
}
function IconeMais({ className }) {
  return (
    <svg className={className} {...p}>
      <circle cx='5' cy='12' r='1.5' fill='currentColor' stroke='none' />
      <circle cx='12' cy='12' r='1.5' fill='currentColor' stroke='none' />
      <circle cx='19' cy='12' r='1.5' fill='currentColor' stroke='none' />
    </svg>
  );
}
function IconeCadeado({ className }) {
  return (
    <svg className={className} {...p}>
      <rect x='5' y='11' width='14' height='10' rx='2' />
      <path d='M8 11V7a4 4 0 0 1 8 0v4' />
    </svg>
  );
}
function IconeSair({ className }) {
  return (
    <svg className={className} {...p}>
      <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' />
      <path d='M16 17l5-5-5-5' />
      <path d='M21 12H9' />
    </svg>
  );
}
