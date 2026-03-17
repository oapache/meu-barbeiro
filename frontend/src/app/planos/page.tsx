'use client'

import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

const PLANOS = [
  {
    key: 'professionals_1',
    nome: '1 Profissional',
    mensal: 'R$ 34,90/mês',
    primeiroMes: 'R$ 25,00',
    economia: 'Economia de R$ 9,90 no 1º mês',
    destaque: '',
    principal: false,
  },
  {
    key: 'professionals_2_5',
    nome: '2 a 5 Profissionais',
    mensal: 'R$ 69,90/mês',
    primeiroMes: 'R$ 49,00',
    economia: 'Economia de R$ 20,90 no 1º mês',
    destaque: 'Mais escolhido',
    principal: true,
  },
  {
    key: 'professionals_6_15',
    nome: '6 a 15 Profissionais',
    mensal: 'R$ 119,90/mês',
    primeiroMes: 'R$ 89,00',
    economia: 'Economia de R$ 30,90 no 1º mês',
    destaque: '',
    principal: false,
  },
  {
    key: 'professionals_15_plus',
    nome: '+15 Profissionais',
    mensal: 'R$ 159,90/mês',
    primeiroMes: 'R$ 129,00',
    economia: 'Economia de R$ 30,90 no 1º mês',
    destaque: '',
    principal: false,
  },
]

const RECURSOS_COMUNS = [
  'Todos os recursos premium incluídos',
  'Varia somente a quantidade de funcionários',
  'Suporte para operação diária',
]

export default function PlanosPublicPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 w-full bg-black/95 backdrop-blur-md border-b border-white/10 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Sou Barbeiro" className="w-12 h-12 rounded-full object-cover border border-white" />
            <span className="text-lg font-bold text-white">Sou Barbeiro</span>
          </Link>
          <nav className="flex gap-6">
            <Link href="/" className="text-sm font-medium text-zinc-300 hover:text-white transition">Início</Link>
            <Link href="/buscar" className="text-sm font-medium text-zinc-300 hover:text-white transition">Buscar</Link>
            <Link href="/login" className="text-sm font-medium text-zinc-300 hover:text-white transition">Entrar</Link>
          </nav>
        </div>
      </header>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-4">Planos</h1>
          <p className="text-zinc-400 text-center mb-2">Escolha o plano ideal pelo tamanho da sua equipe.</p>
          <p className="text-zinc-400 text-center text-sm mb-2">Todos os planos possuem as mesmas funcionalidades premium.</p>
          <p className="text-zinc-500 text-center text-sm mb-8">Todos os planos incluem 7 dias grátis. Em caso de falha no pagamento, há 7 dias de carência antes do bloqueio de funcionalidades premium.</p>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            {PLANOS.map((plano) => (
              <article
                key={plano.key}
                className={`p-6 rounded-2xl border ${plano.principal ? 'border-white bg-zinc-100 text-black shadow-2xl shadow-white/10' : 'border-white/10 bg-zinc-900/50 text-white'}`}
              >
                <div className="min-h-[28px] mb-3">
                  {plano.destaque ? (
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${plano.principal ? 'bg-black text-white' : 'bg-white/10 text-zinc-200 border border-white/20'}`}>
                      {plano.destaque}
                    </span>
                  ) : null}
                </div>

                <h2 className="text-xl font-semibold mb-2">{plano.nome}</h2>
                <p className={`${plano.principal ? 'text-zinc-700' : 'text-zinc-300'} text-sm mb-1`}>{plano.mensal}</p>
                <p className={`text-sm font-medium ${plano.principal ? 'text-emerald-700' : 'text-emerald-300'} mb-1`}>1º mês: {plano.primeiroMes}</p>
                <p className={`text-xs ${plano.principal ? 'text-zinc-600' : 'text-zinc-400'} mb-5`}>{plano.economia}</p>

                <ul className={`space-y-2 mb-6 text-sm ${plano.principal ? 'text-zinc-700' : 'text-zinc-300'}`}>
                  {RECURSOS_COMUNS.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${plano.principal ? 'text-green-600' : 'text-green-500'}`} />
                      {item}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login?redirect=/barbearia/planos"
                  className={`block w-full py-3 rounded-full font-medium text-center transition ${plano.principal ? 'bg-black text-white hover:bg-zinc-800' : 'border border-white/20 hover:bg-white/10'}`}
                >
                  Escolher este plano
                </Link>
              </article>
            ))}
          </div>

        </div>
      </section>
    </main>
  )
}
