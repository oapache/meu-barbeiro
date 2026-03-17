'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ApiService from '@/services/api'
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
  const [metricas, setMetricas] = useState({
    totalBarbearias: 0,
    totalClientes: 0,
    notaMedia: 0,
    carregando: true,
  })

  useEffect(() => {
    const carregarMetricas = async () => {
      try {
        const resposta = await ApiService.getPublicStats()
        const stats = resposta?.stats || {}

        setMetricas({
          totalBarbearias: Number(stats.total_barbearias || 0),
          totalClientes: Number(stats.total_clientes || 0),
          notaMedia: Number(stats.nota_media || 0),
          carregando: false,
        })
      } catch {
        setMetricas((prev) => ({ ...prev, carregando: false }))
      }
    }

    carregarMetricas()
  }, [])

  const formatarInteiro = (valor: number) => new Intl.NumberFormat('pt-BR').format(valor)

  const planos = [
    {
      id: 'professionals_1',
      nome: '1 Profissional',
      mensal: 'R$ 34,90/mês',
      primeiroMes: 'R$ 25,00',
      economia: 'Economia de R$ 9,90 no 1º mês',
      destaque: '',
      recursos: ['Todos os recursos premium incluídos', 'Varia somente a quantidade de funcionários', 'Suporte para operação diária'],
      principal: false,
    },
    {
      id: 'professionals_2_5',
      nome: '2 a 5 Profissionais',
      mensal: 'R$ 69,90/mês',
      primeiroMes: 'R$ 49,00',
      economia: 'Economia de R$ 20,90 no 1º mês',
      destaque: 'Mais escolhido',
      recursos: ['Todos os recursos premium incluídos', 'Varia somente a quantidade de funcionários', 'Suporte para operação diária'],
      principal: true,
    },
    {
      id: 'professionals_6_15',
      nome: '6 a 15 Profissionais',
      mensal: 'R$ 119,90/mês',
      primeiroMes: 'R$ 89,00',
      economia: 'Economia de R$ 30,90 no 1º mês',
      destaque: '',
      recursos: ['Todos os recursos premium incluídos', 'Varia somente a quantidade de funcionários', 'Suporte para operação diária'],
      principal: false,
    },
    {
      id: 'professionals_15_plus',
      nome: '+15 Profissionais',
      mensal: 'R$ 159,90/mês',
      primeiroMes: 'R$ 129,00',
      economia: 'Economia de R$ 30,90 no 1º mês',
      destaque: '',
      recursos: ['Todos os recursos premium incluídos', 'Varia somente a quantidade de funcionários', 'Suporte para operação diária'],
      principal: false,
    },
  ]

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-black/95 backdrop-blur-md border-b border-white/10 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Sou Barbeiro" className="w-14 h-14 rounded-full object-cover border-2 border-white" />
            <span className="text-lg font-bold text-white">Sou Barbeiro</span>
          </Link>
          <nav className="flex gap-6">
            <Link href="/" className="text-sm font-medium text-zinc-300 hover:text-white transition">
              Início
            </Link>
            <Link href="/planos" className="text-sm font-medium text-zinc-300 hover:text-white transition">
              Planos
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

      <section className="px-4 pb-4">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-zinc-900 p-6 md:p-7">
            <p className="text-emerald-300 text-xs font-semibold tracking-wide uppercase">Destaque para barbearias</p>
            <h2 className="text-xl md:text-2xl font-bold mt-2">Cadastrar sua barbearia sem pagar nada é possível.</h2>
            <p className="text-zinc-300 mt-2">Cadastre para aumentar sua relevância e aparecer para mais clientes na plataforma.</p>
            <Link
              href="/cadastro"
              className="inline-flex items-center justify-center mt-5 px-5 py-3 rounded-full bg-white text-black font-semibold hover:bg-zinc-200 transition-all"
            >
              Cadastrar minha barbearia
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 border-y border-white/10">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          <div>
            <p className="text-3xl font-bold text-white">{metricas.carregando ? '...' : formatarInteiro(metricas.totalBarbearias)}</p>
            <p className="text-zinc-500 text-sm">Barbearias</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{metricas.carregando ? '...' : formatarInteiro(metricas.totalClientes)}</p>
            <p className="text-zinc-500 text-sm">Clientes</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{metricas.carregando ? '...' : metricas.notaMedia > 0 ? metricas.notaMedia.toFixed(1) : '-'}</p>
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
          <h2 className="text-3xl font-bold text-center mb-16">Por que escolher o Sou Barbeiro?</h2>
          
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
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Planos</h2>
          <p className="text-zinc-400 text-center mb-3">Escolha o plano ideal pelo tamanho da sua equipe</p>
          <p className="text-zinc-400 text-center text-sm mb-2">Todos os planos entregam as mesmas funcionalidades premium.</p>
          <p className="text-zinc-500 text-center text-sm mb-5">Todos os planos incluem 7 dias grátis. Em caso de falha no pagamento, há 7 dias de carência antes do bloqueio de funcionalidades premium.</p>
          <div className="flex flex-wrap justify-center gap-2 mb-12 text-xs">
            <span className="px-3 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">7 dias grátis</span>
            <span className="px-3 py-1 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300">Sem burocracia no início</span>
            <span className="px-3 py-1 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300">7 dias de carência após falha de pagamento</span>
          </div>
          
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            {planos.map((plano) => (
              <article
                key={plano.id}
                className={`p-6 rounded-2xl border ${plano.principal ? 'border-white bg-zinc-100 text-black shadow-2xl shadow-white/10' : 'border-white/10 bg-zinc-900/50 text-white'}`}
              >
                <div className="min-h-[28px] mb-3">
                  {plano.destaque ? (
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${plano.principal ? 'bg-black text-white' : 'bg-white/10 text-zinc-200 border border-white/20'}`}>
                      {plano.destaque}
                    </span>
                  ) : null}
                </div>

                <h3 className="text-xl font-semibold mb-2">{plano.nome}</h3>
                <p className={`${plano.principal ? 'text-zinc-700' : 'text-zinc-300'} text-sm mb-1`}>{plano.mensal}</p>
                <p className={`text-sm font-medium ${plano.principal ? 'text-emerald-700' : 'text-emerald-300'} mb-1`}>1º mês: {plano.primeiroMes}</p>
                <p className={`text-xs ${plano.principal ? 'text-zinc-600' : 'text-zinc-400'} mb-5`}>{plano.economia}</p>

                <ul className={`space-y-2 mb-6 text-sm ${plano.principal ? 'text-zinc-700' : 'text-zinc-300'}`}>
                  {plano.recursos.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${plano.principal ? 'text-green-600' : 'text-green-500'}`} />
                      {item}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/planos"
                  className={`block w-full py-3 rounded-full font-medium text-center transition ${plano.principal ? 'bg-black text-white hover:bg-zinc-800' : 'border border-white/20 hover:bg-white/10'}`}
                >
                  Assinar agora
                </Link>
              </article>
            ))}
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/logo.jpg" alt="Sou Barbeiro" className="w-10 h-10 rounded-full object-cover border border-white" />
            <span className="font-bold">Sou Barbeiro</span>
          </div>
          <p className="text-zinc-500 text-sm">
            © 2026 Sou Barbeiro. Uma nova experiência para uma tradição antiga.
          </p>
        </div>
      </footer>
    </main>
  )
}
