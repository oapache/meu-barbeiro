'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowUp, Home, Search, UserRound } from 'lucide-react'

type AccessibilityShortcutsProps = {
  mobileOffsetClass?: string
}

const atalhos = [
  {
    href: '/buscar',
    label: 'Buscar',
    icon: Search,
  },
  {
    href: '/perfil',
    label: 'Perfil',
    icon: UserRound,
  },
  {
    href: '/',
    label: 'Início',
    icon: Home,
  },
]

export default function AccessibilityShortcuts({
  mobileOffsetClass = 'bottom-6',
}: AccessibilityShortcutsProps) {
  const pathname = usePathname()
  const [mostrarTopo, setMostrarTopo] = useState(false)

  useEffect(() => {
    const atualizarVisibilidadeTopo = () => {
      setMostrarTopo(window.scrollY > 160)
    }

    atualizarVisibilidadeTopo()
    window.addEventListener('scroll', atualizarVisibilidadeTopo, { passive: true })

    return () => {
      window.removeEventListener('scroll', atualizarVisibilidadeTopo)
    }
  }, [])

  const irParaTopo = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <aside
      aria-label="Atalhos de acessibilidade"
      className={`fixed left-3 ${mobileOffsetClass} z-40 md:left-6 md:bottom-auto md:top-1/2 md:-translate-y-1/2`}
    >
      <div className="w-[132px] rounded-2xl border border-white/10 bg-zinc-950/92 p-2 shadow-2xl shadow-black/30 backdrop-blur-md">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-300/75">
          Atalhos
        </p>

        <div className="flex flex-col gap-2">
          {atalhos.map((atalho) => {
            const Icon = atalho.icon
            const ativo = pathname === atalho.href

            return (
              <Link
                key={atalho.href}
                href={atalho.href}
                aria-label={`Ir para ${atalho.label}`}
                aria-current={ativo ? 'page' : undefined}
                className={`inline-flex min-h-[46px] items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white/30 ${
                  ativo
                    ? 'border-emerald-400/40 bg-emerald-400/10 text-white'
                    : 'border-white/8 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08]'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${ativo ? 'text-emerald-300' : 'text-zinc-400'}`} />
                <span>{atalho.label}</span>
              </Link>
            )
          })}

          <button
            type="button"
            onClick={irParaTopo}
            aria-label="Voltar para o topo"
            disabled={!mostrarTopo}
            className={`inline-flex min-h-[46px] items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-white/30 ${
              mostrarTopo
                ? 'border-white/8 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.08] active:scale-[0.98]'
                : 'cursor-not-allowed border-white/5 bg-white/[0.02] text-zinc-600'
            }`}
          >
            <ArrowUp className={`h-4 w-4 shrink-0 ${mostrarTopo ? 'text-zinc-300' : 'text-zinc-600'}`} />
            <span>Topo</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
