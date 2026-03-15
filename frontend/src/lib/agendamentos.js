const STORAGE_KEY = 'meuBarbeiro_agendamentos'

function readStorage() {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStorage(agendamentos) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(agendamentos))
}

export function createLocalAgendamento(payload) {
  const now = new Date().toISOString()
  const agendamento = {
    id: `ag-${Date.now()}`,
    status: 'agendado',
    created_at: now,
    updated_at: now,
    ...payload,
  }

  const current = readStorage()
  current.push(agendamento)
  writeStorage(current)
  return agendamento
}

export function listLocalAgendamentos() {
  return readStorage().sort((a, b) => {
    const aDate = `${a?.data || ''}T${a?.hora || '00:00'}`
    const bDate = `${b?.data || ''}T${b?.hora || '00:00'}`
    return aDate.localeCompare(bDate)
  })
}

export function listLocalAgendamentosByCliente(clienteId) {
  return listLocalAgendamentos().filter((item) => item?.cliente_id === clienteId)
}

export function listLocalAgendamentosByBarbearia(barbeariaId) {
  return listLocalAgendamentos().filter((item) => item?.barbearia_id === barbeariaId)
}
