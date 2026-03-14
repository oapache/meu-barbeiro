import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-black border-b border-white/10 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Meu Barbeiro" className="w-10 h-10 rounded-full object-cover border-2 border-white" />
            <span className="text-lg font-bold text-white">Meu Barbeiro</span>
          </div>
          <nav className="flex gap-4">
            <Link href="/" className="text-sm font-medium text-white hover:text-gray-300">
              Início
            </Link>
            <Link href="/buscar" className="text-sm font-medium text-gray-400 hover:text-white">
              Buscar
            </Link>
            <Link href="/login" className="text-sm font-medium text-gray-400 hover:text-white">
              Entrar
            </Link>
          </nav>
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
          
          <div className="flex justify-center gap-4">
            <Link href="/cadastro" className="px-6 py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800">
              Cadastrar
            </Link>
            <Link href="/buscar" className="px-6 py-3 border-2 border-black rounded-full font-medium hover:bg-gray-100">
              Buscar Barbearias
            </Link>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-12 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Como funciona</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="font-semibold mb-2">1. Busque</h3>
              <p className="text-gray-600 text-sm">Encontre barbearias próximas de você</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📅</span>
              </div>
              <h3 className="font-semibold mb-2">2. Agende</h3>
              <p className="text-gray-600 text-sm">Escolha o serviço e horário</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✂️</span>
              </div>
              <h3 className="font-semibold mb-2">3. Corta</h3>
              <p className="text-gray-600 text-sm">Aproveite seu novo visual</p>
            </div>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Planos</h2>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Plano Grátis */}
            <div className="border-2 border-gray-200 rounded-2xl p-6">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Grátis</h3>
                <p className="text-4xl font-bold mb-1">R$ 0</p>
                <p className="text-gray-500 text-sm mb-6">para sempre</p>
              </div>
              <ul className="space-y-3 mb-6 text-sm">
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
              <Link href="/cadastro" className="block w-full py-3 border-2 border-black rounded-full font-medium text-center hover:bg-black hover:text-white transition-colors">
                Começar Grátis
              </Link>
            </div>

            {/* Plano Premium */}
            <div className="border-2 border-black rounded-2xl p-6 bg-black text-white">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Premium</h3>
                <p className="text-4xl font-bold mb-1">R$ 29</p>
                <p className="text-gray-400 text-sm mb-6">por mês</p>
              </div>
              <ul className="space-y-3 mb-6 text-sm">
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
              </ul>
              <Link href="/cadastro" className="block w-full py-3 bg-white text-black rounded-full font-medium text-center hover:bg-gray-200 transition-colors">
                Experimentar Grátis
              </Link>
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
