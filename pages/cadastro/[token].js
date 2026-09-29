// pages/cadastro/[token].js - CADASTRO DE DISTRIBUIDOR VIA CONVITE (PÚBLICO)
// ===================================
// URL: /cadastro/<token>  (link enviado por /admin/distribuidores → Convites)
// O distribuidor escolhe usuário e senha e preenche os dados. No fim já fica
// autenticado e é levado para o dashboard.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AuthShell, {
  Alerta,
  BotaoPrimario,
  CampoSenha,
  validarSenhaCliente,
} from '../../components/AuthShell';

const ENDERECO_VAZIO = {
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  cep: '',
  estado: '',
};

const inputClass =
  'w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200';

export default function CadastroConvite() {
  const router = useRouter();
  const { token } = router.query;

  // 'validando' | 'ok' | 'invalido' | 'concluido'
  const [estado, setEstado] = useState('validando');
  const [convite, setConvite] = useState(null);
  const [passo, setPasso] = useState(1); // 1 = conta, 2 = endereço (opcional)

  const [usuario, setUsuario] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [endereco, setEndereco] = useState(ENDERECO_VAZIO);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    if (!token) return setEstado('invalido');
    fetch(`/api/convites/${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.valido) {
          setConvite(data);
          setNome(data.nome || '');
          setUsuario(sugerirUsuario(data.nome || ''));
          setEstado('ok');
        } else {
          setEstado('invalido');
        }
      })
      .catch(() => setEstado('invalido'));
  }, [router.isReady, token]);

  const sugerirUsuario = valor =>
    valor
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9._-]+/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 30);

  const validarPasso1 = () => {
    if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) {
      return 'Usuário: 3-30 caracteres, só letras minúsculas, números, ponto, hífen ou underscore';
    }
    if (!nome.trim()) return 'Informe o nome ou razão social';
    if (!telefone.trim()) return 'Informe um telefone de contacto';
    const erroSenha = validarSenhaCliente(senha);
    if (erroSenha) return erroSenha;
    if (senha !== confirmar) return 'As senhas não coincidem';
    return null;
  };

  const avancar = e => {
    e.preventDefault();
    setError('');
    const erro = validarPasso1();
    if (erro) return setError(erro);
    setPasso(2);
  };

  const concluir = async (e, enderecoEnviar = endereco) => {
    e.preventDefault();
    setError('');
    const erro = validarPasso1();
    if (erro) {
      setPasso(1);
      return setError(erro);
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/convites/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, nome, telefone, senha, endereco: enderecoEnviar }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setEstado('concluido');
        setTimeout(() => router.push('/dashboard'), 2000);
      } else {
        setError(data.message || 'Não foi possível concluir o cadastro');
        if (/usu[aá]rio/i.test(data.message || '')) setPasso(1);
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ── Estados ──
  if (estado === 'validando') {
    return (
      <AuthShell titulo='Verificando convite...'>
        <div className='flex justify-center py-6'>
          <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600'></div>
        </div>
      </AuthShell>
    );
  }

  if (estado === 'invalido') {
    return (
      <AuthShell titulo='Convite inválido ou expirado'>
        <div className='text-center'>
          <div className='mx-auto mb-4 w-14 h-14 rounded-full bg-red-50 flex items-center justify-center'>
            <svg
              className='w-7 h-7 text-red-600'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          </div>
          <p className='text-sm text-gray-600 mb-6'>
            Este convite já foi utilizado, foi cancelado ou passou do prazo de validade. Peça um
            novo convite ao administrador.
          </p>
          <Link href='/' className='text-sm text-gray-500 hover:underline'>
            ← Voltar para o login
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (estado === 'concluido') {
    return (
      <AuthShell titulo='Conta criada!'>
        <div className='text-center'>
          <div className='mx-auto mb-4 w-14 h-14 rounded-full bg-green-50 flex items-center justify-center'>
            <svg
              className='w-7 h-7 text-green-600'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M5 13l4 4L19 7'
              />
            </svg>
          </div>
          <p className='text-sm text-gray-600 mb-6'>
            Bem-vindo(a), <strong>{nome}</strong>. Seu usuário é{' '}
            <strong className='font-mono'>{usuario}</strong>. Redirecionando para o portal...
          </p>
          <Link href='/dashboard' className='text-blue-600 hover:underline text-sm font-medium'>
            Entrar agora
          </Link>
        </div>
      </AuthShell>
    );
  }

  // ── Formulário ──
  return (
    <AuthShell
      titulo='Crie sua conta de distribuidor'
      subtitulo={`Convite enviado para ${convite.email}`}
    >
      {/* Passos */}
      <div className='flex items-center gap-2 text-xs mb-6'>
        {['Sua conta', 'Endereço de entrega'].map((rotulo, i) => {
          const n = i + 1;
          const ativo = passo === n;
          const feito = passo > n;
          return (
            <div key={rotulo} className='flex items-center gap-2 flex-1'>
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                  ativo
                    ? 'bg-blue-600 text-white'
                    : feito
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {feito ? '✓' : n}
              </span>
              <span className={ativo ? 'text-gray-800 font-semibold' : 'text-gray-400'}>
                {rotulo}
              </span>
              {i === 0 && <span className='flex-1 h-px bg-gray-200 mx-1' />}
            </div>
          );
        })}
      </div>

      <Alerta tipo='erro'>{error}</Alerta>

      {passo === 1 && (
        <form onSubmit={avancar} className='space-y-5'>
          <div>
            <label className='block text-gray-700 text-sm font-semibold mb-2'>
              Nome / Razão social
            </label>
            <input
              type='text'
              value={nome}
              onChange={e => {
                setNome(e.target.value);
                if (!usuario || usuario === sugerirUsuario(nome))
                  setUsuario(sugerirUsuario(e.target.value));
              }}
              required
              className={inputClass}
              placeholder='Ex.: Surf Shop Rio Ltda'
              autoFocus
            />
          </div>

          <div>
            <label className='block text-gray-700 text-sm font-semibold mb-2'>
              Nome de usuário (login)
            </label>
            <input
              type='text'
              value={usuario}
              onChange={e => setUsuario(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
              required
              minLength={3}
              maxLength={30}
              autoComplete='username'
              className={`${inputClass} font-mono`}
              placeholder='ex.: surfshop.rio'
            />
            <p className='text-xs text-gray-400 mt-1'>
              É com este nome que você entra no portal. Não pode ser alterado depois.
            </p>
          </div>

          <div>
            <label className='block text-gray-700 text-sm font-semibold mb-2'>
              Telefone / WhatsApp
            </label>
            <input
              type='tel'
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              required
              className={inputClass}
              placeholder='(11) 99999-9999'
            />
          </div>

          <CampoSenha
            id='senha'
            label='Senha'
            autoComplete='new-password'
            value={senha}
            onChange={e => setSenha(e.target.value)}
            placeholder='Mínimo 8 caracteres'
            dica='Use pelo menos 8 caracteres, com letras e números.'
          />
          <CampoSenha
            id='confirmar'
            label='Confirmar senha'
            autoComplete='new-password'
            value={confirmar}
            onChange={e => setConfirmar(e.target.value)}
            placeholder='Repita a senha'
          />

          <BotaoPrimario>Continuar →</BotaoPrimario>
        </form>
      )}

      {passo === 2 && (
        <form onSubmit={concluir} className='space-y-4'>
          <p className='text-sm text-gray-500'>
            Opcional: o endereço para onde os pedidos serão enviados. Pode preencher ou alterar mais
            tarde no checkout.
          </p>
          <div className='grid grid-cols-3 gap-3'>
            {[
              ['rua', 'Rua', 'col-span-2'],
              ['numero', 'Número', ''],
              ['complemento', 'Complemento', ''],
              ['bairro', 'Bairro', 'col-span-2'],
              ['cidade', 'Cidade', 'col-span-2'],
              ['estado', 'UF', ''],
              ['cep', 'CEP', 'col-span-3'],
            ].map(([campo, label, cls]) => (
              <div key={campo} className={cls}>
                <label className='block text-gray-700 text-xs font-semibold mb-1'>{label}</label>
                <input
                  type='text'
                  value={endereco[campo]}
                  onChange={e =>
                    setEndereco({
                      ...endereco,
                      [campo]:
                        campo === 'estado'
                          ? e.target.value.toUpperCase().slice(0, 2)
                          : e.target.value,
                    })
                  }
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
            ))}
          </div>

          <BotaoPrimario loading={loading}>Criar minha conta</BotaoPrimario>

          <div className='flex justify-between text-sm'>
            <button
              type='button'
              onClick={() => setPasso(1)}
              className='text-gray-500 hover:underline'
            >
              ← Voltar
            </button>
            <button
              type='button'
              disabled={loading}
              onClick={e => concluir(e, ENDERECO_VAZIO)}
              className='text-blue-600 hover:underline'
            >
              Pular esta etapa
            </button>
          </div>
        </form>
      )}

      <p className='text-xs text-gray-400 text-center mt-6'>
        Ao criar a conta você concorda em receber por email as notificações dos seus pedidos.
      </p>
    </AuthShell>
  );
}
