'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, MapPin, Star } from 'lucide-react'
import ApiService from '@/services/api'

type BarbeariaResumo = {
  id: string | number
  nome: string
  endereco: string
  latitude: number | null
  longitude: number | null
  nota: number
  categoria: string
  aberto: boolean
}

type LocalizacaoCliente = {
  latitude: number
  longitude: number
}

const formatarDistancia = (distanciaKm: number) => {
  if (distanciaKm < 1) {
    return `${Math.round(distanciaKm * 1000)} m`
  }

  return `${distanciaKm.toFixed(1)} km`
}

const calcularDistanciaKm = (origem: LocalizacaoCliente, destino: { latitude: number; longitude: number }) => {
  const raioTerraKm = 6371
  const dLat = ((destino.latitude - origem.latitude) * Math.PI) / 180
  const dLon = ((destino.longitude - origem.longitude) * Math.PI) / 180

  const lat1 = (origem.latitude * Math.PI) / 180
  const lat2 = (destino.latitude * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return raioTerraKm * c
}

export default function BuscarPage() {
  const [busca, setBusca] = useState('')
  const [barbearias, setBarbearias] = useState<BarbeariaResumo[]>([])
  const [carregandoBarbearias, setCarregandoBarbearias] = useState(true)
  const [erroBarbearias, setErroBarbearias] = useState('')
  const [localizacaoCliente, setLocalizacaoCliente] = useState<LocalizacaoCliente | null>(null)
  const [statusLocalizacao, setStatusLocalizacao] = useState<string>('')
  const [solicitandoLocalizacao, setSolicitandoLocalizacao] = useState(false)

  useEffect(() => {
    const carregarBarbearias = async () => {
      try {
        setCarregandoBarbearias(true)
        setErroBarbearias('')

        const resposta = await ApiService.listBarbearias()
        const lista = Array.isArray(resposta?.barbearias) ? resposta.barbearias : []

        const normalizadas: BarbeariaResumo[] = lista.map((item: any) => ({
          id: item.id,
          nome: item.nome || 'Barbearia sem nome',
          endereco: item.endereco || 'Endereco nao informado',
          latitude: item.latitude !== undefined && item.latitude !== null ? Number(item.latitude) : null,
          longitude: item.longitude !== undefined && item.longitude !== null ? Number(item.longitude) : null,
          nota: item.nota_media !== undefined && item.nota_media !== null ? Number(item.nota_media) : 0,
          categoria: item.categoria || 'Barbearia',
          aberto: item.aberto !== false,
        }))

        setBarbearias(normalizadas)
      } catch {
        setErroBarbearias('Nao foi possivel carregar as barbearias no momento.')
        setBarbearias([])
      } finally {
        setCarregandoBarbearias(false)
      }
    }

    carregarBarbearias()
  }, [])

  const solicitarLocalizacao = () => {
    if (!navigator.geolocation) {
      setStatusLocalizacao('Seu navegador nao suporta geolocalizacao.')
      return
    }

    setSolicitandoLocalizacao(true)
    setStatusLocalizacao('Buscando sua localizacao...')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocalizacaoCliente({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setStatusLocalizacao('Localizacao ativada. Mostrando barbearias mais proximas.')
        setSolicitandoLocalizacao(false)
      },
      () => {
        setStatusLocalizacao('Nao foi possivel obter sua localizacao. Verifique as permissoes do navegador.')
        setSolicitandoLocalizacao(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    )
  }

  const barbeariasComDistancia = useMemo(() => {
    return barbearias
      .filter((b) => b.nome.toLowerCase().includes(busca.toLowerCase()))
      .map((barbearia) => {
        const latitude = barbearia.latitude
        const longitude = barbearia.longitude
        const possuiCoordenadas = latitude !== null && longitude !== null

        const distanciaKm = localizacaoCliente && possuiCoordenadas
          ? calcularDistanciaKm(localizacaoCliente, {
              latitude,
              longitude,
            })
          : null

        return {
          ...barbearia,
          distanciaKm,
          distanciaLabel: distanciaKm !== null ? formatarDistancia(distanciaKm) : 'Localizacao nao informada',
        }
      })
      .sort((a, b) => {
        if (a.distanciaKm === null && b.distanciaKm === null) return 0
        if (a.distanciaKm === null) return 1
        if (b.distanciaKm === null) return -1
        return a.distanciaKm - b.distanciaKm
      })
  }, [barbearias, busca, localizacaoCliente])

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-black/95 backdrop-blur-md border-b border-white/10 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo.jpg" alt="Meu Barbeiro" className="w-10 h-10 rounded-full object-cover border-2 border-white" />
              <span className="text-lg font-bold">Meu Barbeiro</span>
            </Link>

            <nav className="flex items-center gap-4 md:gap-6 text-sm">
              <Link href="/" className="text-zinc-300 hover:text-white transition">
                Início
              </Link>
              <Link href="/buscar" className="text-white font-medium">
                Buscar
              </Link>
              <Link href="/perfil" className="text-zinc-300 hover:text-white transition">
                Perfil
              </Link>
            </nav>
          </div>
          
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
                {barbeariasComDistancia.length} resultado{barbeariasComDistancia.length !== 1 ? 's' : ''} encontrado{barbeariasComDistancia.length !== 1 ? 's' : ''}
              </p>

              <button
                onClick={solicitarLocalizacao}
                disabled={solicitandoLocalizacao}
                className="mt-5 w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm font-medium text-white hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {solicitandoLocalizacao ? 'Obtendo localizacao...' : 'Usar minha localizacao'}
              </button>

              {statusLocalizacao && (
                <p className="mt-2 text-xs text-zinc-400 leading-relaxed">{statusLocalizacao}</p>
              )}

              <div className="mt-5 space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-black/30 border border-white/5 px-3 py-2">
                  <span className="text-zinc-400">Abertas agora</span>
                  <span className="font-medium">{barbeariasComDistancia.filter((b) => b.aberto).length}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-black/30 border border-white/5 px-3 py-2">
                  <span className="text-zinc-400">Melhor nota</span>
                  <span className="font-medium">{barbeariasComDistancia.length ? Math.max(...barbeariasComDistancia.map((b) => b.nota)).toFixed(1) : '-'}</span>
                </div>
              </div>
            </div>
          </aside>

          <div className="lg:col-span-9">
            <h2 className="text-lg font-medium mb-4 lg:hidden">
              {busca ? `Resultados para "${busca}"` : 'Próximos de você'}
            </h2>

            {!localizacaoCliente && (
              <div className="mb-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
                Ative sua localizacao para encontrar barbearias realmente proximas de voce.
              </div>
            )}

            {erroBarbearias && (
              <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {erroBarbearias}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              {carregandoBarbearias && (
                <div className="md:col-span-2 text-center py-12 text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-xl">
                  Carregando barbearias...
                </div>
              )}

              {barbeariasComDistancia.map((barbearia) => (
                <Link key={barbearia.id} href={`/barberia/${String(barbearia.id)}`}>
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
                          <span className="truncate">{barbearia.endereco} • {barbearia.distanciaLabel}</span>
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

              {!carregandoBarbearias && barbeariasComDistancia.length === 0 && (
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
