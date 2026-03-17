'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth, getRedirectByUserType } from '@/context/AuthContext'

export default function CadastroPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { register } = useAuth()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [tipo, setTipo] = useState('cliente')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await register({ nome, email, telefone, senha, tipo })
      const redirect = searchParams.get('redirect')
      router.push(redirect || getRedirectByUserType(result.usuario))
    } catch (err) {
      setError(err.message || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="fixed top-0 w-full bg-black/95 backdrop-blur-md border-b border-white/10 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Sou Barbeiro" className="w-14 h-14 rounded-full object-cover border-2 border-white" />
            <span className="text-lg font-bold text-white">Sou Barbeiro</span>
          </Link>
          <nav className="flex gap-6">
            <Link href="/" className="text-sm font-medium text-zinc-300 hover:text-white transition">
              Início
            </Link>
            <Link href="/buscar" className="text-sm font-medium text-zinc-300 hover:text-white transition">
              Buscar
            </Link>
            <Link href="/login" className="text-sm font-medium text-zinc-300 hover:text-white transition">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <section className="min-h-screen pt-28 px-4 pb-10 flex items-start justify-center">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">
          <aside className="hidden lg:flex flex-col justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-10">
            <p className="text-zinc-400 text-sm uppercase tracking-wider">Novo acesso</p>
            <h1 className="text-4xl font-bold mt-4 leading-tight">
              Crie sua conta e entre no
              <span className="block text-zinc-300">ecossistema Sou Barbeiro</span>
            </h1>
            <p className="text-zinc-400 mt-4 max-w-md">
              Clientes encontram e agendam com facilidade. Barbeiros organizam sua agenda e serviços no mesmo lugar.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
                <p className="text-zinc-500">Perfil cliente</p>
                <p className="text-white font-semibold mt-1">Histórico e fidelidade</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
                <p className="text-zinc-500">Perfil barbeiro</p>
                <p className="text-white font-semibold mt-1">Gestão da barbearia</p>
              </div>
            </div>
          </aside>

          <div className="w-full max-w-sm lg:max-w-md lg:justify-self-end rounded-2xl border border-white/10 bg-zinc-900/50 p-6 md:p-8">
            <div className="text-center mb-6">
              <Link href="/">
                <img 
                  src="/logo.jpg" 
                  alt="Sou Barbeiro" 
                  className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-4 border-white"
                />
              </Link>
              <h2 className="text-xl font-bold text-white">Criar Conta</h2>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => setTipo('cliente')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
                  tipo === 'cliente'
                    ? 'bg-white text-black'
                    : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                Cliente
              </button>
              <button
                type="button"
                onClick={() => setTipo('barbeiro')}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
                  tipo === 'barbeiro'
                    ? 'bg-white text-black'
                    : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                Barbeiro
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Nome completo
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:border-white focus:outline-none"
                  placeholder="João Silva"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:border-white focus:outline-none"
                  placeholder="seu@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  WhatsApp (apenas números)
                </label>
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:border-white focus:outline-none"
                  placeholder="551199999999"
                  maxLength={13}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:border-white focus:outline-none"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition disabled:opacity-50"
              >
                {loading ? 'Criando...' : 'Criar Conta'}
              </button>
            </form>

            <p className="text-center mt-6 text-zinc-400 text-sm">
              Já tem conta?{' '}
              <Link href="/login" className="text-white font-medium">
                Entrar
              </Link>
            </p>
            
            <p className="text-center mt-4">
              <Link href="/" className="text-sm text-zinc-500">
                ← Voltar ao início
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
