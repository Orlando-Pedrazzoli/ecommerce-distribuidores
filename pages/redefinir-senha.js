// pages/redefinir-senha.js - DEFINIR NOVA SENHA VIA LINK (RESET OU CONVITE)
// ===================================
// URL: /redefinir-senha?token=...   (&convite=1 quando é primeiro acesso)

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AuthShell, {
  Alerta,
  BotaoPrimario,
  CampoSenha,
  validarSenhaCliente,
} from '../components/AuthShell';

export default function RedefinirSenha() {
  const router = useRouter();
  const { token } = router.query;

  // 'validando' | 'ok' | 'invalido' | 'concluido'
  const [estado, setEstado] = useState('validando');
  const [dadosToken, setDadosToken] = useState(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    if (!token) {
      setEstado('invalido');
      return;
    }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.valido) {
          setDadosToken(data);
          setEstado('ok');
        } else {
          setEstado('invalido');
        }
      })
      .catch(() => setEstado('invalido'));
  }, [router.isReady, token]);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');

    const erroPolitica = validarSenhaCliente(novaSenha);
    if (erroPolitica) return setError(erroPolitica);
    if (novaSenha !== confirmar) return setError('As senhas não coincidem');

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha }),
      });
      const data = await response.json();
      if (data.success) {
        setEstado('concluido');
        setTimeout(() => router.push('/?msg=senha-redefinida'), 2500);
      } else {
        setError(data.message || 'Não foi possível redefinir a senha');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const ehConvite = dadosToken?.convite;

  if (estado === 'validando') {
    return (
      <AuthShell titulo='Verificando link...'>
        <div className='flex justify-center py-6'>
          <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600'></div>
        </div>
      </AuthShell>
    );
  }

  if (estado === 'invalido') {
    return (
      <AuthShell titulo='Link inválido ou expirado'>
        <div className='text-center'>
          <div className='mx-auto mb-4 w-14 h-14 rounded-full bg-red-50 flex items-center justify-center'>
            <svg className='w-7 h-7 text-red-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
            </svg>
          </div>
          <p className='text-sm text-gray-600 mb-6'>
            Este link já foi usado ou passou do prazo de validade. Solicite um novo
            para continuar.
          </p>
          <Link
            href='/esqueci-senha'
            className='inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition'
          >
            Solicitar novo link
          </Link>
          <div className='mt-4'>
            <Link href='/' className='text-sm text-gray-500 hover:underline'>
              ← Voltar para o login
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  if (estado === 'concluido') {
    return (
      <AuthShell titulo='Senha definida!'>
        <div className='text-center'>
          <div className='mx-auto mb-4 w-14 h-14 rounded-full bg-green-50 flex items-center justify-center'>
            <svg className='w-7 h-7 text-green-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
            </svg>
          </div>
          <p className='text-sm text-gray-600 mb-6'>
            Sua senha foi salva. Redirecionando para o login...
          </p>
          <Link href='/?msg=senha-redefinida' className='text-blue-600 hover:underline text-sm font-medium'>
            Ir para o login agora
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      titulo={ehConvite ? 'Bem-vindo(a)! Defina sua senha' : 'Criar nova senha'}
      subtitulo={
        dadosToken?.nome
          ? `Olá, ${dadosToken.nome}. Conta: ${dadosToken.usuario}`
          : undefined
      }
    >
      <form onSubmit={handleSubmit} className='space-y-6'>
        <Alerta tipo='erro'>{error}</Alerta>

        <CampoSenha
          id='novaSenha'
          label='Nova senha'
          autoComplete='new-password'
          value={novaSenha}
          onChange={e => setNovaSenha(e.target.value)}
          placeholder='Mínimo 8 caracteres'
          dica='Use pelo menos 8 caracteres, com letras e números.'
        />

        <CampoSenha
          id='confirmar'
          label='Confirmar nova senha'
          autoComplete='new-password'
          value={confirmar}
          onChange={e => setConfirmar(e.target.value)}
          placeholder='Repita a senha'
        />

        <BotaoPrimario loading={loading}>
          {ehConvite ? 'Definir senha e continuar' : 'Salvar nova senha'}
        </BotaoPrimario>

        <p className='text-xs text-gray-400 text-center'>
          Ao salvar, todas as sessões abertas serão encerradas e será pedido um novo
          código de verificação no próximo login.
        </p>
      </form>
    </AuthShell>
  );
}
