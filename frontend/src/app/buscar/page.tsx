'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, MapPin, Star } from 'lucide-react'

type BarbeariaResumo = {
  id: string
  nome: string
  endereco: string
  distancia: string
  nota: number
  categoria: string
  aberto: boolean
}

export default function BuscarPage() {
  const [busca, setBusca] = useState('')

  // Dados mockados (depois conectar com API)
  const mockBarbearias: BarbeariaResumo[] = [
    { id: '1', nome: 'Barbearia do João', endereco: 'São Paulo, SP', distancia: '2km', nota: 4.8, categoria: 'Premium', aberto: true },
    { id: '2', nome: 'Barbearia Moderno', endereco: 'São Paulo, SP', distancia: '3km', nota: 4.5, categoria: 'Moderna', aberto: true },
    { id: '3', nome: 'Corte & Estilo', endereco: 'São Paulo, SP', distancia: '5km', nota: 4.9, categoria: 'Clássica', aberto: false },
  ]

  const filtradas = mockBarbearias.filter(b => 
    b.nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-black/95 backdrop-blur-md border-b border-white/10 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
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
        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-6">
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-36 rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
              <p className="text-zinc-400 text-sm uppercase tracking-wider">Busca</p>
              <h2 className="text-xl font-bold mt-3">{busca ? `"${busca}"` : 'Próximos de você'}</h2>
              <p className="text-zinc-400 text-sm mt-2">
                {filtradas.length} resultado{filtradas.length !== 1 ? 's' : ''} encontrado{filtradas.length !== 1 ? 's' : ''}
              </p>

              <div className="mt-5 space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-black/30 border border-white/5 px-3 py-2">
                  <span className="text-zinc-400">Abertas agora</span>
                  <span className="font-medium">{filtradas.filter((b) => b.aberto).length}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-black/30 border border-white/5 px-3 py-2">
                  <span className="text-zinc-400">Melhor nota</span>
                  <span className="font-medium">{filtradas.length ? Math.max(...filtradas.map((b) => b.nota)).toFixed(1) : '-'}</span>
                </div>
              </div>
            </div>
          </aside>

          <div className="lg:col-span-9">
            <h2 className="text-lg font-medium mb-4 lg:hidden">
              {busca ? `Resultados para "${busca}"` : 'Próximos de você'}
            </h2>

            <div className="grid gap-3 md:grid-cols-2">
              {filtradas.map((barbearia) => (
                <Link key={barbearia.id} href={`/barberia/${barbearia.id}`}>
                  <div className="h-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-2xl">✂️</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold truncate">{barbearia.nome}</h3>
                          <span className={`text-[10px] px-2 py-1 rounded-full ${barbearia.aberto ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-300'}`}>
                            {barbearia.aberto ? 'Aberta' : 'Fechada'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-zinc-400 mt-1">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{barbearia.endereco} • {barbearia.distancia}</span>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm">{barbearia.nota}</span>
                            <span className="text-xs text-zinc-500">• {barbearia.categoria}</span>
                          </div>
                          <span className="px-3 py-1.5 bg-white text-black rounded-full text-xs font-medium">
                            Agendar
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {filtradas.length === 0 && (
                <div className="md:col-span-2 text-center py-12 text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma barbearia encontrada</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
