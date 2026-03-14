'use client'

import Link from 'next/link'
import { 
  Scissors, 
  Calendar, 
  MapPin, 
  Star, 
  Clock, 
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Users,
  Wallet
} from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-black/95 backdrop-blur-md border-b border-white/10 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Meu Barbeiro" className="w-14 h-14 rounded-full object-cover border-2 border-white" />
            <span className="text-lg font-bold text-white">Meu Barbeiro</span>
          </Link>
          <nav className="flex gap-6">
            <Link href="/" className="text-sm font-medium text-zinc-300 hover:text-white transition">
              Início
            </Link>
            <Link href="/buscar" className="text-sm font-medium text-zinc-300 hover:text-white transition">
              Buscar
            </Link>
            <Link href="/login" className="text-sm font-medium text-zinc-300 hover:text-white transition">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-sm text-zinc-300 mb-8">
            <Sparkles className="w-4 h-4" />
            <span>100% Online • Sem baixar app</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Sua barbearia no
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
              seu bolso
            </span>
          </h1>
          
          <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
            Agende seu corte sem precisar ligar. Encontre as melhores barbearias perto de você e aproveite vantagens exclusivas.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/cadastro" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-black rounded-full font-semibold hover:bg-zinc-200 transition-all">
              Começar Grátis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/buscar" className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/20 text-white rounded-full font-semibold hover:bg-white/10 transition-all">
              Ver Barbearias
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 border-y border-white/10">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-3xl font-bold text-white">500+</p>
            <p className="text-zinc-500 text-sm">Barbearias</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">10k+</p>
            <p className="text-zinc-500 text-sm">Clientes</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">4.8</p>
            <p className="text-zinc-500 text-sm">Nota Média</p>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Como funciona</h2>
          <p className="text-zinc-400 text-center mb-16">Três passos simples para seu próximo corte</p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative p-8 rounded-2xl bg-zinc-900/50 border border-white/5">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">1. Busque</h3>
              <p className="text-zinc-400">Encontre barbearias próximas de você com avaliações reais de clientes.</p>
              <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden md:block">
                <ArrowRight className="w-6 h-6 text-zinc-600" />
              </div>
            </div>
            
            <div className="relative p-8 rounded-2xl bg-zinc-900/50 border border-white/5">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                <Calendar className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">2. Agende</h3>
              <p className="text-zinc-400">Escolha o serviço, profissional e horário que melhor combina com você.</p>
              <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden md:block">
                <ArrowRight className="w-6 h-6 text-zinc-600" />
              </div>
            </div>
            
            <div className="p-8 rounded-2xl bg-zinc-900/50 border border-white/5">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                <Scissors className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">3. Corta</h3>
              <p className="text-zinc-400">Aproveite seu novo visual! Sem filas, sem burocracia.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="py-20 px-4 bg-zinc-900/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">Por que escolher o Meu Barbeiro?</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl bg-black border border-white/5">
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center mb-4">
                <Star className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Avaliações Reais</h3>
              <p className="text-sm text-zinc-400">Veja opiniões de outros clientes antes de escolher.</p>
            </div>
            
            <div className="p-6 rounded-xl bg-black border border-white/5">
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Agendamento Rápido</h3>
              <p className="text-sm text-zinc-400">Agende em menos de 30 segundos.</p>
            </div>
            
            <div className="p-6 rounded-xl bg-black border border-white/5">
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Programa de Pontos</h3>
              <p className="text-sm text-zinc-400">Acumule pontos e ganhe cortes grátis.</p>
            </div>
            
            <div className="p-6 rounded-xl bg-black border border-white/5">
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center mb-4">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Grátis para 1 Barbeiro</h3>
              <p className="text-sm text-zinc-400">Plano gratuito para barbearias individuais.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Planos</h2>
          <p className="text-zinc-400 text-center mb-12">Escolha o plano ideal para seu negócio</p>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Grátis */}
            <div className="p-8 rounded-2xl border border-white/10 bg-zinc-900/50">
              <h3 className="text-xl font-semibold mb-2">Grátis</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">R$ 0</span>
                <span className="text-zinc-500">/mês</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-zinc-300">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  1 barbeiro
                </li>
                <li className="flex items-center gap-3 text-zinc-300">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Agendamentos online
                </li>
                <li className="flex items-center gap-3 text-zinc-300">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Lista de espera
                </li>
                <li className="flex items-center gap-3 text-zinc-300">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Link WhatsApp
                </li>
              </ul>
              <Link href="/cadastro" className="block w-full py-3 border border-white/20 rounded-full font-medium text-center hover:bg-white/10 transition">
                Começar Grátis
              </Link>
            </div>

            {/* Premium */}
            <div className="p-8 rounded-2xl border border-white bg-zinc-100 text-black">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black text-white text-xs font-medium mb-4">
                Mais populares
              </div>
              <h3 className="text-xl font-semibold mb-2">Premium</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">R$ 29</span>
                <span className="text-zinc-600">/mês</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Até 3 barbeiros
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Tudo do Grátis
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Programa de fidelidade
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Relatórios
                </li>
              </ul>
              <Link href="/cadastro" className="block w-full py-3 bg-black text-white rounded-full font-medium text-center hover:bg-zinc-800 transition">
                Experimentar Grátis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/logo.jpg" alt="Meu Barbeiro" className="w-10 h-10 rounded-full object-cover border border-white" />
            <span className="font-bold">Meu Barbeiro</span>
          </div>
          <p className="text-zinc-500 text-sm">
            © 2026 Meu Barbeiro. Uma nova experiência para uma tradição antiga.
          </p>
        </div>
      </footer>
    </main>
  )
}
