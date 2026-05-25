import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Loader2 } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true)
    const success = await login(email, password, rememberMe)
    if (success) navigate('/')
    else setError(useAuthStore.getState().error || 'Invalid email or password. Please try again.')
    setLoading(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          min-height: 100vh;
          display: flex;
          font-family: 'Sora', sans-serif;
          background: #f8fafc;
          color: #0f172a;
        }

        /* ── LEFT PANEL ── */
        .brand-panel {
          display: none;
          width: 480px;
          flex-shrink: 0;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px 52px;
          position: relative;
          overflow: hidden;
          background: #ffffff;
          border-right: 1px solid #e2e8f0;
        }
        @media (min-width: 1024px) { .brand-panel { display: flex; } }

        .brand-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        .brand-glow-top {
          position: absolute; top: -60px; left: -60px;
          width: 320px; height: 320px; border-radius: 50%;
          background: radial-gradient(circle, rgba(99,102,241,0.10), transparent 70%);
          filter: blur(40px); pointer-events: none;
        }
        .brand-glow-bottom {
          position: absolute; bottom: -80px; right: -40px;
          width: 280px; height: 280px; border-radius: 50%;
          background: radial-gradient(circle, rgba(59,130,246,0.08), transparent 70%);
          filter: blur(50px); pointer-events: none;
        }

        .brand-logo {
          position: relative; z-index: 2;
          display: flex; align-items: center; gap: 12px;
        }
        .brand-icon {
          width: 42px; height: 42px; border-radius: 12px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 12px rgba(99,102,241,0.3);
        }
        .brand-name { font-weight: 800; font-size: 17px; color: #0f172a; letter-spacing: -0.3px; }
        .brand-sub  { font-size: 11px; font-weight: 500; color: #6366f1; letter-spacing: 0.5px; margin-top: 1px; }

        .brand-body { position: relative; z-index: 2; }
        .brand-heading {
          font-size: 36px; font-weight: 800; color: #0f172a;
          line-height: 1.2; letter-spacing: -1px; margin-bottom: 14px;
        }
        .brand-heading span {
          background: linear-gradient(135deg, #6366f1, #818cf8);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .brand-desc {
          font-size: 14px; color: #64748b; line-height: 1.7;
          max-width: 340px; margin-bottom: 40px;
        }

        .stats-row {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 12px; margin-bottom: 32px;
        }
        .stat-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px; padding: 16px 14px;
        }
        .stat-val { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 3px; }
        .stat-label { font-size: 11px; color: #64748b; }

        .pipeline-badges { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 100px;
          font-size: 11px; font-weight: 600;
        }
        .badge-dot { width: 6px; height: 6px; border-radius: 50%; }
        .arrow-icon { color: #cbd5e1; }

        .brand-footer { position: relative; z-index: 2; font-size: 11px; color: #94a3b8; }

        /* ── RIGHT PANEL ── */
        .form-panel {
          flex: 1;
          display: flex; align-items: center; justify-content: center;
          padding: 40px 24px;
          background: #f8fafc;
          position: relative;
        }
        .form-panel::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(ellipse 70% 50% at 50% 20%, rgba(99,102,241,0.04), transparent);
          pointer-events: none;
        }

        .form-box {
          width: 100%; max-width: 420px;
          position: relative; z-index: 1;
        }

        .form-header { margin-bottom: 36px; }
        .form-eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
          color: #6366f1; margin-bottom: 12px;
        }
        .form-eyebrow-dot { width: 5px; height: 5px; border-radius: 50%; background: #6366f1; }
        .form-title {
          font-size: 30px; font-weight: 800; color: #0f172a;
          letter-spacing: -0.8px; margin-bottom: 6px;
        }
        .form-subtitle { font-size: 14px; color: #64748b; }

        .form-body { display: flex; flex-direction: column; gap: 20px; }

        .field-group { display: flex; flex-direction: column; gap: 7px; }
        .field-label {
          font-size: 12px; font-weight: 600; color: #475569;
          letter-spacing: 0.3px; text-transform: uppercase;
        }
        .field-wrap { position: relative; }
        .field-icon {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          color: #94a3b8; pointer-events: none; display: flex;
        }
        .field-input {
          width: 100%; padding: 13px 14px 13px 42px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #0f172a; font-size: 14px; font-family: 'Sora', sans-serif;
          outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .field-input::placeholder { color: #94a3b8; }
        .field-input:hover { border-color: #a5b4fc; }
        .field-input:focus {
          border-color: #6366f1;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        .field-input.has-right { padding-right: 46px; }

        .toggle-btn {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: #94a3b8; display: flex; padding: 4px;
          transition: color 0.15s;
        }
        .toggle-btn:hover { color: #6366f1; }

        .form-row {
          display: flex; align-items: center; justify-content: space-between;
        }
        .remember-label {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; color: #475569; cursor: pointer; user-select: none;
        }
        .remember-check {
          width: 16px; height: 16px; cursor: pointer;
          accent-color: #6366f1;
        }
        .forgot-link {
          font-size: 13px; color: #6366f1; font-weight: 600;
          text-decoration: none; transition: color 0.15s;
        }
        .forgot-link:hover { color: #818cf8; }

        .error-box {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 14px; border-radius: 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626; font-size: 13px; line-height: 1.5;
        }
        .error-icon { flex-shrink: 0; margin-top: 1px; }

        .submit-btn {
          width: 100%; padding: 14px;
          border-radius: 12px; border: none;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: #fff; font-size: 14px; font-weight: 700;
          font-family: 'Sora', sans-serif;
          cursor: pointer; letter-spacing: 0.2px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
          box-shadow: 0 4px 20px rgba(99,102,241,0.35);
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(99,102,241,0.45);
        }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }

        .divider {
          display: flex; align-items: center; gap: 12px;
          font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .divider::before, .divider::after {
          content: ''; flex: 1; height: 1px; background: #e2e8f0;
        }

        .form-footer {
          text-align: center; font-size: 13px; color: #64748b; margin-top: 28px;
        }
        .form-footer a {
          color: #6366f1; font-weight: 700; text-decoration: none; transition: color 0.15s;
        }
        .form-footer a:hover { color: #818cf8; }

        .mobile-logo {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 36px;
        }
        @media (min-width: 1024px) { .mobile-logo { display: none; } }
      `}</style>

      <div className="login-root">

        {/* ── LEFT BRAND PANEL ── */}
        <div className="brand-panel">
          <div className="brand-grid" />
          <div className="brand-glow-top" />
          <div className="brand-glow-bottom" />

          {/* Logo */}
          <div className="brand-logo">
            <div className="brand-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <div>
              <div className="brand-name">RT International</div>
              <div className="brand-sub">Call Centre CRM</div>
            </div>
          </div>

          {/* Body */}
          <div className="brand-body">
            <h2 className="brand-heading">
              Manage your<br />
              <span>pipeline smarter</span>
            </h2>
            <p className="brand-desc">
              Track callbacks, transfers, and sales in one unified dashboard built for UK energy brokers.
            </p>

            <div className="stats-row">
              {[{ v: '3-Stage', l: 'Pipeline' }, { v: 'Real-time', l: 'Updates' }, { v: 'COT', l: 'Tracking' }].map(s => (
                <div key={s.l} className="stat-card">
                  <div className="stat-val">{s.v}</div>
                  <div className="stat-label">{s.l}</div>
                </div>
              ))}
            </div>

            <div className="pipeline-badges">
              {[{ label: 'Callback', color: '#2563eb' }, { label: 'Transfer', color: '#7c3aed' }, { label: 'Sale', color: '#16a34a' }].map((item, i) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge" style={{ background: `${item.color}0D`, color: item.color, border: `1px solid ${item.color}26` }}>
                    <span className="badge-dot" style={{ background: item.color }} />
                    {item.label}
                  </span>
                  {i < 2 && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>

          <p className="brand-footer">&copy; 2026 RT International. All rights reserved.</p>
          <p className="brand-footer">Credit: M Ahsan Shahid</p>
        </div>

        {/* ── RIGHT FORM PANEL ── */}
        <div className="form-panel">
          <div className="form-box">

            {/* Mobile logo */}
            <div className="mobile-logo">
              <div className="brand-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <div>
                <div className="brand-name" style={{ color: '#0f172a' }}>RT International</div>
                <div className="brand-sub">Call Centre CRM</div>
              </div>
            </div>

            {/* Header */}
            <div className="form-header">
              <div className="form-eyebrow">
                <span className="form-eyebrow-dot" />
                Secure Sign In
              </div>
              <h1 className="form-title">Welcome back</h1>
              <p className="form-subtitle">Enter your credentials to access your dashboard</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="form-body">

              {/* Email */}
              <div className="field-group">
                <label className="field-label">Email Address</label>
                <div className="field-wrap">
                  <span className="field-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@rtinternational.co.uk"
                    className="field-input"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="field-group">
                <label className="field-label">Password</label>
                <div className="field-wrap">
                  <span className="field-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="field-input has-right"
                    autoComplete="current-password"
                    required
                  />
                  <button type="button" className="toggle-btn" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {showPassword
                        ? <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></>
                        : <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>
                      }
                    </svg>
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className="form-row">
                <label className="remember-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="remember-check"
                  />
                  Keep me signed in
                </label>
                <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
              </div>

              {/* Error */}
              {error && (
                <div className="error-box">
                  <svg className="error-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading} className="submit-btn">
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Signing in...</>
                  : 'Sign In →'
                }
              </button>

            </form>

            {/* Footer */}
            <p className="form-footer">
              Don't have an account? <Link to="/register">Request access</Link>
            </p>

          </div>
        </div>
      </div>
    </>
  )
}
