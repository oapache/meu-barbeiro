'use client'

import { useState } from 'react'
import Link from 'next/link'
import ApiService from '@/services/api'
import { Search, MapPin, Star } from 'lucide-react'

export default function BuscarPage() {
  const [busca, setBusca] = useState('')
  const [barbearias, setBarbearias] = useState([])
  const [loading, setLoading] = useState(false)

  // Dados mockados (depois conectar com API)
  const mockBarbearias = [
    { id: '1', nome: 'Barbearia do João', endereco: 'São Paulo, SP', distancia: '2km', nota: 4.8 },
    { id: '2', nome: 'Barbearia Moderno', endereco: 'São Paulo, SP', distancia: '3km', nota: 4.5 },
    { id: '3', nome: 'Corte & Estilo', endereco: 'São Paulo, SP', distancia: '5km', nota: 4.9 },
  ]

  const filtradas = mockBarbearias.filter(b => 
    b.nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-black border-b border-white/10 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-3 mb-4">
            <img src="/logo.jpg" alt="Meu Barbeiro" className="w-10 h-10 rounded-full object-cover border-2 border-white" />
            <span className="text-lg font-bold">Meu Barbeiro</span>
          </Link>
          
          {/* Busca */}
          <div className="relative">
            <input 
              type="text" 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar barbearia..." 
              className="w-full px-5 py-3 pl-12 rounded-full bg-zinc-900 border border-zinc-700 focus:border-white focus:outline-none"
              autoFocus
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          </div>
        </div>
      </header>

      {/* Resultados */}
      <section className="pt-36 px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-medium mb-4">
            {busca ? `Resultados para "${busca}"` : 'Próximos de você'}
          </h2>
          
          <div className="space-y-3">
            {filtradas.map((barbearia) => (
              <Link key={barbearia.id} href={`/barberia/${barbearia.id}`}>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-zinc-800 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">✂️</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{barbearia.nome}</h3>
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <MapPin className="w-4 h-4" />
                        <span>{barbearia.endereco} • {barbearia.distancia}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm">{barbearia.nota}</span>
                      </div>
                    </div>
                    <span className="px-4 py-2 bg-white text-black rounded-full text-sm font-medium">
                      Agendar
                    </span>
                  </div>
                </div>
              </Link>
            ))}
            
            {filtradas.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma barbearia encontrada</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
