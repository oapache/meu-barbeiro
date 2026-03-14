'use client'

import { AuthProvider } from '@/context/AuthContext'
import './globals.css'

export default function RootLayout({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}
