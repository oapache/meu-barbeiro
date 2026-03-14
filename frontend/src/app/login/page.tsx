'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Simulate login
    setTimeout(() => {
      router.push('/barbearia')
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-sm mx-auto">
        {/* Logo Grande */}
        <div className="text-center mb-8">
          <Link href="/">
            <img 
              src="/logo.jpg" 
              alt="Meu Barbeiro" 
              className="w-32 h-32 rounded-full object-cover mx-auto mb-4 border-4 border-black"
            />
          </Link>
          <h1 className="text-2xl font-bold">Meu Barbeiro</h1>
          <p className="text-gray-600">Faça seu login</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          Não tem conta?{' '}
          <Link href="/cadastro" className="text-black font-medium">
            Criar
          </Link>
        </p>
        
        <p className="text-center mt-4">
          <Link href="/" className="text-sm text-gray-500">
            ← Voltar ao início
          </Link>
        </p>
      </div>
    </div>
  )
}
