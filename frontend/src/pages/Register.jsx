import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Loader2, CheckCircle } from 'lucide-react'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)
  const { register } = useAuthStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!name || !email || !password || !confirmPassword) { setError('All fields are required.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    const success = await register(name, email, password)
    if (success) setRegistered(true)
    else setError(useAuthStore.getState().error || 'Registration failed.')
    setLoading(false)
  }

  const strength = password.length > 0
    ? password.length < 6 ? { level: 1, color: '#ef4444', text: 'Too short' }
      : password.length < 9 ? { level: 2, color: '#f97316', text: 'Could be stronger' }
      : { level: 4, color: '#22c55e', text: 'Strong password \u2713' }
    : null

  const fields = [
    { label: 'Full Name', value: name, setter: setName, type: 'text', placeholder: 'John Smith', icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></> },
    { label: 'Email address', value: email, setter: setEmail, type: 'email', placeholder: 'you@rtinternational.co.uk', icon: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></> },
    { label: 'Password', value: password, setter: setPassword, type: 'password', placeholder: 'At least 6 characters', icon: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>, showState: showPassword, toggle: () => setShowPassword(!showPassword) },
    { label: 'Confirm Password', value: confirmPassword, setter: setConfirmPassword, type: 'password', placeholder: 'Re-enter your password', icon: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>, showState: showConfirm, toggle: () => setShowConfirm(!showConfirm) },
  ]

  const btnGradient = 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, system-ui, sans-serif', background: '#f8fafc' }}>
      {/* ── LEFT BRAND PANEL ── */}
      <div style={{
        display: 'none', width: '440px', flexShrink: 0,
        flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px 44px', position: 'relative', overflow: 'hidden',
        background: '#fff', borderRight: '1px solid #e2e8f0',
      }} className="lg-flex">
        <style>{`@media (min-width: 1024px){.lg-flex{display:flex}}`}</style>

        {/* Subtle grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }} />

        {/* Glow accents */}
        <div style={{
          position: 'absolute', top: '-40px', left: '-40px',
          width: '280px', height: '280px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)',
          filter: 'blur(50px)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', right: '-30px',
          width: '240px', height: '240px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08), transparent 70%)',
          filter: 'blur(40px)', pointerEvents: 'none',
        }} />

        {/* Logo row */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99,102,241,0.35)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '17px', color: '#0f172a', letterSpacing: '-0.3px' }}>RT International</div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px', marginTop: '1px' }}>Call Centre CRM</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h2 style={{
            fontSize: '34px', fontWeight: 800, color: '#0f172a',
            lineHeight: 1.15, letterSpacing: '-1px', marginBottom: '14px',
          }}>
            Join the team<br />
            <span style={{
              background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>start closing deals</span>
          </h2>
          <p style={{
            fontSize: '14px', color: '#64748b', lineHeight: 1.7,
            maxWidth: '340px', marginBottom: '36px',
          }}>
            Create your agent account and get instant access to the RT International call centre dashboard.
          </p>

          {/* Feature list */}
          {[
            { icon: '\uD83D\uDCDE', text: 'Manage callbacks with smart scheduling' },
            { icon: '\u26A1', text: 'Track transfers through the full pipeline' },
            { icon: '\uD83D\uDCB7', text: 'Close sales and monitor COT status' },
          ].map((f) => (
            <div key={f.text} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '15px', flexShrink: 0,
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.15)',
              }}>
                {f.icon}
              </div>
              <p style={{ color: '#475569', fontSize: '13px', lineHeight: 1.6, paddingTop: '5px' }}>{f.text}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p style={{ position: 'relative', zIndex: 2, fontSize: '11px', color: '#cbd5e1' }}>&copy; 2026 RT International. All rights reserved.</p>
        <p style={{ position: 'relative', zIndex: 2, fontSize: '11px', color: '#cbd5e1' }}>Credit: M Ahsan Shahid</p>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', background: '#f8fafc', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(ellipse 70% 50% at 50% 20%, rgba(99,102,241,0.04), transparent)',
          pointerEvents: 'none',
        }} />

        <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>

          {/* Mobile logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '36px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', letterSpacing: '-0.2px' }}>RT International</div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#6366f1', letterSpacing: '0.5px' }}>Call Centre CRM</div>
            </div>
          </div>
          <style>{`@media (min-width:1024px){.mobile-logo{display:none}}`}</style>

          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
              color: '#6366f1', marginBottom: '10px',
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#6366f1' }} />
              Get Started
            </div>
            <h1 style={{
              fontSize: '28px', fontWeight: 800, color: '#0f172a',
              letterSpacing: '-0.8px', marginBottom: '6px',
            }}>
              Create your account
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>Fill in your details to get started</p>
          </div>

          {registered ? (
            <>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
                padding: '32px 24px', borderRadius: '16px',
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                textAlign: 'center',
              }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CheckCircle size={28} color="#16a34a" />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>
                    Account created!
                  </h2>
                  <p style={{ fontSize: '14px', color: '#15803d', lineHeight: 1.6 }}>
                    Your account is pending admin approval. You will receive access once an admin reviews and approves your account.
                  </p>
                </div>
              </div>
              <Link to="/login"
                style={{
                  display: 'block', textAlign: 'center', width: '100%', padding: '13px',
                  borderRadius: '12px', textDecoration: 'none',
                  background: btnGradient, color: '#fff', fontSize: '14px', fontWeight: 700,
                  boxShadow: '0 4px 18px rgba(99,102,241,0.35)',
                }}
              >Sign In</Link>
            </>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {fields.map((field, idx) => (
                <div key={field.label} style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label style={{
                    fontSize: '12px', fontWeight: 700, color: '#475569',
                    letterSpacing: '0.3px', textTransform: 'uppercase',
                  }}>{field.label}</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
                      color: '#94a3b8', pointerEvents: 'none', display: 'flex',
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{field.icon}</svg>
                    </span>
                    <input
                      type={field.showState ? 'text' : field.type}
                      value={field.value}
                      onChange={(e) => field.setter(e.target.value)}
                      required
                      placeholder={field.placeholder}
                      style={{
                        width: '100%', padding: '12px 14px 12px 42px',
                        borderRadius: '12px', border: '1px solid #e2e8f0',
                        background: '#fff', color: '#0f172a',
                        fontSize: '14px', fontFamily: 'inherit', outline: 'none',
                        transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#6366f1'
                        e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'
                        e.target.style.background = '#fff'
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0'
                        e.target.style.boxShadow = 'none'
                        e.target.style.background = '#fff'
                      }}
                      onMouseEnter={(e) => { if (e.target !== document.activeElement) e.target.style.borderColor = '#cbd5e1' }}
                      onMouseLeave={(e) => { if (e.target !== document.activeElement) e.target.style.borderColor = '#e2e8f0' }}
                    />
                    {field.toggle && (
                      <button type="button" onClick={field.toggle}
                        style={{
                          position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#94a3b8', display: 'flex', padding: '4px',
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#6366f1'}
                        onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          {field.showState
                            ? <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></>
                            : <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>
                          }
                        </svg>
                      </button>
                    )}
                  </div>
                  {idx === 2 && strength && (
                    <div style={{ marginTop: '4px' }}>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} style={{
                            flex: 1, height: '4px', borderRadius: '4px',
                            background: i <= strength.level ? strength.color : '#e2e8f0',
                            transition: 'background 0.2s',
                          }} />
                        ))}
                      </div>
                      <p style={{ fontSize: '12px', fontWeight: 500, color: strength.color, margin: 0 }}>{strength.text}</p>
                    </div>
                  )}
                </div>
              ))}

              {error && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  padding: '12px 14px', borderRadius: '12px',
                  background: '#fef2f2', border: '1px solid #fecaca',
                  color: '#dc2626', fontSize: '13px', lineHeight: 1.5,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}>
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '13px', borderRadius: '12px', border: 'none',
                  background: loading ? '#a5b4fc' : btnGradient,
                  color: '#fff', fontSize: '14px', fontWeight: 700,
                  fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.2px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '8px',
                  transition: 'transform 0.2s, box-shadow 0.2s, opacity 0.2s',
                  opacity: loading ? 0.6 : 1,
                  boxShadow: loading ? 'none' : '0 4px 18px rgba(99,102,241,0.35)',
                }}
                onMouseEnter={(e) => { if (!loading) { e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = '0 8px 24px rgba(99,102,241,0.45)' } }}
                onMouseLeave={(e) => { if (!loading) { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 18px rgba(99,102,241,0.35)' } }}
                onMouseDown={(e) => { if (!loading) e.target.style.transform = 'translateY(0)' }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Create Account \u2192'}
              </button>
            </form>
          )}

          {/* Footer link */}
          {!registered && (
            <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', marginTop: '28px' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#6366f1', fontWeight: 700, textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={(e) => e.target.style.color = '#4f46e5'}
                onMouseLeave={(e) => e.target.style.color = '#6366f1'}
              >Sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
