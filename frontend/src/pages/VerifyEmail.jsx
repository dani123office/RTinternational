import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Loader2, Mail, CheckCircle, AlertCircle } from 'lucide-react'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { emailForVerification, setEmailForVerification, sendOtp, verifyOtp } = useAuthStore()

  const email = emailForVerification || searchParams.get('email') || ''
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [emailSent, setEmailSent] = useState(true)
  const [error, setError] = useState('')
  const [verified, setVerified] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const inputsRef = useRef([])

  useEffect(() => {
    if (!email) navigate('/register')
  }, [email, navigate])

  useEffect(() => {
    if (cooldown > 0) {
      const t = setInterval(() => setCooldown((c) => c - 1), 1000)
      return () => clearInterval(t)
    }
  }, [cooldown])

  const handleSendOtp = async () => {
    setSending(true)
    setError('')
    const res = await sendOtp(email)
    if (!res.ok) {
      setError('Failed to request OTP. Please try again.')
      setSending(false)
      return
    }
    setSent(true)
    setEmailSent(res.sent)
    setCooldown(60)
    inputsRef.current[0]?.focus()
    setSending(false)
  }

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    if (value && index < 5) inputsRef.current[index + 1]?.focus()
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handleVerify = async () => {
    const code = otp.join('')
    if (code.length !== 6) { setError('Please enter the complete 6-digit OTP.'); return }
    setLoading(true)
    setError('')
    const ok = await verifyOtp(email, code)
    if (ok) {
      setVerified(true)
      setTimeout(() => navigate('/login'), 2000)
    } else {
      setError('Invalid or expired OTP. Please try again.')
    }
    setLoading(false)
  }

  if (verified) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <CheckCircle size={64} color="#22c55e" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Email Verified!</h2>
          <p style={{ color: '#64748b' }}>Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 440, padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Mail size={28} color="#6366f1" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Verify Your Email</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>
            We sent a 6-digit code to<br /><strong style={{ color: '#0f172a' }}>{email}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {sent && !emailSent && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px', borderRadius: 12, background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                <AlertCircle size={16} color="#d97706" />
                Email delivery issue
              </div>
              <p style={{ margin: 0, lineHeight: 1.4 }}>
                The OTP email could not be sent. The SMTP credentials may need to be updated.{' '}
                <strong>Check spam folder</strong> or ask the admin to verify the email configuration.
              </p>
            </div>
          )}

          {!sent ? (
            <button
              onClick={handleSendOtp}
              disabled={sending}
              style={{
                width: '100%', padding: 14, borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 20px rgba(99,102,241,0.35)', opacity: sending ? 0.6 : 1,
              }}
            >
              {sending ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : 'Send OTP →'}
            </button>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputsRef.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    style={{
                      width: 48, height: 56, textAlign: 'center', fontSize: 22, fontWeight: 700,
                      borderRadius: 12, border: `2px solid ${digit ? '#6366f1' : '#e2e8f0'}`,
                      outline: 'none', background: '#fff', color: '#0f172a',
                      transition: 'border-color 0.2s',
                    }}
                  />
                ))}
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13 }}>
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <button
                onClick={handleVerify}
                disabled={loading || otp.join('').length !== 6}
                style={{
                  width: '100%', padding: 14, borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
                  opacity: loading || otp.join('').length !== 6 ? 0.6 : 1,
                }}
              >
                {loading ? <><Loader2 size={16} className="animate-spin" /> Verifying...</> : 'Verify →'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={handleSendOtp}
                  disabled={sending || cooldown > 0}
                  style={{
                    background: 'none', border: 'none', color: cooldown > 0 ? '#94a3b8' : '#6366f1',
                    fontSize: 13, fontWeight: 600, cursor: cooldown > 0 ? 'default' : 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </>
          )}

          <p style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 8 }}>
            <Link to="/login" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
