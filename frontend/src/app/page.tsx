import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header / Logo Area */}
      <header className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-8">
          {/* Logo Placeholder - will be replaced with actual logo */}
          <div className="w-24 h-24 mx-auto mb-6 bg-black rounded-full flex items-center justify-center">
            <span className="text-white text-4xl">✂️</span>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Meu Barbeiro
          </h1>
          <p className="text-gray-600">
            Agende seu corte online
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full max-w-sm space-y-4">
          <Link href="/login" className="btn-primary block text-center">
            Entrar
          </Link>
          
          <Link href="/cadastro" className="btn-secondary block text-center">
            Criar conta
          </Link>
        </div>
      </header>

      {/* Footer */}
      <footer className="px-4 py-6 text-center text-sm text-gray-500">
        <p>© 2026 Meu Barbeiro</p>
      </footer>
    </main>
  )
}
