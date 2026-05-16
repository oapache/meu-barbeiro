'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, Menu, X } from 'lucide-react'

type NavLink = {
  href: string
  label: string
}

type FeatureCard = {
  label: string
  description: string
}

type ProfessionalAccessShellProps = {
  audienceLabel: string
  currentLabel: string
  navLinks: NavLink[]
  heroEyebrow: string
  heroTitle: string
  heroDescription: string
  heroCards: FeatureCard[]
  panelEyebrow: string
  panelTitle: string
  panelDescription: string
  panelContent: ReactNode
  panelFooter?: ReactNode
}

export default function ProfessionalAccessShell({
  audienceLabel,
  currentLabel,
  navLinks,
  heroEyebrow,
  heroTitle,
  heroDescription,
  heroCards,
  panelEyebrow,
  panelTitle,
  panelDescription,
  panelContent,
  panelFooter,
}: ProfessionalAccessShellProps) {
  const [menuAberto, setMenuAberto] = useState(false)

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

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-16 top-40 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
      </div>

      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/88 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:py-4">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="O Corte Certo"
              className="h-10 w-10 rounded-full border border-white/15 object-cover md:h-12 md:w-12"
            />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-white">O Corte Certo</p>
              <p className="truncate text-sm text-zinc-500">{audienceLabel}</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <span className="text-sm font-medium text-white">{currentLabel}</span>
          </nav>

          <button
            type="button"
            onClick={() => setMenuAberto(!menuAberto)}
            className="rounded-full border border-white/10 p-2 text-white transition-transform active:scale-95 md:hidden"
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
          >
            {menuAberto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-40 bg-black/92 backdrop-blur-lg transition-all duration-300 md:hidden ${
          menuAberto ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
        onClick={() => setMenuAberto(false)}
      >
        <nav
          className={`flex h-full flex-col items-center justify-center gap-8 transition-transform duration-300 ${
            menuAberto ? 'translate-y-0' : '-translate-y-8'
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuAberto(false)}
              className="text-2xl font-semibold text-white transition-colors hover:text-zinc-300"
            >
              {link.label}
            </Link>
          ))}
          <span className="text-2xl font-semibold text-emerald-300">{currentLabel}</span>
        </nav>
      </div>

      <section className="relative flex min-h-screen items-center px-4 pb-12 pt-28 md:pt-36">
        <div className="mx-auto grid w-full max-w-[1100px] gap-4 lg:grid-cols-[1.02fr,0.92fr] xl:max-w-[1160px] xl:gap-6">
          <aside className="order-2 relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-emerald-500/12 via-zinc-950 to-[#0b0b0d] p-6 sm:p-7 lg:order-1 lg:p-8">
            <div className="absolute right-0 top-0 h-40 w-40 translate-x-1/3 -translate-y-1/3 rounded-full bg-emerald-400/12 blur-3xl" />
            <div className="relative">
              <p className="text-xs font-medium uppercase tracking-[0.35em] text-emerald-300/85">{heroEyebrow}</p>
              <h1 className="mt-5 max-w-xl text-[2.15rem] font-semibold leading-tight text-white sm:text-[2.55rem] xl:text-[2.8rem]">
                {heroTitle}
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-7 text-zinc-300">{heroDescription}</p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {heroCards.map((card) => (
                  <article key={card.label} className="rounded-[20px] border border-white/10 bg-black/35 p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">{card.label}</p>
                    <p className="mt-3 text-[15px] leading-6 text-white">{card.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </aside>

          <section className="order-1 rounded-[28px] border border-white/10 bg-[#111114]/95 p-6 sm:p-7 lg:order-2 lg:p-6 xl:p-7">
            <div>
              <p className="text-sm font-medium text-zinc-400">{panelEyebrow}</p>
              <h2 className="mt-4 text-[2rem] font-semibold leading-tight text-white xl:text-[2.15rem]">
                {panelTitle}
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-zinc-300">{panelDescription}</p>
            </div>

            <div className="mt-7">{panelContent}</div>

            {panelFooter ? (
              <div className="mt-5 border-t border-white/8 pt-5 text-sm text-zinc-400">
                {panelFooter}
              </div>
            ) : null}

            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-white transition-colors hover:text-zinc-300"
            >
              Voltar ao início
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </section>
    </main>
  )
}
