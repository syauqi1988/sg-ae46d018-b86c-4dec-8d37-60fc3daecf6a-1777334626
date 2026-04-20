import { useState, useEffect, useRef, FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Shield, Mail, KeyRound, ArrowLeft } from 'lucide-react'

declare global {
  interface Window {
    hcaptcha: {
      render: (el: HTMLElement, opts: {
        sitekey: string
        callback: (token: string) => void
        'expired-callback': () => void
        'error-callback': () => void
        theme: string
      }) => string
      reset: (id: string) => void
      execute: (id: string) => void
    }
  }
}

type Step = 'email' | 'otp'

export default function LoginPage() {
  const { user, adminUser, loading, sendOtp, verifyOtp } = useAuth()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [captchaToken, setCaptchaToken] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const [captchaReady, setCaptchaReady] = useState(false)
  const [captchaId, setCaptchaId] = useState<string | null>(null)

  const captchaRef = useRef<HTMLDivElement>(null)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY

  // Load hCaptcha script
  useEffect(() => {
    if (document.getElementById('hcaptcha-script')) {
      setCaptchaReady(true)
      return
    }
    const script = document.createElement('script')
    script.id = 'hcaptcha-script'
    script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => setCaptchaReady(true)
    document.head.appendChild(script)
  }, [])

  // Render hCaptcha widget when ready
  useEffect(() => {
    if (!captchaReady || !captchaRef.current || captchaId) return
    if (!window.hcaptcha) return

    const id = window.hcaptcha.render(captchaRef.current, {
      sitekey: SITE_KEY,
      callback: (token: string) => setCaptchaToken(token),
      'expired-callback': () => setCaptchaToken(''),
      'error-callback': () => { setCaptchaToken(''); setError('hCaptcha gagal. Cuba semula.') },
      theme: 'light',
    })
    setCaptchaId(id)
  }, [captchaReady, SITE_KEY])

  // Resend countdown
  useEffect(() => {
    if (resendCountdown <= 0) return
    timerRef.current = setInterval(() => {
      setResendCountdown(c => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [resendCountdown])

  if (!loading && user && adminUser) return <Navigate to="/dashboard" replace />

  // ─── Step 1: Send OTP ───────────────────────
  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!captchaToken) {
      setError('Sila selesaikan hCaptcha terlebih dahulu.')
      return
    }

    setSubmitting(true)
    const { error: err } = await sendOtp(email, captchaToken)
    setSubmitting(false)

    if (err) {
      setError(err.includes('not found') || err.includes('Invalid')
        ? 'Emel ini tidak berdaftar sebagai admin.'
        : err
      )
      // Reset captcha on error
      if (captchaId && window.hcaptcha) {
        window.hcaptcha.reset(captchaId)
        setCaptchaToken('')
      }
      return
    }

    setStep('otp')
    setResendCountdown(60)
    setTimeout(() => otpRefs.current[0]?.focus(), 100)
  }

  // ─── Step 2: Verify OTP ─────────────────────
  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const token = otp.join('')
    if (token.length !== 6) { setError('Sila masukkan 6 digit kod OTP.'); return }

    setSubmitting(true)
    const { error: err } = await verifyOtp(email, token)
    setSubmitting(false)

    if (err) {
      setError(err.includes('expired') || err.includes('invalid')
        ? 'Kod OTP tidak sah atau telah tamat tempoh. Sila minta kod baru.'
        : err
      )
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    }
    // On success, useAuth listener auto-updates
  }

  // ─── Resend OTP ─────────────────────────────
  const handleResend = async () => {
    if (resendCountdown > 0 || !captchaToken) return
    setError('')
    setSubmitting(true)
    const { error: err } = await sendOtp(email, captchaToken)
    setSubmitting(false)
    if (err) { setError(err); return }
    setResendCountdown(60)
    setOtp(['', '', '', '', '', ''])
    setTimeout(() => otpRefs.current[0]?.focus(), 100)
  }

  // ─── OTP Input Handlers ──────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
    // Auto-submit when all 6 filled
    if (value && index === 5 && newOtp.every(d => d)) {
      setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} } as FormEvent
        handleVerifyOtp(fakeEvent)
      }, 100)
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const newOtp = [...otp]
    pasted.split('').forEach((d, i) => { if (i < 6) newOtp[i] = d })
    setOtp(newOtp)
    const nextEmpty = newOtp.findIndex(d => !d)
    otpRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus()
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

        {/* Card */}
        <div className="card p-6">

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-5">
            {step === 'otp' && (
              <button onClick={() => { setStep('email'); setError(''); setOtp(['', '', '', '', '', '']) }}
                className="text-slate-400 hover:text-slate-600 -ml-1">
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="flex-1">
              <h2 className="text-base font-semibold text-slate-900">
                {step === 'email' ? 'Log Masuk Admin' : 'Masukkan Kod OTP'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {step === 'email'
                  ? 'Masukkan emel admin anda untuk menerima kod OTP'
                  : `Kod 6-digit telah dihantar ke ${email}`
                }
              </p>
            </div>
            {/* Step dots */}
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-600" />
              <div className={`w-2 h-2 rounded-full ${step === 'otp' ? 'bg-blue-600' : 'bg-slate-200'}`} />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2.5 mb-4">
              {error}
            </div>
          )}

          {/* ── STEP 1: Email + hCaptcha ── */}
          {step === 'email' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Emel Admin
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input pl-9"
                    placeholder="admin@worktrace.my"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* hCaptcha widget */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Pengesahan Keselamatan
                </label>
                <div ref={captchaRef} className="flex justify-center" />
                {!captchaReady && (
                  <div className="flex items-center justify-center h-16 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                      Memuatkan hCaptcha...
                    </div>
                  </div>
                )}
                {captchaToken && (
                  <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                    ✓ Pengesahan berjaya
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || !captchaToken}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-50"
              >
                {submitting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menghantar...</>
                ) : (
                  <><Mail size={15} /> Hantar Kod OTP</>
                )}
              </button>
            </form>
          )}

          {/* ── STEP 2: OTP Input ── */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3 text-center">
                  Semak emel anda dan masukkan kod 6-digit
                </label>
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className={`
                        w-11 h-12 text-center text-lg font-semibold rounded-xl border-2 
                        focus:outline-none focus:border-blue-500 transition-colors
                        ${digit ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-900'}
                      `}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || otp.some(d => !d)}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-50"
              >
                {submitting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Mengesahkan...</>
                ) : (
                  <><KeyRound size={15} /> Sahkan Kod</>
                )}
              </button>

              {/* Resend */}
              <div className="text-center">
                {resendCountdown > 0 ? (
                  <p className="text-sm text-slate-400">
                    Hantar semula dalam{' '}
                    <span className="font-semibold text-slate-600">{resendCountdown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={submitting}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    Hantar semula kod OTP
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Hanya admin WorkTrace yang dibenarkan masuk.
        </p>
      </div>
    </div>
  )
}