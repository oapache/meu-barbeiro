'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { MapPin, Phone, Clock, Star, Calendar, Check, ArrowLeft } from 'lucide-react'

type TabKey = 'services' | 'professionals' | 'reviews'

const mockShop = {
  id: '1',
  name: 'Barbearia do João',
  rating: 4.8,
  reviewsCount: 48,
  bannerImage: 'https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?auto=format&fit=crop&w=1600&q=80',
  logoImage: '/logo.jpg',
  tagline: 'Corte moderno e barba profissional.',
  description: 'Especialistas em corte masculino, barba e acabamento. Ambiente confortável, atendimento personalizado e foco total na sua experiência.',
  address: 'Rua das Barbas, 123 - São Paulo, SP',
  district: 'Centro',
  city: 'São Paulo',
  phone: '(11) 99999-9999',
  whatsapp: '5511999999999',
  openingHours: [
    'Segunda a Sexta: 09:00 - 20:00',
    'Sábado: 09:00 - 18:00',
    'Domingo: Fechado',
  ],
  amenities: ['Wi-Fi', 'Ar-condicionado', 'Acessibilidade', 'Pagamento por cartão'],
  services: [
    { id: 's1', name: 'Corte Masculino', price: 55, durationMinutes: 40 },
    { id: 's2', name: 'Barba Completa', price: 45, durationMinutes: 30 },
    { id: 's3', name: 'Corte + Barba', price: 95, durationMinutes: 70 },
    { id: 's4', name: 'Pezinho e Acabamento', price: 30, durationMinutes: 20 },
  ],
  professionals: [
    { id: 'p1', name: 'João Silva', role: 'Barbeiro Senior', experience: '8 anos de experiência' },
    { id: 'p2', name: 'Pedro Santos', role: 'Especialista em Fade', experience: '6 anos de experiência' },
  ],
  reviews: [
    { id: 'r1', author: 'Thiago A.', rating: 5, comment: 'Atendimento impecável e corte exatamente como pedi.', date: '12/03/2026' },
    { id: 'r2', author: 'Marcos V.', rating: 5, comment: 'Ambiente top, pontualidade e profissionais muito bons.', date: '08/03/2026' },
  ],
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function ratingStars(rating: number) {
  const full = Math.round(rating)
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}

export default function BarberShopDetailPage({ params }: { params: { id: string } }) {
  const { isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>('services')

  const whatsappLink = useMemo(() => {
    const message = encodeURIComponent(`Olá! Quero agendar um horário na ${mockShop.name}.`)
    return `https://wa.me/${mockShop.whatsapp}?text=${message}`
  }, [])

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-black/95 backdrop-blur-md border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/buscar" className="flex items-center gap-2 text-zinc-300 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </Link>
          <span className="font-bold truncate">{mockShop.name}</span>
          <button className="text-zinc-300 hover:text-white">
            <Star className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Banner */}
      <section className="relative border-b border-white/10">
        <div className="h-64 w-full bg-cover bg-center md:h-80" style={{ backgroundImage: `url(${mockShop.bannerImage})` }}>
          <div className="h-full w-full bg-gradient-to-t from-black via-black/60 to-black/20" />
        </div>

        <div className="mx-auto -mt-16 max-w-7xl px-4 pb-6 md:px-6">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/95 p-5 backdrop-blur-sm md:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <img src={mockShop.logoImage} alt={mockShop.name} className="h-16 w-16 rounded-xl border border-white/20 object-cover sm:h-20 sm:w-20" />
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Barbearia</p>
                  <h1 className="text-2xl font-semibold text-white md:text-3xl">{mockShop.name}</h1>
                  <p className="mt-1 text-sm text-zinc-300">{mockShop.tagline}</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm">
                <p className="font-medium text-white">{mockShop.rating.toFixed(1)} <span className="text-zinc-400">/ 5.0</span></p>
                <p className="text-amber-400">{ratingStars(mockShop.rating)}</p>
                <p className="text-zinc-400">{mockShop.reviewsCount} avaliações</p>
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
            <p className="mt-3 leading-relaxed text-zinc-300">{mockShop.description}</p>
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
                {mockShop.services.map((service) => (
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
                {mockShop.professionals.map((professional) => (
                  <div key={professional.id} className="rounded-xl border border-white/10 bg-black/50 p-4">
                    <p className="font-medium text-white">{professional.name}</p>
                    <p className="text-sm text-zinc-300">{professional.role}</p>
                    <p className="text-xs text-zinc-500">{professional.experience}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-3">
                {mockShop.reviews.map((review) => (
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
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              {mockShop.amenities.map((amenity) => (
                <li key={amenity} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />{amenity}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-white/10 bg-zinc-950 p-5 md:p-6">
            <h3 className="text-lg font-semibold">Localização</h3>
            <p className="mt-3 text-sm text-zinc-300">{mockShop.address}</p>
            <p className="mt-1 text-xs text-zinc-500">{mockShop.district} - {mockShop.city}</p>
            <h4 className="mt-5 text-sm font-semibold text-white">Contato</h4>
            <p className="mt-2 text-sm text-zinc-300">{mockShop.phone}</p>
            <h4 className="mt-5 text-sm font-semibold text-white">Horários</h4>
            <ul className="mt-2 space-y-1 text-sm text-zinc-300">
              {mockShop.openingHours.map((hour) => (<li key={hour}>{hour}</li>))}
            </ul>
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
