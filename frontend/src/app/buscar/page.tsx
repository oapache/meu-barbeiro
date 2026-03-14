'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function BuscarPage() {
  const [busca, setBusca] = useState('')

  // Barbearias mockadas
  const barbearias = [
    { id: '1', nome: 'Barbearia do João', endereco: 'São Paulo, SP', distancia: '2km', nota: 4.8 },
    { id: '2', nome: 'Barbearia Moderno', endereco: 'São Paulo, SP', distancia: '3km', nota: 4.5 },
    { id: '3', nome: 'Corte & Estilo', endereco: 'São Paulo, SP', distancia: '5km', nota: 4.9 },
  ]

  const filtradas = barbearias.filter(b => 
    b.nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-black border-b border-white/10 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Meu Barbeiro" className="w-10 h-10 rounded-full object-cover border-2 border-white" />
            <span className="text-lg font-bold text-white">Meu Barbeiro</span>
          </Link>
          <nav className="flex gap-4">
            <Link href="/" className="text-sm font-medium text-gray-400 hover:text-white">
              Início
            </Link>
            <Link href="/buscar" className="text-sm font-medium text-white">
              Buscar
            </Link>
            <Link href="/login" className="text-sm font-medium text-gray-400 hover:text-white">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      {/* Busca */}
      <section className="pt-24 pb-6 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <input 
              type="text" 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar barbearia..." 
              className="w-full px-5 py-4 rounded-full border-2 border-gray-200 focus:border-black focus:outline-none text-lg"
              autoFocus
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-black text-white p-3 rounded-full">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* Resultados */}
      <section className="px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-medium mb-4">
            {busca ? `Resultados para "${busca}"` : 'Próximos de você'}
          </h2>
          
          <div className="space-y-3">
            {filtradas.map((barbearia) => (
              <Link key={barbearia.id} href={`/barbearia/${barbearia.id}`}>
                <div className="border border-gray-100 rounded-xl p-4 hover:border-gray-300 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">✂️</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{barbearia.nome}</h3>
                      <p className="text-sm text-gray-500">{barbearia.endereco} • {barbearia.distancia}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-yellow-500">★</span>
                        <span className="text-sm">{barbearia.nota}</span>
                      </div>
                    </div>
                    <span className="px-4 py-2 bg-black text-white rounded-full text-sm">
                      Agendar
                    </span>
                  </div>
                </div>
              </Link>
            ))}
            
            {filtradas.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhuma barbearia encontrada</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
