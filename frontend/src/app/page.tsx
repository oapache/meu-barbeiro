import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Meu Barbeiro" className="w-12 h-12 rounded-full object-cover" />
            <span className="text-xl font-bold text-black">Meu Barbeiro</span>
          </div>
          <div className="flex gap-3">
            <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-black">
              Entrar
            </Link>
            <Link href="/cadastro" className="px-4 py-2 text-sm font-medium bg-black text-white rounded-full hover:bg-gray-800">
              Cadastrar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
            Sua barbearia no seu bolso
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Agende seu corte de cabelo ou barba sem precisar ligar. 
            Encontre as melhores barbearias perto de você.
          </p>
          
          {/* Busca */}
          <div className="max-w-md mx-auto">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Buscar barbearia próxima..." 
                className="w-full px-5 py-4 pr-12 rounded-full border-2 border-gray-200 focus:border-black focus:outline-none text-lg"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-black text-white p-3 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Próximos */}
      <section className="py-8 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold mb-4">Próximos de você</h2>
          <div className="grid gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <h3 className="font-semibold">Barbearia do João</h3>
                  <p className="text-sm text-gray-500">São Paulo, SP • 2km</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-yellow-500">★</span>
                    <span className="text-sm">4.8</span>
                  </div>
                </div>
                <Link href="/barbearia" className="px-4 py-2 bg-black text-white rounded-full text-sm">
                  Agendar
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Planos</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Plano Grátis */}
            <div className="border-2 border-gray-200 rounded-2xl p-6">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Grátis</h3>
                <p className="text-4xl font-bold mb-1">R$ 0</p>
                <p className="text-gray-500 text-sm mb-6">para sempre</p>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> 1 barbeiro
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Agendamentos online
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Lista de espera
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Link WhatsApp
                </li>
              </ul>
              <button className="w-full py-3 border-2 border-black rounded-full font-medium hover:bg-black hover:text-white transition-colors">
                Começar Grátis
              </button>
            </div>

            {/* Plano Premium */}
            <div className="border-2 border-black rounded-2xl p-6 bg-black text-white">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Premium</h3>
                <p className="text-4xl font-bold mb-1">R$ 29</p>
                <p className="text-gray-400 text-sm mb-6">por mês</p>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Até 3 barbeiros
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Tudo do Grátis
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Programa de fidelidade
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Relatórios básicos
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Sem anúncios
                </li>
              </ul>
              <button className="w-full py-3 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-colors">
                Experimentar Grátis
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Por que escolher o Meu Barbeiro?</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="font-semibold mb-2">100% Online</h3>
              <p className="text-gray-600 text-sm">Não precisa baixar nada. Acesse pelo navegador.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="font-semibold mb-2">WhatsApp</h3>
              <p className="text-gray-600 text-sm">Tudo pelo WhatsApp, sem complicação.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="font-semibold mb-2">Grátis</h3>
              <p className="text-gray-600 text-sm">Plano gratuito para 1 barbeiro.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="max-w-4xl mx-auto text-center text-gray-500 text-sm">
          <p>© 2026 Meu Barbeiro</p>
          <p className="mt-2">Uma nova experiência para uma tradição antiga.</p>
        </div>
      </footer>
    </main>
  )
}
