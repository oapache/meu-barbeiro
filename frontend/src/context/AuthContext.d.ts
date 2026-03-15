declare module '@/context/AuthContext' {
  export type AuthUser = {
    nome?: string
    email?: string
    telefone?: string
    tipo?: string
  }

  export type RegisterPayload = {
    nome: string
    email: string
    telefone: string
    senha: string
    tipo: string
  }

  export type AuthContextValue = {
    user: AuthUser | null
    loading: boolean
    isAuthenticated: boolean
    login: (email: string, senha: string, rememberSession?: boolean) => Promise<{ success: boolean; usuario: AuthUser }>
    register: (data: RegisterPayload) => Promise<{ success: boolean; usuario: AuthUser }>
    logout: () => void
  }

  export function AuthProvider(props: { children: React.ReactNode }): JSX.Element
  export function useAuth(): AuthContextValue
  export function getRedirectByUserType(user: AuthUser | null | undefined): '/barbearia' | '/perfil'
}