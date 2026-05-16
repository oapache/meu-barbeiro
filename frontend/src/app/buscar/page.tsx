'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, MapPin, Menu, Search, Star, X } from 'lucide-react'
import ApiService from '@/services/api'

type BarbeariaResumo = {
  id: string | number
  nome: string
  endereco: string
  logoUrl: string
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
  const [menuAberto, setMenuAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [barbearias, setBarbearias] = useState<BarbeariaResumo[]>([])
  const [carregandoBarbearias, setCarregandoBarbearias] = useState(true)
  const [erroBarbearias, setErroBarbearias] = useState('')
  const [logosComErro, setLogosComErro] = useState<Record<string, boolean>>({})
  const [localizacaoCliente, setLocalizacaoCliente] = useState<LocalizacaoCliente | null>(null)
  const [statusLocalizacao, setStatusLocalizacao] = useState<string>('')
  const [solicitandoLocalizacao, setSolicitandoLocalizacao] = useState(false)

  useEffect(() => {
    if (menuAberto) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [menuAberto])

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
          endereco: item.endereco || 'Endereço não informado',
          logoUrl: String(item.logo_url || ''),
          latitude: item.latitude !== undefined && item.latitude !== null ? Number(item.latitude) : null,
          longitude: item.longitude !== undefined && item.longitude !== null ? Number(item.longitude) : null,
          nota: item.nota_media !== undefined && item.nota_media !== null ? Number(item.nota_media) : 0,
          categoria: item.categoria || 'Barbearia',
          aberto: item.aberto !== false,
        }))

        setBarbearias(normalizadas)
      } catch {
        setErroBarbearias('Não foi possível carregar as barbearias no momento.')
        setBarbearias([])
      } finally {
        setCarregandoBarbearias(false)
      }
    }

    carregarBarbearias()
  }, [])

  const primaryNavLinks = [
    { href: '/#recursos', label: 'Recursos' },
    { href: '/#planos', label: 'Planos' },
  ]

  const headerActions = [
    { href: '/buscar', label: 'Buscar' },
    { href: '/login', label: 'Entrar' },
  ]

  const mobileMenuLinks = [...primaryNavLinks, ...headerActions]

  const solicitarLocalizacao = () => {
    if (!navigator.geolocation) {
      setStatusLocalizacao('Seu navegador não suporta geolocalização.')
      return
    }

    setSolicitandoLocalizacao(true)
    setStatusLocalizacao('Buscando sua localização...')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocalizacaoCliente({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setStatusLocalizacao('Localização ativada. Mostrando barbearias mais próximas.')
        setSolicitandoLocalizacao(false)
      },
      () => {
        setStatusLocalizacao('Não foi possível obter sua localização. Verifique as permissões do navegador.')
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
          distanciaLabel: distanciaKm !== null ? formatarDistancia(distanciaKm) : 'Localização não informada',
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
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="group flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] py-2 pl-2 pr-4 transition-all duration-200 hover:border-emerald-500/30 hover:bg-white/[0.06]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black shadow-lg shadow-black/40 transition-all duration-200 group-hover:border-emerald-400/50">
              <img src="/logo.png" alt="" className="h-10 w-10 rounded-full object-cover" />
            </span>
            <span className="leading-none">
              <span className="block text-sm font-black text-white md:text-base">O Corte Certo</span>
              <span className="mt-1 hidden text-[10px] uppercase tracking-[0.18em] text-emerald-300/70 sm:block">
                Agenda para barbearias
              </span>
            </span>
          </Link>

          <nav
            aria-label="Navegação principal"
            className="header-primary-nav hidden items-center gap-1 rounded-full border border-white/10 bg-zinc-950/75 p-1 shadow-2xl shadow-black/30 md:flex"
          >
            {primaryNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-4 py-2 text-sm font-medium text-zinc-300 transition-all duration-200 hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {headerActions.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 hover:bg-white/10 hover:text-white ${
                  link.href === '/buscar' ? 'bg-white/10 text-white' : 'text-zinc-300'
                }`}
              >
                {link.label}
              </Link>
            ))}

            <Link
              href="/cadastro"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-black transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-200 hover:shadow-xl hover:shadow-white/10 active:scale-[0.98]"
            >
              Começar grátis
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition-all duration-200 active:scale-95 md:hidden"
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuAberto}
          >
            {menuAberto ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        <div className="search-header-toolbar border-t border-white/10 bg-zinc-950/80 px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-7xl gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar barbearia..."
                className="w-full rounded-2xl border border-white/10 bg-black/45 py-3 pl-11 pr-4 text-sm text-white outline-none transition-all duration-200 placeholder:text-zinc-500 focus:border-emerald-400/50 focus:bg-black/70 sm:pl-12 sm:text-base"
                autoFocus
              />
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 sm:h-5 sm:w-5" />
            </div>

            <button
              onClick={solicitarLocalizacao}
              disabled={solicitandoLocalizacao}
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-zinc-300 transition-all duration-200 hover:border-emerald-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 lg:hidden"
              title="Usar localização"
            >
              <MapPin className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-40 transition-all duration-300 md:hidden ${
          menuAberto ? 'pointer-events-auto opacity-100 visible' : 'pointer-events-none opacity-0 invisible'
        }`}
        onClick={() => setMenuAberto(false)}
      >
        <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

        <div
          className={`mobile-menu-panel absolute left-4 right-4 top-40 rounded-[28px] border border-white/10 bg-zinc-950/95 p-4 shadow-[0_28px_80px_rgba(0,0,0,0.55)] transition-all duration-300 ${
            menuAberto ? 'translate-y-0 scale-100' : '-translate-y-4 scale-[0.98]'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">Menu</p>
              <p className="mt-1 text-sm text-zinc-400">Operação conectada</p>
            </div>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100">
              Online
            </span>
          </div>

          <nav className="grid gap-2" aria-label="Menu mobile">
            {mobileMenuLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuAberto(false)}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white transition-all duration-200 active:scale-[0.99]"
              >
                {link.label}
                <ArrowRight className="h-4 w-4 text-zinc-500" />
              </Link>
            ))}
          </nav>

          <Link
            href="/cadastro"
            onClick={() => setMenuAberto(false)}
            className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3.5 text-sm font-bold text-black transition-all duration-200 active:scale-[0.98]"
          >
            Começar grátis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <section className="pt-40 sm:pt-44 px-4 pb-8">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-4 sm:gap-6">
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
                {solicitandoLocalizacao ? 'Obtendo localização...' : 'Usar minha localização'}
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
            <div className="flex items-center justify-between mb-3 lg:hidden">
              <h2 className="text-base font-medium">
                {busca ? `"${busca}"` : 'Próximos de você'}
              </h2>
              <span className="text-xs text-zinc-400">
                {barbeariasComDistancia.length} resultado{barbeariasComDistancia.length !== 1 ? 's' : ''}
              </span>
            </div>

            {!localizacaoCliente && (
              <div className="mb-3 sm:mb-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-yellow-100">
                Ative sua localização para encontrar barbearias próximas.
              </div>
            )}

            {statusLocalizacao && (
              <p className="lg:hidden mb-3 text-xs text-zinc-400">{statusLocalizacao}</p>
            )}

            {erroBarbearias && (
              <div className="mb-3 sm:mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-red-100">
                {erroBarbearias}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {carregandoBarbearias && (
                <div className="sm:col-span-2 text-center py-10 sm:py-12 text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-xl text-sm">
                  Carregando barbearias...
                </div>
              )}

              {barbeariasComDistancia.map((barbearia) => (
                <Link key={barbearia.id} href={`/barberia/${String(barbearia.id)}`}>
                  <div className="h-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 sm:p-4 hover:border-zinc-700 transition active:scale-[0.98]">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
                        {barbearia.logoUrl && !logosComErro[String(barbearia.id)] ? (
                          <img
                            src={barbearia.logoUrl}
                            alt={barbearia.nome}
                            className="w-full h-full object-cover"
                            onError={() => {
                              setLogosComErro((prev) => ({ ...prev, [String(barbearia.id)]: true }))
                            }}
                          />
                        ) : (
                          <img
                            src="/fallback-barbershop-mono.svg"
                            alt="Logo padrão"
                            className="w-7 h-7 sm:w-9 sm:h-9 opacity-90"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-sm sm:text-base truncate">{barbearia.nome}</h3>
                          <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full shrink-0 ${barbearia.aberto ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-300'}`}>
                            {barbearia.aberto ? 'Aberta' : 'Fechada'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-zinc-400 mt-1">
                          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                          <span className="truncate">{barbearia.distanciaLabel}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2 sm:mt-3">
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs sm:text-sm">{barbearia.nota}</span>
                            <span className="hidden sm:inline text-xs text-zinc-500">• {barbearia.categoria}</span>
                          </div>
                          <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-white text-black rounded-full text-[10px] sm:text-xs font-medium">
                            Agendar
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {!carregandoBarbearias && barbeariasComDistancia.length === 0 && (
                <div className="sm:col-span-2 text-center py-10 sm:py-12 text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-xl">
                  <Search className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                  <p className="text-sm">Nenhuma barbearia encontrada</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

    </main>
  )
}
