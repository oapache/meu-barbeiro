'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Scissors,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Users,
  Menu,
  X,
  Home as HomeIcon,
  Search,
  User,
  Bell,
  Settings2,
  BarChart3
} from 'lucide-react'

function WhatsAppIcon({ className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M16.02 3.2A12.74 12.74 0 0 0 3.28 15.94c0 2.25.6 4.45 1.73 6.38L3.17 29l6.84-1.8a12.66 12.66 0 0 0 6.01 1.52h.01A12.74 12.74 0 0 0 28.77 16 12.75 12.75 0 0 0 16.02 3.2Zm0 23.36h-.01a10.56 10.56 0 0 1-5.38-1.48l-.39-.23-4.06 1.06 1.08-3.96-.26-.41a10.56 10.56 0 1 1 9.02 5.02Zm5.79-7.91c-.32-.16-1.88-.93-2.17-1.04-.29-.1-.5-.16-.71.16-.21.32-.82 1.04-1 1.25-.18.21-.37.24-.69.08-.32-.16-1.34-.49-2.55-1.57a9.55 9.55 0 0 1-1.76-2.19c-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.18.21-.32.32-.53.1-.21.05-.4-.03-.56-.08-.16-.71-1.71-.97-2.35-.26-.61-.52-.53-.71-.54h-.61c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.65 0 1.56 1.14 3.06 1.3 3.27.16.21 2.24 3.42 5.43 4.79.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.88-.77 2.15-1.51.26-.74.26-1.38.18-1.51-.08-.13-.29-.21-.61-.37Z" />
    </svg>
  )
}

export default function HomePage() {
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

  const planos = [
    {
      id: 'professionals_1',
      nome: '1 Profissional',
      mensal: 'R$ 34,90/mês',
      aposTrial: 'Após 7 dias grátis: R$ 34,90/mês',
      destaque: '',
      recursos: ['Todos os recursos premium incluídos', 'Varia somente a quantidade de funcionários', 'Suporte para operação diária'],
      principal: false,
    },
    {
      id: 'professionals_2_5',
      nome: '2 a 5 Profissionais',
      mensal: 'R$ 69,90/mês',
      aposTrial: 'Após 7 dias grátis: R$ 69,90/mês',
      destaque: 'Mais escolhido',
      recursos: ['Todos os recursos premium incluídos', 'Varia somente a quantidade de funcionários', 'Suporte para operação diária'],
      principal: true,
    },
    {
      id: 'professionals_6_15',
      nome: '6 a 15 Profissionais',
      mensal: 'R$ 119,90/mês',
      aposTrial: 'Após 7 dias grátis: R$ 119,90/mês',
      destaque: '',
      recursos: ['Todos os recursos premium incluídos', 'Varia somente a quantidade de funcionários', 'Suporte para operação diária'],
      principal: false,
    },
    {
      id: 'professionals_15_plus',
      nome: '+15 Profissionais',
      mensal: 'R$ 159,90/mês',
      aposTrial: 'Após 7 dias grátis: R$ 159,90/mês',
      destaque: '',
      recursos: ['Todos os recursos premium incluídos', 'Varia somente a quantidade de funcionários', 'Suporte para operação diária'],
      principal: false,
    },
  ]

  const primaryNavLinks = [
    { href: '#recursos', label: 'Recursos' },
    { href: '#planos', label: 'Planos' },
  ]

  const headerActions = [
    { href: '/buscar', label: 'Buscar' },
    { href: '/login', label: 'Entrar' },
  ]

  const mobileMenuLinks = [...primaryNavLinks, ...headerActions]

  const passosOperacao = [
    {
      titulo: '1. Configure',
      texto: 'Cadastre profissionais, serviços, preços e horários de atendimento.',
      icone: Settings2,
    },
    {
      titulo: '2. Ative sua agenda',
      texto: 'Compartilhe o link e receba reservas pelo WhatsApp sem perder o controle.',
      icone: Calendar,
    },
    {
      titulo: '3. Acompanhe tudo',
      texto: 'Veja agenda, ocupação, encaixes e alertas no painel da operação.',
      icone: BarChart3,
    },
  ]

  const recursosOperacao = [
    {
      titulo: 'Agenda online',
      texto: 'Horários, serviços e profissionais organizados em uma visão rápida.',
      icone: Calendar,
      estilo: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100',
    },
    {
      titulo: 'WhatsApp conectado',
      texto: 'Atendimento com respostas e encaixes para reduzir espera e retrabalho.',
      icone: WhatsAppIcon,
      estilo: 'border-sky-500/25 bg-sky-500/10 text-sky-100',
    },
    {
      titulo: 'Alertas inteligentes',
      texto: 'Sinais de estoque, clientes novos e horários livres antes de virar problema.',
      icone: Bell,
      estilo: 'border-amber-500/25 bg-amber-500/10 text-amber-100',
    },
    {
      titulo: 'Equipe sincronizada',
      texto: 'Planos por tamanho de equipe, com os mesmos recursos premium em todos.',
      icone: Users,
      estilo: 'border-white/10 bg-zinc-900/80 text-zinc-100',
    },
  ]

  return (
    <main className="min-h-screen bg-black text-white pb-20 md:pb-0">
      {/* Header */}
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
                className="rounded-full px-4 py-2 text-sm font-medium text-zinc-300 transition-all duration-200 hover:bg-white/10 hover:text-white"
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
            {menuAberto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div 
        className={`fixed inset-0 z-40 transition-all duration-300 md:hidden ${
          menuAberto ? 'pointer-events-auto opacity-100 visible' : 'pointer-events-none opacity-0 invisible'
        }`}
        onClick={() => setMenuAberto(false)}
      >
        <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

        <div
          className={`mobile-menu-panel absolute left-4 right-4 top-24 rounded-[28px] border border-white/10 bg-zinc-950/95 p-4 shadow-[0_28px_80px_rgba(0,0,0,0.55)] transition-all duration-300 ${
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

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 md:pt-28 pb-10 md:pb-14 px-4">
        <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute left-[-120px] top-1/2 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(600px,1fr)] lg:gap-7">
          <div className="max-w-xl">
            <p className="mb-6 text-xs uppercase tracking-[0.34em] text-emerald-300">Painel + WhatsApp</p>

            <h1 className="text-5xl font-black leading-[0.95] text-white sm:text-6xl lg:text-7xl">
              A operação da sua barbearia em tempo real.
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-zinc-200 sm:text-lg">
              Agenda, clientes, estoque e atendimento conectados no mesmo visual que sua equipe usa todos os dias.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/cadastro"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-bold text-black transition-all duration-200 hover:-translate-y-1 hover:bg-zinc-200 hover:shadow-2xl hover:shadow-white/10 active:scale-[0.98]"
              >
                Começar teste grátis
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>

              <Link
                href="/planos"
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-zinc-900/70 px-6 py-4 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-1 hover:border-white/20 hover:bg-zinc-800 active:scale-[0.98]"
              >
                Ver planos
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-white/10 bg-zinc-900/80 px-3 py-2 text-zinc-300 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-zinc-800">
                7 dias grátis
              </span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-100 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/50">
                Agenda online
              </span>
              <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sky-100 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400/50">
                WhatsApp automatizado
              </span>
            </div>
          </div>

          <div className="dashboard-preview relative mx-auto min-h-[520px] w-full max-w-[830px] lg:-translate-x-10">
            <div className="dashboard-panel group/dashboard relative w-full max-w-[560px] rounded-[28px] border border-zinc-800 bg-zinc-950/90 p-4 shadow-[0_34px_90px_rgba(0,0,0,0.62),_-18px_18px_55px_rgba(16,185,129,0.08)] transition-all duration-300 lg:[transform:perspective(1100px)_rotateX(3deg)_rotateY(-7deg)_rotate(-1.2deg)] lg:hover:border-emerald-500/40 lg:hover:shadow-[0_42px_110px_rgba(0,0,0,0.68),_-20px_22px_65px_rgba(16,185,129,0.12)] lg:hover:[transform:perspective(1100px)_rotateX(1.5deg)_rotateY(-4deg)_rotate(-0.6deg)_translateY(-8px)_scale(1.015)]">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-300/70">Resumo do dia</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">Operação de hoje</h2>
                  <p className="mt-1 text-sm text-zinc-400">Quarta, 13 maio</p>
                </div>

                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-100 transition-colors duration-200 group-hover/dashboard:border-emerald-400/50">
                  Online
                </span>
              </div>

              <div className="mb-3 grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-3 transition-all duration-200 hover:-translate-y-1 hover:border-white/20">
                  <p className="text-xs text-zinc-400">Agendamentos</p>
                  <strong className="mt-2 block text-3xl text-white">12</strong>
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-400/40">
                  <p className="text-xs text-emerald-200">Ocupação</p>
                  <strong className="mt-2 block text-3xl text-emerald-100">82%</strong>
                </div>
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 transition-all duration-200 hover:-translate-y-1 hover:border-amber-400/40">
                  <p className="text-xs text-amber-200">Alertas</p>
                  <strong className="mt-2 block text-3xl text-amber-100">4</strong>
                </div>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-[1.12fr,0.88fr]">
                <div className="space-y-2.5">
                  {[
                    ['09:30', 'Lucas - Corte + barba', 'Rafael', 'border-zinc-700 bg-zinc-900/90 text-zinc-400'],
                    ['10:15', 'Diego - Degrade', 'Marcos', 'border-zinc-700 bg-zinc-900/90 text-zinc-400'],
                    ['11:00', 'Encaixe disponível', 'WhatsApp', 'border-sky-500/30 bg-sky-500/10 text-sky-200'],
                  ].map(([hora, servico, profissional, className]) => (
                    <div
                      key={hora}
                      className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-xs transition-all duration-200 hover:-translate-y-1 hover:border-white/20 ${className}`}
                    >
                      <span className="min-w-0 truncate text-white">
                        <strong>{hora}</strong> {servico}
                      </span>
                      <span className="shrink-0">{profissional}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2.5">
                  <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-400/40">
                    <p className="font-bold text-amber-200">Estoque baixo</p>
                    <p className="mt-2 text-zinc-200">Pomada modeladora</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs transition-all duration-200 hover:-translate-y-1 hover:border-emerald-400/40">
                    <p className="font-bold text-emerald-200">Novo cliente</p>
                    <p className="mt-2 text-zinc-200">Agendado pelo link</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="assistant-preview group/assistant relative z-10 mt-4 w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950/95 p-4 shadow-[0_28px_70px_rgba(0,0,0,0.58),_-10px_12px_35px_rgba(14,165,233,0.1)] transition-all duration-300 lg:absolute lg:left-[465px] lg:top-[130px] lg:mt-0 lg:w-[272px] lg:[transform:perspective(1100px)_rotateX(3deg)_rotateY(-7deg)_rotate(-1.2deg)] lg:hover:border-sky-500/40 lg:hover:shadow-[0_36px_86px_rgba(0,0,0,0.64),_-12px_16px_45px_rgba(14,165,233,0.16)] lg:hover:[transform:perspective(1100px)_rotateX(1.5deg)_rotateY(-4deg)_rotate(-0.6deg)_translateY(-8px)_scale(1.02)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <strong className="text-sm text-white">Fila operacional</strong>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-100 transition-colors duration-200 group-hover/assistant:border-emerald-400/50">
                  Conectado
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 px-3 py-2.5 text-[11px] text-zinc-100 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400/50">
                  Cliente: Tem horário para hoje?
                </div>
                <div className="ml-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-[11px] text-zinc-100 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400/50">
                  Bot: 11:00 está livre. Quer reservar?
                </div>
                <div className="rounded-2xl border border-white/10 bg-zinc-900/90 px-3 py-2.5 text-[11px] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20">
                  <p className="font-bold text-white">Novo encaixe sugerido</p>
                  <p className="mt-1 text-zinc-400">Rafael - 11:00</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Operação */}
      <section className="px-4 py-10 md:py-16">
        <div className="mx-auto grid max-w-7xl gap-6 rounded-[28px] border border-white/10 bg-zinc-950/80 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.36)] md:grid-cols-[1fr,auto] md:items-center md:p-8">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
              <Sparkles className="h-3.5 w-3.5" />
              7 dias grátis
            </div>

            <h2 className="max-w-2xl text-2xl font-black leading-tight text-white md:text-4xl">
              Configure sua operação em minutos.
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300 md:text-base">
              Cadastre sua barbearia, ative a agenda online e acompanhe clientes, horários e alertas no mesmo padrão do painel.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row md:flex-col md:items-stretch">
            <Link
              href="/cadastro"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-black transition-all duration-200 hover:-translate-y-1 hover:bg-zinc-200 hover:shadow-xl hover:shadow-white/10 active:scale-[0.98]"
            >
              <Scissors className="h-4 w-4" />
              Cadastrar barbearia
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>

            <span className="text-center text-xs text-zinc-500 md:text-left">Leva menos de 2 minutos</span>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="px-4 py-12 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-2xl md:mb-12">
            <p className="mb-3 text-xs uppercase tracking-[0.28em] text-emerald-300">Fluxo da operação</p>
            <h2 className="text-3xl font-black leading-tight text-white md:text-5xl">Como funciona para a barbearia</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-400 md:text-base">
              Um caminho simples para sair da agenda solta e operar com previsibilidade.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-5">
            {passosOperacao.map((passo, index) => {
              const Icon = passo.icone

              return (
                <article
                  key={passo.titulo}
                  className="group relative rounded-2xl border border-white/10 bg-zinc-950/80 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/30 hover:bg-zinc-900/80 md:p-6"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition-all duration-200 group-hover:border-emerald-400/40 group-hover:bg-emerald-500/10 group-hover:text-emerald-100">
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="text-lg font-bold text-white md:text-xl">{passo.titulo}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">{passo.texto}</p>

                  {index < passosOperacao.length - 1 ? (
                    <ArrowRight className="absolute -right-4 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-zinc-700 md:block" />
                  ) : null}
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="border-y border-white/10 bg-zinc-950/70 px-4 py-12 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 text-xs uppercase tracking-[0.28em] text-emerald-300">Recursos</p>
              <h2 className="text-3xl font-black leading-tight text-white md:text-5xl">Recursos para operar melhor</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 md:gap-5">
            {recursosOperacao.map((recurso) => {
              const Icon = recurso.icone

              return (
                <article
                  key={recurso.titulo}
                  className={`group rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30 ${recurso.estilo}`}
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-current/20 bg-black/20 transition-transform duration-200 group-hover:scale-105">
                    <Icon className="h-5 w-5" />
                  </div>

                  <h3 className="text-base font-bold text-white">{recurso.titulo}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-300">{recurso.texto}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="px-4 py-12 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-8 max-w-3xl text-center md:mb-12">
            <p className="mb-3 text-xs uppercase tracking-[0.28em] text-emerald-300">Planos</p>
            <h2 className="text-3xl font-black leading-tight text-white md:text-5xl">Planos por tamanho de equipe</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-400 md:text-base">
              Todos os planos entregam os mesmos recursos premium. O que muda é a quantidade de profissionais na operação.
            </p>
            <p className="mt-3 text-xs leading-5 text-zinc-500 md:text-sm">
              Inclui 7 dias grátis. Em caso de falha no pagamento, há 7 dias de carência antes do bloqueio das funcionalidades premium.
            </p>
          </div>

          <div className="mb-8 flex flex-wrap justify-center gap-2 text-xs md:mb-12">
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-emerald-200">7 dias grátis</span>
            <span className="rounded-full border border-white/10 bg-zinc-900/80 px-3 py-2 text-zinc-300">Sem burocracia</span>
            <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sky-100">7 dias de carência</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-5">
            {planos.map((plano) => (
              <article
                key={plano.id}
                className={`group flex min-h-[390px] flex-col rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 active:scale-[0.99] md:p-6 ${
                  plano.principal
                    ? 'border-emerald-500/50 bg-emerald-500/10 shadow-2xl shadow-emerald-500/10'
                    : 'border-white/10 bg-zinc-950/80 hover:border-white/20'
                }`}
              >
                <div className="mb-4 min-h-[28px]">
                  {plano.destaque ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                      {plano.destaque}
                    </span>
                  ) : null}
                </div>

                <h3 className="text-xl font-bold text-white">{plano.nome}</h3>
                <p className="mt-2 text-2xl font-black text-white">{plano.mensal}</p>
                <p className="mt-2 text-sm font-medium text-emerald-300">{plano.aposTrial}</p>

                <ul className="mt-6 flex-1 space-y-3 text-sm text-zinc-300">
                  {plano.recursos.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/planos"
                  className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition-all duration-200 active:scale-[0.98] ${
                    plano.principal
                      ? 'bg-white text-black hover:bg-zinc-200'
                      : 'border border-white/15 text-white hover:border-white/30 hover:bg-white/10'
                  }`}
                >
                  Assinar agora
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 md:py-12 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 md:gap-3 mb-3 md:mb-4">
            <img src="/logo.png" alt="" className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border border-white/30" />
            <span className="font-bold text-sm md:text-base">O Corte Certo</span>
          </div>
          <p className="text-zinc-500 text-xs md:text-sm">
            © 2026 O Corte Certo. Uma nova experiência para uma tradição antiga.
          </p>
        </div>
      </footer>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-white/10 md:hidden z-50 safe-area-bottom">
        <div className="flex items-center justify-around py-2 px-4">
          <Link href="/" className="flex flex-col items-center gap-1 py-2 px-4 text-white">
            <HomeIcon className="w-5 h-5" />
            <span className="text-[10px] font-medium">Início</span>
          </Link>
          <Link href="/buscar" className="flex flex-col items-center gap-1 py-2 px-4 text-zinc-500">
            <Search className="w-5 h-5" />
            <span className="text-[10px] font-medium">Buscar</span>
          </Link>
          <Link href="/perfil" className="flex flex-col items-center gap-1 py-2 px-4 text-zinc-500">
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">Perfil</span>
          </Link>
        </div>
      </nav>
    </main>
  )
}
