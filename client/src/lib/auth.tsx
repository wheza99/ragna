import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { pb } from '@/lib/pocketbase'

interface User {
  id: string
  email: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if already authenticated
    if (pb.authStore.isValid) {
      setUser({
        id: pb.authStore.record!.id,
        email: pb.authStore.record!.email,
      })
    }
    setLoading(false)

    // Listen for auth changes (login, logout, token refresh)
    const unsubscribe = pb.authStore.onChange((_token: string, record: any) => {
      if (record) {
        setUser({ id: record.id, email: record.email })
      } else {
        setUser(null)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
      })
      // Auto-login after registration
      await pb.collection('users').authWithPassword(email, password)
      return { error: null }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Registration failed'
      return { error: message }
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      await pb.collection('users').authWithPassword(email, password)
      return { error: null }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Login failed'
      return { error: message }
    }
  }, [])

  const signOut = useCallback(async () => {
    pb.authStore.clear()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
