// pages/alterar-senha.js - ALTERAR SENHA (USUÁRIO LOGADO)
// ===================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../components/Layout';
import { Alerta, BotaoPrimario, CampoSenha, validarSenhaCliente } from '../components/AuthShell';

export default function AlterarSenha() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(data => setUser(data.user))
      .catch(() => router.push('/'));
  }, [router]);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSucesso('');

    const erroPolitica = validarSenhaCliente(novaSenha);
    if (erroPolitica) return setError(erroPolitica);
    if (novaSenha !== confirmar) return setError('As senhas não coincidem');
    if (senhaAtual === novaSenha) return setError('A nova senha deve ser diferente da atual');

    setLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senhaAtual, novaSenha }),
      });
      const data = await response.json();
      if (data.success) {
        setSucesso('Senha alterada com sucesso. Um email de confirmação foi enviado.');
        setSenhaAtual('');
        setNovaSenha('');
        setConfirmar('');
      } else {
        setError(data.message || 'Não foi possível alterar a senha');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
      </div>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Alterar senha - Elite Surfing</title>
      </Head>

      <div className='max-w-lg mx-auto px-4 py-10'>
        <div className='bg-white rounded-xl shadow-md p-8'>
          <h1 className='text-2xl font-bold text-gray-800 mb-1'>🔐 Alterar senha</h1>
          <p className='text-sm text-gray-500 mb-6'>
            Conta: <span className='font-medium text-gray-700'>{user.usuario}</span>
          </p>

          <form onSubmit={handleSubmit} className='space-y-5'>
            <Alerta tipo='erro'>{error}</Alerta>
            <Alerta tipo='sucesso'>{sucesso}</Alerta>

            <CampoSenha
              id='senhaAtual'
              label='Senha atual'
              autoComplete='current-password'
              value={senhaAtual}
              onChange={e => setSenhaAtual(e.target.value)}
              placeholder='Digite sua senha atual'
            />
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
              placeholder='Repita a nova senha'
            />

            <BotaoPrimario loading={loading}>Salvar nova senha</BotaoPrimario>

            <p className='text-xs text-gray-400 text-center'>
              As outras sessões abertas com esta conta serão encerradas.
            </p>
          </form>
        </div>
      </div>
    </Layout>
  );
}
