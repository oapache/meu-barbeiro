'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import ApiService from '@/services/api'
import { getServiceImageByName } from '@/lib/serviceCatalog'
import { MapPin, Phone, Clock, Star, Calendar, Check, ArrowLeft } from 'lucide-react'
import AccessibilityShortcuts from '@/components/AccessibilityShortcuts'

type TabKey = 'services' | 'professionals' | 'reviews'

type Service = {
  id: string
  name: string
  price: number
  durationMinutes: number
  imageUrl?: string
}

type Professional = {
  id: string
  name: string
  role: string
  experience: string
  photoUrl?: string
}

type Review = {
  id: string
  author: string
  rating: number
  comment: string
  date: string
}

type WeeklyScheduleItem = {
  key: string
  label: string
  fechado: boolean
  abertura: string
  fechamento: string
  intervalos: WeeklyScheduleInterval[]
}

type WeeklyScheduleInterval = {
  abertura: string
  fechamento: string
}

const defaultShop = {
  id: '1',
  name: 'Barbearia',
  rating: 0,
  reviewsCount: 0,
  bannerImage: 'https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?auto=format&fit=crop&w=1600&q=80',
  logoImage: '/logo.png',
  tagline: 'Conheça os serviços e profissionais desta barbearia.',
  description: 'Acompanhe as informações atualizadas da barbearia.',
  address: 'Endereço não informado',
  district: 'Região',
  city: 'Cidade',
  phone: '',
  whatsapp: '',
  openingHours: [] as string[],
  amenities: [] as string[],
  galleryImages: [] as string[],
  services: [] as Service[],
  professionals: [] as Professional[],
  reviews: [] as Review[],
}

const extrairCidadeUF = (endereco: string) => {
  if (!endereco) return { district: 'Região', city: 'Cidade' }
  const partes = endereco.split(',').map((p) => p.trim()).filter(Boolean)

  if (partes.length >= 2) {
    const ultimas = partes[partes.length - 1]
    const penultima = partes[partes.length - 2]
    return {
      district: penultima || 'Região',
      city: ultimas || 'Cidade',
    }
  }

  return { district: 'Região', city: endereco }
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function ratingStars(rating: number) {
  const full = Math.round(rating)
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}

const DAY_KEY_BY_INDEX = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
const DAY_LABEL_BY_KEY: Record<string, string> = {
  domingo: 'Domingo',
  segunda: 'Segunda-Feira',
  terca: 'Terça-Feira',
  quarta: 'Quarta-Feira',
  quinta: 'Quinta-Feira',
  sexta: 'Sexta-Feira',
  sabado: 'Sábado',
}

const horarioCurto = (valor: string) => (valor || '').slice(0, 5)

const horaValida = (valor: unknown) => /^\d{2}:\d{2}/.test(String(valor || '').trim())

const horarioParaMinutos = (valor: string) => {
  const [hora, minuto] = String(valor || '').split(':')
  const h = Number(hora)
  const m = Number(minuto)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return (h * 60) + m
}

const estaDentroDoExpediente = (dia: WeeklyScheduleItem, agora: Date) => {
  const minutosAgora = (agora.getHours() * 60) + agora.getMinutes()

  return dia.intervalos.some((intervalo) => {
    const aberturaMin = horarioParaMinutos(intervalo.abertura)
    const fechamentoMin = horarioParaMinutos(intervalo.fechamento)
    if (aberturaMin === null || fechamentoMin === null) return false
    return minutosAgora >= aberturaMin && minutosAgora < fechamentoMin
  })
}

const parseArraySafe = (value: unknown): any[] => {
  if (Array.isArray(value)) return value

  let current = value
  for (let attempt = 0; attempt < 2; attempt++) {
    if (typeof current !== 'string') break

    const trimmed = current.trim()
    if (!trimmed) return []

    try {
      current = JSON.parse(trimmed)
    } catch {
      return []
    }

    if (Array.isArray(current)) return current
  }

  return Array.isArray(current) ? current : []
}

const normalizarBoolean = (value: unknown) => value === true || value === 1 || ['1', 'true', 'sim', 'yes', 'on'].includes(String(value || '').trim().toLowerCase())

const normalizarIntervalosDia = (dia: any): WeeklyScheduleInterval[] => {
  const intervalos = parseArraySafe(dia?.intervalos || dia?.periodos || dia?.horarios)
    .map((intervalo) => ({
      abertura: String(intervalo?.abertura || intervalo?.inicio || '').trim(),
      fechamento: String(intervalo?.fechamento || intervalo?.fim || '').trim(),
    }))
    .filter((intervalo) => horaValida(intervalo.abertura) && horaValida(intervalo.fechamento))

  if (intervalos.length > 0) return intervalos

  const abertura = String(dia?.abertura || '').trim()
  const fechamento = String(dia?.fechamento || '').trim()
  return horaValida(abertura) && horaValida(fechamento) ? [{ abertura, fechamento }] : []
}

const normalizarHorariosSemana = (value: unknown): WeeklyScheduleItem[] =>
  parseArraySafe(value)
    .map((dia: any) => {
      const key = String(dia?.key || '').trim().toLowerCase()
      const label = DAY_LABEL_BY_KEY[key] || String(dia?.label || '').trim()

      return {
        key,
        label,
        fechado: normalizarBoolean(dia?.fechado),
        abertura: String(dia?.abertura || '').trim(),
        fechamento: String(dia?.fechamento || '').trim(),
        intervalos: normalizarIntervalosDia(dia),
      }
    })
    .filter((dia) => dia.key || dia.label)

const initialsFromName = (name: string) => {
  const clean = name.trim()
  if (!clean) return 'MB'
  const parts = clean.split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

function MonochromeAvatar({ label, className }: { label: string; className: string }) {
  return (
    <div className={`${className} rounded-xl border border-white/20 bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center`}>
      <span className="text-zinc-100 font-semibold tracking-wider">{initialsFromName(label)}</span>
    </div>
  )
}

function ShopLogoFallback({ className }: { className: string }) {
  return (
    <div className={`${className} rounded-xl border border-white/20 bg-zinc-900 flex items-center justify-center`}>
      <img
        src="/fallback-barbershop-mono.svg"
        alt="Logo padrão da barbearia"
        className="h-10 w-10 opacity-90"
      />
    </div>
  )
}

export default function BarberShopDetailPage({ params }: { params: { id: string } }) {
  const { isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>('services')
  const [shop, setShop] = useState(defaultShop)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [logoError, setLogoError] = useState(false)
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleItem[]>([])
  const [clockTick, setClockTick] = useState(0)
  const diasAtendimento = useMemo(
    () => weeklySchedule.filter((dia) => !dia.fechado && dia.intervalos.length > 0),
    [weeklySchedule]
  )
  const agoraReferencia = useMemo(() => new Date(), [clockTick])

  useEffect(() => {
    if (weeklySchedule.length === 0) return

    const timer = window.setInterval(() => {
      setClockTick((current) => current + 1)
    }, 60000)

    return () => window.clearInterval(timer)
  }, [weeklySchedule.length])

  useEffect(() => {
    setLogoError(false)
  }, [shop.logoImage])

  useEffect(() => {
    const carregarBarbearia = async () => {
      try {
        setLoading(true)
        setLoadError(null)

        const detalhe = await ApiService.getBarbearia(params.id)
        const barbearia = detalhe?.barbearia

        if (barbearia) {
          const { district, city } = extrairCidadeUF(barbearia.endereco || '')
          const notaPublica = Number(barbearia.nota_media ?? barbearia.nota ?? 0)
          const totalAvaliacoes = Number(barbearia.total_avaliacoes || 0)

          setShop((prev) => ({
            ...prev,
            id: String(barbearia.id || params.id),
            name: barbearia.nome || prev.name,
            address: barbearia.endereco || prev.address,
            district,
            city,
            phone: barbearia.telefone || '',
            whatsapp: (barbearia.whatsapp_link || '').replace(/\D/g, '') || prev.whatsapp,
            logoImage: barbearia.logo_url || prev.logoImage,
            openingHours: [
              `Horário principal: ${barbearia.horario_abertura || '09:00'} - ${barbearia.horario_fechamento || '20:00'}`,
            ],
            tagline: `Atendimento profissional na ${barbearia.nome || 'barbearia'}.`,
            rating: Number.isFinite(notaPublica) ? notaPublica : prev.rating,
            reviewsCount: Number.isFinite(totalAvaliacoes) ? totalAvaliacoes : prev.reviewsCount,
          }))

          setWeeklySchedule(normalizarHorariosSemana(barbearia.horarios_semana))
        }

        try {
          const respostaDetalhes = await ApiService.getBarbeariaDetalhes(params.id)
          const detalhes = respostaDetalhes?.detalhes || {}

          const amenidades = Array.isArray(detalhes?.amenidades)
            ? detalhes.amenidades.filter((item: any) => typeof item === 'string')
            : []

          const professionals = Array.isArray(detalhes?.profissionais)
            ? detalhes.profissionais
              .filter((p: any) => p?.nome)
              .map((p: any) => ({
                id: String(p.id || ''),
                name: String(p.nome || ''),
                role: String(p.cargo || 'Barbeiro'),
                experience: String(p.experiencia || ''),
                photoUrl: String(p.foto_url || ''),
              }))
            : []

          const galleryImages = parseArraySafe(detalhes?.galeria)
            .filter((item: any) => typeof item === 'string')

          const ratingEntries = Array.isArray(detalhes?.avaliacoes)
            ? detalhes.avaliacoes
              .map((r: any) => ({
                id: String(r.id || ''),
                author: String(r.autor || ''),
                rating: Number(r.nota || 0),
                comment: String(r.comentario || ''),
                date: String(r.data || ''),
              }))
              .filter((review) => review.rating >= 1 && review.rating <= 5)
            : []

          const reviews = ratingEntries.filter((review) => review.author && review.comment)

          const media = ratingEntries.length > 0
            ? ratingEntries.reduce((acc, item) => acc + item.rating, 0) / ratingEntries.length
            : 0

          setShop((prev) => ({
            ...prev,
            amenities: amenidades,
            professionals,
            bannerImage: String(detalhes?.banner_url || prev.bannerImage),
            galleryImages,
            reviews,
            reviewsCount: ratingEntries.length > 0 ? ratingEntries.length : prev.reviewsCount,
            rating: Number.isFinite(media) && media > 0 ? media : prev.rating,
          }))
        } catch {
          // Mantem os dados basicos da barbearia mesmo sem detalhes.
        }

        try {
          const respostaServicos = await ApiService.listServicos(params.id)
          const listaServicos = Array.isArray(respostaServicos?.servicos) ? respostaServicos.servicos : []

          setShop((prev) => ({
            ...prev,
            services: listaServicos.map((servico: any) => ({
              id: String(servico.id),
              name: servico.nome,
              price: Number(servico.preco || 0),
              durationMinutes: Number(servico.duracao_minutos || 30),
              imageUrl: String(servico.imagem_url || ''),
            })),
          }))
        } catch {
          setShop((prev) => ({ ...prev, services: [] }))
        }
      } catch (error: any) {
        const message = String(error?.message || 'Erro ao carregar barbearia')
        setLoadError(message)
      } finally {
        setLoading(false)
      }
    }

    carregarBarbearia()
  }, [params.id])

  const whatsappLink = useMemo(() => {
    const message = encodeURIComponent(`Olá! Quero agendar um horário na ${shop.name}.`)
    if (!shop.whatsapp) return '#'
    return `https://wa.me/${shop.whatsapp}?text=${message}`
  }, [shop.name, shop.whatsapp])

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Carregando barbearia...</p>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold">Barbearia não encontrada</h1>
          <p className="text-zinc-400">A barbearia solicitada pode não existir neste ambiente local.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para início
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="fixed top-0 w-full bg-black/95 backdrop-blur-md border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3 flex justify-between items-center gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2 sm:gap-3">
              <img src="/logo.png" alt="O Corte Certo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white" />
              <span className="text-sm sm:text-lg font-bold text-white hidden xs:inline">O Corte Certo</span>
            </Link>
            <div className="hidden md:block border-l border-zinc-700 pl-3 min-w-0">
              <span className="font-semibold truncate block">{shop.name}</span>
            </div>
          </div>

          <Link href="/buscar" className="flex items-center gap-1.5 sm:gap-2 text-zinc-300 hover:text-white text-sm">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Voltar</span>
          </Link>
        </div>
      </header>

      <section className="relative border-b border-white/10 pt-14 sm:pt-16">
        <div className="h-40 sm:h-64 md:h-80 w-full bg-cover bg-center" style={{ backgroundImage: `url(${shop.bannerImage})` }}>
          <div className="h-full w-full bg-gradient-to-t from-black via-black/60 to-black/20" />
        </div>

        <div className="mx-auto -mt-12 sm:-mt-16 max-w-7xl px-4 pb-4 sm:pb-6 md:px-6">
          <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-zinc-950/95 p-4 sm:p-5 md:p-6 backdrop-blur-sm">
            <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                {!shop.logoImage || logoError ? (
                  <ShopLogoFallback className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20" />
                ) : (
                  <img
                    src={shop.logoImage}
                    alt={shop.name}
                    onError={() => setLogoError(true)}
                    className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 rounded-xl border border-white/20 object-cover"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-zinc-400">Barbearia</p>
                  <h1 className="text-lg sm:text-2xl md:text-3xl font-semibold text-white truncate">{shop.name}</h1>
                  <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-zinc-300 line-clamp-1">{shop.tagline}</p>
                </div>
              </div>
              <div className="rounded-lg sm:rounded-xl border border-white/10 bg-black/50 px-3 sm:px-4 py-2 sm:py-3 text-sm flex sm:block items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-white">{shop.rating.toFixed(1)} <span className="text-zinc-400">/ 5.0</span></p>
                  <p className="text-amber-400 text-xs sm:text-sm">{shop.rating > 0 ? ratingStars(shop.rating) : 'Sem notas'}</p>
                </div>
                <p className="text-zinc-400 text-xs sm:text-sm">{shop.reviewsCount} avaliações</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-24 pt-4 sm:pt-6 md:px-6 lg:grid lg:grid-cols-[2fr_1fr] lg:gap-8 lg:pb-12">
        {/* Main Content */}
        <section className="space-y-4 sm:space-y-6">
          <article className="rounded-xl sm:rounded-2xl border border-white/10 bg-zinc-950 p-4 sm:p-5 md:p-6">
            <h2 className="text-base sm:text-lg font-semibold">Sobre a barbearia</h2>
            <p className="mt-2 sm:mt-3 leading-relaxed text-zinc-300 text-sm sm:text-base">{shop.description}</p>
          </article>

          <article className="rounded-xl sm:rounded-2xl border border-white/10 bg-zinc-950 p-4 sm:p-5 md:p-6">
            <h2 className="text-base sm:text-lg font-semibold">Galeria</h2>
            {shop.galleryImages.length === 0 ? (
              <p className="mt-2 sm:mt-3 text-sm text-zinc-400">Nenhuma imagem cadastrada na galeria.</p>
            ) : (
              <div className="mt-2 sm:mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {shop.galleryImages.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt="Imagem da galeria"
                    className="h-24 sm:h-32 w-full rounded-lg sm:rounded-xl object-cover border border-white/10"
                  />
                ))}
              </div>
            )}
          </article>

          <article className="rounded-xl sm:rounded-2xl border border-white/10 bg-zinc-950 p-4 sm:p-5 md:p-6">
            <div className="mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2 border-b border-white/10 pb-3 overflow-x-auto">
              {(['services', 'professionals', 'reviews'] as TabKey[]).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition whitespace-nowrap ${activeTab === tab ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'}`}>
                  {tab === 'services' ? 'Serviços' : tab === 'professionals' ? 'Profissionais' : 'Avaliações'}
                </button>
              ))}
            </div>

            {activeTab === 'services' && (
              <div className="space-y-2 sm:space-y-3">
                {shop.services.length === 0 && (
                  <div className="rounded-lg sm:rounded-xl border border-white/10 bg-black/50 p-3 sm:p-4 text-sm text-zinc-400">
                    Nenhum serviço cadastrado ainda.
                  </div>
                )}
                {shop.services.map((service) => (
                  <div key={service.id} className="flex items-center justify-between rounded-lg sm:rounded-xl border border-white/10 bg-black/50 p-3 sm:p-4 gap-3">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      {getServiceImageByName(service.name, service.imageUrl) ? (
                        <img
                          src={getServiceImageByName(service.name, service.imageUrl) || ''}
                          alt={service.name}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover border border-white/15 shrink-0"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/20 bg-black/40 text-[10px] text-zinc-400 sm:h-12 sm:w-12">
                          Sem foto
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-white text-sm sm:text-base truncate">{service.name}</p>
                        <p className="text-xs sm:text-sm text-zinc-400">{service.durationMinutes} min</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base sm:text-lg font-semibold text-white">{formatPrice(service.price)}</p>
                      <Link
                        href={`/barberia/${params.id}/agendar?servicoId=${service.id}`}
                        className="inline-flex items-center justify-center rounded-lg border border-white/25 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium text-white hover:bg-white hover:text-black transition mt-1"
                      >
                        Agendar
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'professionals' && (
              <div className="space-y-3">
                {shop.professionals.length === 0 && (
                  <div className="rounded-xl border border-white/10 bg-black/50 p-4 text-sm text-zinc-400">
                    Nenhum profissional cadastrado ainda.
                  </div>
                )}
                {shop.professionals.map((professional) => (
                  <div key={professional.id} className="rounded-xl border border-white/10 bg-black/50 p-4 flex items-start gap-3">
                    {professional.photoUrl ? (
                      <img
                        src={professional.photoUrl}
                        alt={professional.name}
                        className="h-12 w-12 rounded-xl border border-white/20 object-cover"
                      />
                    ) : (
                      <MonochromeAvatar label={professional.name} className="h-12 w-12" />
                    )}
                    <div>
                      <p className="font-medium text-white">{professional.name}</p>
                      <p className="text-sm text-zinc-300">{professional.role}</p>
                      <p className="text-xs text-zinc-500">{professional.experience}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-2 sm:space-y-3">
                {shop.reviews.length === 0 && (
                  <div className="rounded-lg sm:rounded-xl border border-white/10 bg-black/50 p-3 sm:p-4 text-sm text-zinc-400">
                    Nenhuma avaliação cadastrada ainda.
                  </div>
                )}
                {shop.reviews.map((review) => (
                  <div key={review.id} className="rounded-lg sm:rounded-xl border border-white/10 bg-black/50 p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-white text-sm sm:text-base">{review.author}</p>
                      <p className="text-[10px] sm:text-xs text-zinc-500 shrink-0">{review.date}</p>
                    </div>
                    <p className="mt-1 text-xs sm:text-sm text-amber-400">{ratingStars(review.rating)}</p>
                    <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-zinc-300">{review.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        {/* Sidebar */}
        <aside className="mt-4 sm:mt-6 space-y-4 sm:space-y-6 lg:mt-0">
          <article className="rounded-xl sm:rounded-2xl border border-white/10 bg-zinc-950 p-4 sm:p-5 md:p-6 hidden lg:block">
            <h3 className="text-base sm:text-lg font-semibold">Agendamento</h3>
            <p className="mt-2 text-xs sm:text-sm text-zinc-300">Reserve seu horário com confirmação rápida no WhatsApp.</p>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="mt-3 sm:mt-4 inline-flex w-full items-center justify-center rounded-lg sm:rounded-xl bg-white px-4 py-2.5 sm:py-3 text-sm font-semibold text-black transition hover:bg-zinc-200">
              Agendar via WhatsApp
            </a>
            <Link href="/buscar" className="mt-2 sm:mt-3 inline-flex w-full items-center justify-center rounded-lg sm:rounded-xl border border-white/20 px-4 py-2.5 sm:py-3 text-sm font-medium text-white hover:bg-zinc-900">
              Voltar para busca
            </Link>
          </article>

          <article className="rounded-xl sm:rounded-2xl border border-white/10 bg-zinc-950 p-4 sm:p-5 md:p-6">
            <h3 className="text-base sm:text-lg font-semibold">Comodidades</h3>
            {shop.amenities.length === 0 ? (
              <p className="mt-2 sm:mt-3 text-sm text-zinc-400">Sem comodidades cadastradas.</p>
            ) : (
              <ul className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-zinc-300">
                {shop.amenities.map((amenity) => (
                  <li key={amenity} className="flex items-center gap-2">
                    <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-white" />{amenity}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-xl sm:rounded-2xl border border-white/10 bg-zinc-950 p-4 sm:p-5 md:p-6">
            <h3 className="text-base sm:text-lg font-semibold">Localização</h3>
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-zinc-300">{shop.address}</p>
            <p className="mt-1 text-[10px] sm:text-xs text-zinc-500">{shop.district} - {shop.city}</p>
            <h4 className="mt-4 sm:mt-5 text-xs sm:text-sm font-semibold text-white">Contato</h4>
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-zinc-300">{shop.phone || 'Não informado'}</p>
            <div className="mt-5 border-t border-white/10 pt-5">
              <h4 className="text-sm font-semibold text-white">Horário de atendimento</h4>
              {diasAtendimento.length > 0 ? (
                <div className="mt-5 divide-y divide-white/5">
                  {diasAtendimento.map((dia) => {
                    const todayKey = DAY_KEY_BY_INDEX[agoraReferencia.getDay()]
                    const isToday = dia.key === todayKey
                    const abertoAgora = isToday && estaDentroDoExpediente(dia, agoraReferencia)
                    const fechadoAgora = isToday && !abertoAgora

                    return (
                      <div key={dia.key || dia.label} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className={`text-sm ${isToday ? 'font-semibold text-white' : 'text-zinc-400'}`}>
                            {dia.label}
                          </p>
                          {isToday && (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${fechadoAgora ? 'bg-red-500/15 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                              Hoje
                            </span>
                          )}
                        </div>
                        <div className={`shrink-0 space-y-0.5 text-right text-sm font-medium ${fechadoAgora ? 'text-red-300' : 'text-zinc-300'}`}>
                          {fechadoAgora ? (
                            <p>Fechado</p>
                          ) : (
                            dia.intervalos.map((intervalo) => (
                              <p key={`${intervalo.abertura}-${intervalo.fechamento}`}>
                                {horarioCurto(intervalo.abertura)} - {horarioCurto(intervalo.fechamento)}
                              </p>
                            ))
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : shop.openingHours.length === 0 ? (
                <p className="mt-3 text-xs sm:text-sm text-zinc-400">Horários não informados.</p>
              ) : (
                <ul className="mt-3 space-y-1 text-xs sm:text-sm text-zinc-300">
                  {shop.openingHours.map((hour) => (<li key={hour}>{hour}</li>))}
                </ul>
              )}
            </div>
          </article>
        </aside>
      </div>

      {/* Floating Button Mobile */}
      <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="fixed bottom-4 left-4 right-4 inline-flex items-center justify-center rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-black shadow-lg transition active:scale-[0.98] hover:bg-zinc-200 lg:hidden">
        Agendar agora via WhatsApp
      </a>

      <AccessibilityShortcuts mobileOffsetClass="bottom-24" />
    </main>
  )
}

