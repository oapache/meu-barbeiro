import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const pagePath = resolve(process.cwd(), 'src/app/page.tsx')
const source = readFileSync(pagePath, 'utf8')
const searchPagePath = resolve(process.cwd(), 'src/app/buscar/page.tsx')
const searchSource = readFileSync(searchPagePath, 'utf8')

const requiredSnippets = [
  'A operação da sua barbearia em tempo real.',
  'Painel + WhatsApp',
  'Operação de hoje',
  'Fila operacional',
  'WhatsApp automatizado',
  'Configure sua operação em minutos',
  'Como funciona para a barbearia',
  'Recursos para operar melhor',
  'Planos por tamanho de equipe',
  'dashboard-preview',
  'assistant-preview',
  'header-primary-nav',
  'mobile-menu-panel',
  'Começar grátis',
  'group-hover',
]

const missing = requiredSnippets.filter((snippet) => !source.includes(snippet))
const forbiddenSnippets = [
  'Grátis para sempre',
  'Três passos simples para seu próximo corte',
  'Programa de Pontos',
  'Grátis para 1 Barbeiro',
  'getPublicStats',
  'totalBarbearias',
  'Nota média',
]
const forbidden = forbiddenSnippets.filter((snippet) => source.includes(snippet))
const requiredSearchHeaderSnippets = [
  'header-primary-nav',
  'mobile-menu-panel',
  'Começar grátis',
  'Agenda para barbearias',
  'search-header-toolbar',
]
const missingSearchHeader = requiredSearchHeaderSnippets.filter((snippet) => !searchSource.includes(snippet))
const forbiddenSearchSnippets = [
  'AccessibilityShortcuts',
  'Atalhos de acessibilidade',
]
const forbiddenSearch = forbiddenSearchSnippets.filter((snippet) => searchSource.includes(snippet))

if (missing.length > 0) {
  console.error('Home landing is missing approved design snippets:')
  for (const snippet of missing) {
    console.error(`- ${snippet}`)
  }
  process.exit(1)
}

if (forbidden.length > 0) {
  console.error('Home landing still contains legacy snippets:')
  for (const snippet of forbidden) {
    console.error(`- ${snippet}`)
  }
  process.exit(1)
}

if (missingSearchHeader.length > 0) {
  console.error('Search page header is missing approved design snippets:')
  for (const snippet of missingSearchHeader) {
    console.error(`- ${snippet}`)
  }
  process.exit(1)
}

if (forbiddenSearch.length > 0) {
  console.error('Search page still contains removed shortcut snippets:')
  for (const snippet of forbiddenSearch) {
    console.error(`- ${snippet}`)
  }
  process.exit(1)
}

console.log('Home landing contains the approved dashboard/WhatsApp concept.')
