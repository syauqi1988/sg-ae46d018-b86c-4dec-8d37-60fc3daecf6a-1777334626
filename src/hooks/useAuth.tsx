import { useState, useEffect, createContext, useContext } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { AdminUser } from '@/types'

interface AuthContextType {
  user: User | null
  adminUser: AdminUser | null
  loading: boolean
  sendOtp: (email: string, captchaToken: string) => Promise<{ error: string | null }>
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) checkAdmin(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) checkAdmin(session.user.id)
      else { setAdminUser(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()
    setAdminUser(data)
    if (data) {
      await supabase.from('admin_users')
        .update({ last_login: new Date().toISOString() })
        .eq('user_id', userId)
    }
    setLoading(false)
  }

  const sendOtp = async (email: string, captchaToken: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        captchaToken,
        shouldCreateUser: false, // only existing users can log in as admin
      }
    })
    if (error) return { error: error.message }
    return { error: null }
  }

  const verifyOtp = async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    })
    if (error) return { error: error.message }
    if (!data.user) return { error: 'Pengesahan gagal' }

    // Check admin access
    const { data: admin } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', data.user.id)
      .eq('is_active', true)
      .single()

    if (!admin) {
      await supabase.auth.signOut()
      return { error: 'Akses ditolak. Anda bukan admin WorkTrace.' }
    }
    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setAdminUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, adminUser, loading, sendOtp, verifyOtp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}