'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { MapPin, Phone, Clock, Star, Calendar, Check } from 'lucide-react'

type TabKey = 'services' | 'info'

// Dados mockados
const mockShop = {
  id: '1',
  name: 'Barbearia do João',
  rating: 4.8,
  reviewsCount: 48,
  description: 'Especialistas em corte masculino, barba e acabamento. Ambiente confortável, atendimento personalizado e foco total na sua experiência.',
  address: 'Rua das Barbas, 123 - São Paulo, SP',
  phone: '(11) 99999-9999',
  whatsapp: '5511999999999',
  horarios: 'Segunda a Sexta: 09:00 - 20:00\nSábado: 09:00 - 18:00',
  amenities: ['Wi-Fi', 'Ar-condicionado', 'Acessibilidade', 'Pagamento por cartão'],
  services: [
    { id: '1', name: 'Corte Masculino', price: 55, duration: 40 },
    { id: '2', name: 'Barba Completa', price: 45, duration: 30 },
    { id: '3', name: 'Corte + Barba', price: 95, duration: 70 },
    { id: '4', name: 'Pezinho', price: 30, duration: 20 },
  ]
}

export default function BarberiaDetailPage({ params }) {
  const { isAuthenticated } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>('services')

  const whatsappLink = useMemo(() => {
    const message = encodeURIComponent(`Olá! Gostaria de agendar um horário na ${mockShop.name}.`)
    return `https://wa.me/${mockShop.whatsapp}?text=${message}`
  }, [])

  const formatPrice = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-black/95 backdrop-blur-md border-b border-white/10 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/buscar" className="text-zinc-300 hover:text-white">
            ← Voltar
          </Link>
          <h1 className="font-bold">{mockShop.name}</h1>
          <button className="text-zinc-300">
            <Star className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Info */}
      <section className="pt-16 px-4 pb-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-zinc-800 flex items-center justify-center">
              <span className="text-2xl">✂️</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">{mockShop.name}</h2>
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span>{mockShop.rating}</span>
                <span className="text-zinc-400">({mockShop.reviewsCount} avaliações)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="max-w-2xl mx-auto flex">
          <button
            onClick={() => setActiveTab('services')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'services' ? 'border-white text-white' : 'border-transparent text-zinc-500'
            }`}
          >
            Serviços
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'info' ? 'border-white text-white' : 'border-transparent text-zinc-500'
            }`}
          >
            Informações
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
        {activeTab === 'services' && (
          <div className="space-y-3">
            {mockShop.services.map((service) => (
              <div key={service.id} className="bg-zinc-900 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{service.name}</p>
                  <p className="text-sm text-zinc-400">{service.duration} min</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatPrice(service.price)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'info' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">Sobre</h3>
              <p className="text-zinc-400 text-sm">{mockShop.description}</p>
            </div>
            
            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Localização
              </h3>
              <p className="text-zinc-400 text-sm">{mockShop.address}</p>
            </div>
            
            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horários
              </h3>
              <p className="text-zinc-400 text-sm whitespace-pre-line">{mockShop.horarios}</p>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Comodidades</h3>
              <div className="flex flex-wrap gap-2">
                {mockShop.amenities.map((amenity) => (
                  <span key={amenity} className="px-3 py-1 bg-zinc-800 rounded-full text-sm flex items-center gap-1">
                    <Check className="w-3 h-3 text-green-500" />
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botão Flutuante */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <a 
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-green-500 text-white py-3 rounded-full font-medium text-center flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Agendar
          </a>
        </div>
      </div>
    </main>
  )
}
