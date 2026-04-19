import { useState, FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Shield } from 'lucide-react'

export default function LoginPage() {
  const { user, adminUser, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user && adminUser) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error: err } = await signIn(email, password)
    if (err) setError(err)
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-navy rounded-xl mb-4">
            <Shield size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">WorkTrace</h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest mt-1 font-medium">Admin Panel</p>
        </div>

        {/* Form */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-5">Log Masuk Admin</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Emel</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                placeholder="admin@worktrace.my"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kata Laluan</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-60"
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Memuatkan...</>
              ) : 'Log Masuk'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Hanya admin WorkTrace yang dibenarkan masuk.
        </p>
      </div>
    </div>
  )
}
