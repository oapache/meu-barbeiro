'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CadastroPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [tipo, setTipo] = useState<'cliente' | 'barbeiro'>('cliente')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Simulate registration
    setTimeout(() => {
      router.push('/barbearia')
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-sm mx-auto">
        <Link href="/" className="text-center block mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-black rounded-full flex items-center justify-center">
            <img src="/logo.jpg" alt="Meu Barbeiro" className="w-12 h-12 rounded-full object-cover" />
          </div>
          <h1 className="text-xl font-bold">Criar Conta</h1>
        </Link>

        {/* Tipo de conta */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setTipo('cliente')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              tipo === 'cliente'
                ? 'bg-black text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Cliente
          </button>
          <button
            type="button"
            onClick={() => setTipo('barbeiro')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              tipo === 'barbeiro'
                ? 'bg-black text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Barbeiro
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome completo
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="input-field"
              placeholder="João Silva"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp
            </label>
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="input-field"
              placeholder="(11) 99999-9999"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Criar Conta'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          Já tem conta?{' '}
          <Link href="/login" className="text-black font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
