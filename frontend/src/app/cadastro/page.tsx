'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function CadastroPage() {
  const router = useRouter()
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
      await register({ nome, email, telefone, senha, tipo })
      router.push('/barbearia')
    } catch (err) {
      setError(err.message || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Link href="/">
            <img 
              src="/logo.jpg" 
              alt="Meu Barbeiro" 
              className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-4 border-white"
            />
          </Link>
          <h1 className="text-xl font-bold text-white">Criar Conta</h1>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Tipo de conta */}
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
  )
}
