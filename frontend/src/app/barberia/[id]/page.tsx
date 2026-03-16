'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import ApiService from '@/services/api'
import { MapPin, Phone, Clock, Star, Calendar, Check, ArrowLeft } from 'lucide-react'

type TabKey = 'services' | 'professionals' | 'reviews'

type Service = {
  id: string
  name: string
  price: number
  durationMinutes: number
}

type Professional = {
  id: string
  name: string
  role: string
  experience: string
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
}

const defaultShop = {
  id: '1',
  name: 'Barbearia',
  rating: 0,
  reviewsCount: 0,
  bannerImage: 'https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?auto=format&fit=crop&w=1600&q=80',
  logoImage: '/logo.jpg',
  tagline: 'Conheca os servicos e profissionais desta barbearia.',
  description: 'Acompanhe as informacoes atualizadas da barbearia.',
  address: 'Endereco nao informado',
  district: 'Regiao',
  city: 'Cidade',
  phone: '',
  whatsapp: '',
  openingHours: [] as string[],
  amenities: [] as string[],
  services: [] as Service[],
  professionals: [] as Professional[],
  reviews: [] as Review[],
}

const extrairCidadeUF = (endereco: string) => {
  if (!endereco) return { district: 'Regiao', city: 'Cidade' }
  const partes = endereco.split(',').map((p) => p.trim()).filter(Boolean)

  if (partes.length >= 2) {
    const ultimas = partes[partes.length - 1]
    const penultima = partes[partes.length - 2]
    return {
      district: penultima || 'Regiao',
      city: ultimas || 'Cidade',
    }
  }

  return { district: 'Regiao', city: endereco }
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function ratingStars(rating: number) {
  const full = Math.round(rating)
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}

const DAY_KEY_BY_INDEX = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

const horarioCurto = (valor: string) => (valor || '').slice(0, 5)

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

const carregarJsonStorage = <T,>(key: string, fallback: T): T => {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export default function BarberShopDetailPage({ params }: { params: { id: string } }) {
  const { isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>('services')
  const [shop, setShop] = useState(defaultShop)
  const [loading, setLoading] = useState(true)
  const [logoError, setLogoError] = useState(false)
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleItem[]>([])

  useEffect(() => {
    const carregarBarbearia = async () => {
      try {
        setLoading(true)

        const detalhe = await ApiService.getBarbearia(params.id)
        const barbearia = detalhe?.barbearia

        if (barbearia) {
          const { district, city } = extrairCidadeUF(barbearia.endereco || '')

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
              `Horario principal: ${barbearia.horario_abertura || '09:00'} - ${barbearia.horario_fechamento || '20:00'}`,
            ],
            tagline: `Atendimento profissional na ${barbearia.nome || 'barbearia'}.`,
          }))
        }

        const horariosSalvos = carregarJsonStorage<any[]>(`barbearia_horarios_${params.id}`, [])
        if (Array.isArray(horariosSalvos) && horariosSalvos.length > 0) {
          const semanal = horariosSalvos.map((dia) => ({
            key: String(dia?.key || ''),
            label: String(dia?.label || ''),
            fechado: Boolean(dia?.fechado),
            abertura: String(dia?.abertura || ''),
            fechamento: String(dia?.fechamento || ''),
          }))

          setWeeklySchedule(semanal)
        }

        const amenidadesSalvas = carregarJsonStorage<string[]>(`barbearia_amenidades_${params.id}`, [])
        if (Array.isArray(amenidadesSalvas) && amenidadesSalvas.length > 0) {
          setShop((prev) => ({ ...prev, amenities: amenidadesSalvas }))
        }

        const profissionaisSalvos = carregarJsonStorage<any[]>(`barbearia_profissionais_${params.id}`, [])
        if (Array.isArray(profissionaisSalvos) && profissionaisSalvos.length > 0) {
          setShop((prev) => ({
            ...prev,
            professionals: profissionaisSalvos.map((p) => ({
              id: String(p.id),
              name: p.nome,
              role: p.cargo,
              experience: p.experiencia,
            })),
          }))
        }

        const avaliacoesSalvas = carregarJsonStorage<any[]>(`barbearia_avaliacoes_${params.id}`, [])
        if (Array.isArray(avaliacoesSalvas) && avaliacoesSalvas.length > 0) {
          const reviews = avaliacoesSalvas.map((r) => ({
            id: String(r.id),
            author: r.autor,
            rating: Number(r.nota || 0),
            comment: r.comentario,
            date: r.data,
          }))

          const media = reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length

          setShop((prev) => ({
            ...prev,
            reviews,
            reviewsCount: reviews.length,
            rating: Number.isFinite(media) ? media : 0,
          }))
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
            })),
          }))
        } catch {
          setShop((prev) => ({ ...prev, services: [] }))
        }
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

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-black/95 backdrop-blur-md border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo.jpg" alt="Meu Barbeiro" className="w-10 h-10 rounded-full object-cover border-2 border-white" />
              <span className="text-lg font-bold text-white">Meu Barbeiro</span>
            </Link>
            <div className="hidden md:block border-l border-zinc-700 pl-3 min-w-0">
              <span className="font-semibold truncate block">{shop.name}</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-5 text-sm">
            <Link href="/" className="text-zinc-300 hover:text-white transition">Início</Link>
            <Link href="/buscar" className="text-white font-medium">Buscar</Link>
          </nav>

          <Link href="/buscar" className="flex items-center gap-2 text-zinc-300 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </Link>
        </div>
      </header>

      {/* Banner */}
      <section className="relative border-b border-white/10 pt-16">
        <div className="h-64 w-full bg-cover bg-center md:h-80" style={{ backgroundImage: `url(${shop.bannerImage})` }}>
          <div className="h-full w-full bg-gradient-to-t from-black via-black/60 to-black/20" />
        </div>

        <div className="mx-auto -mt-16 max-w-7xl px-4 pb-6 md:px-6">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/95 p-5 backdrop-blur-sm md:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {!shop.logoImage || logoError ? (
                  <MonochromeAvatar label={shop.name} className="h-16 w-16 sm:h-20 sm:w-20" />
                ) : (
                  <img
                    src={shop.logoImage}
                    alt={shop.name}
                    onError={() => setLogoError(true)}
                    className="h-16 w-16 rounded-xl border border-white/20 object-cover sm:h-20 sm:w-20"
                  />
                )}
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Barbearia</p>
                  <h1 className="text-2xl font-semibold text-white md:text-3xl">{shop.name}</h1>
                  <p className="mt-1 text-sm text-zinc-300">{shop.tagline}</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm">
                <p className="font-medium text-white">{shop.rating.toFixed(1)} <span className="text-zinc-400">/ 5.0</span></p>
                <p className="text-amber-400">{shop.rating > 0 ? ratingStars(shop.rating) : 'Sem notas'}</p>
                <p className="text-zinc-400">{shop.reviewsCount} avaliações</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 md:px-6 lg:grid lg:grid-cols-[2fr_1fr] lg:gap-8 lg:pb-12">
        {/* Main Content */}
        <section className="space-y-6">
          <article className="rounded-2xl border border-white/10 bg-zinc-950 p-5 md:p-6">
            <h2 className="text-lg font-semibold">Sobre a barbearia</h2>
            <p className="mt-3 leading-relaxed text-zinc-300">{shop.description}</p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-zinc-950 p-5 md:p-6">
            <div className="mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
              {(['services', 'professionals', 'reviews'] as TabKey[]).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-lg px-3 py-2 text-sm font-medium transition ${activeTab === tab ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'}`}>
                  {tab === 'services' ? 'Serviços' : tab === 'professionals' ? 'Profissionais' : 'Avaliações'}
                </button>
              ))}
            </div>

            {activeTab === 'services' && (
              <div className="space-y-3">
                {shop.services.length === 0 && (
                  <div className="rounded-xl border border-white/10 bg-black/50 p-4 text-sm text-zinc-400">
                    Nenhum servico cadastrado ainda.
                  </div>
                )}
                {shop.services.map((service) => (
                  <div key={service.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/50 p-4">
                    <div>
                      <p className="font-medium text-white">{service.name}</p>
                      <p className="text-sm text-zinc-400">{service.durationMinutes} minutos</p>
                    </div>
                    <p className="text-lg font-semibold text-white">{formatPrice(service.price)}</p>
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
                    <MonochromeAvatar label={professional.name} className="h-12 w-12" />
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
              <div className="space-y-3">
                {shop.reviews.length === 0 && (
                  <div className="rounded-xl border border-white/10 bg-black/50 p-4 text-sm text-zinc-400">
                    Nenhuma avaliacao cadastrada ainda.
                  </div>
                )}
                {shop.reviews.map((review) => (
                  <div key={review.id} className="rounded-xl border border-white/10 bg-black/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-white">{review.author}</p>
                      <p className="text-xs text-zinc-500">{review.date}</p>
                    </div>
                    <p className="mt-1 text-sm text-amber-400">{ratingStars(review.rating)}</p>
                    <p className="mt-2 text-sm text-zinc-300">{review.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

        {/* Sidebar */}
        <aside className="mt-6 space-y-6 lg:mt-0">
          <article className="rounded-2xl border border-white/10 bg-zinc-950 p-5 md:p-6">
            <h3 className="text-lg font-semibold">Agendamento</h3>
            <p className="mt-2 text-sm text-zinc-300">Reserve seu horário com confirmação rápida no WhatsApp.</p>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200">
              Agendar via WhatsApp
            </a>
            <Link href="/buscar" className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-white/20 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-900">
              Voltar para busca
            </Link>
          </article>

          <article className="rounded-2xl border border-white/10 bg-zinc-950 p-5 md:p-6">
            <h3 className="text-lg font-semibold">Comodidades</h3>
            {shop.amenities.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-400">Sem comodidades cadastradas.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                {shop.amenities.map((amenity) => (
                  <li key={amenity} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />{amenity}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-2xl border border-white/10 bg-zinc-950 p-5 md:p-6">
            <h3 className="text-lg font-semibold">Localização</h3>
            <p className="mt-3 text-sm text-zinc-300">{shop.address}</p>
            <p className="mt-1 text-xs text-zinc-500">{shop.district} - {shop.city}</p>
            <h4 className="mt-5 text-sm font-semibold text-white">Contato</h4>
            <p className="mt-2 text-sm text-zinc-300">{shop.phone || 'Nao informado'}</p>
            <h4 className="mt-5 text-sm font-semibold text-white">Horários</h4>
            {weeklySchedule.length > 0 ? (
              <div className="mt-2 space-y-2">
                {weeklySchedule.map((dia) => {
                  const todayKey = DAY_KEY_BY_INDEX[new Date().getDay()]
                  const isToday = dia.key === todayKey
                  const statusColor = isToday ? (dia.fechado ? 'text-red-400' : 'text-green-400') : 'text-zinc-300'

                  return (
                    <div key={dia.key} className="rounded-lg border border-white/10 bg-black/50 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-medium ${statusColor}`}>
                          {dia.label}
                        </p>
                        {isToday && (
                          <span className={`text-xs font-semibold ${dia.fechado ? 'text-red-400' : 'text-green-400'}`}>
                            HOJE
                          </span>
                        )}
                      </div>
                      <p className={`text-sm mt-1 ${dia.fechado ? 'text-red-400' : 'text-zinc-300'}`}>
                        {dia.fechado ? 'Fechado' : `${horarioCurto(dia.abertura)} - ${horarioCurto(dia.fechamento)}`}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : shop.openingHours.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-400">Horarios nao informados.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                {shop.openingHours.map((hour) => (<li key={hour}>{hour}</li>))}
              </ul>
            )}
          </article>
        </aside>
      </div>

      {/* Floating Button Mobile */}
      <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="fixed bottom-5 left-4 right-4 inline-flex items-center justify-center rounded-xl bg-white px-5 py-4 text-sm font-semibold text-black shadow-lg transition hover:bg-zinc-200 lg:hidden">
        Agendar agora via WhatsApp
      </a>
    </main>
  )
}
