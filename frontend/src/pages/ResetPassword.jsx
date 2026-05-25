import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import api from '@/lib/api'
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!token) { setError('Invalid reset link. No token provided.'); return }
    if (!password) { setError('Please enter a new password.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      await api.post('/api/auth/reset-password', { token, password })
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="reset-root" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Sora', sans-serif", background: '#f8fafc', padding: 24 }}>
        <div className="reset-card" style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: '40px 36px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Invalid link</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>This reset link is invalid or missing a token.</p>
          <Link to="/forgot-password" className="back-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#6366f1', textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Request a new link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .reset-root {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          font-family: 'Sora', sans-serif; background: #f8fafc; color: #0f172a; padding: 24px;
        }
        .reset-card {
          width: 100%; max-width: 440px; background: #fff; border-radius: 20px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06); padding: 40px 36px;
        }
        .reset-card h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
        .reset-card p.sub { font-size: 14px; color: #64748b; margin-bottom: 28px; line-height: 1.5; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
        .field-input {
          width: 100%; padding: 12px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px;
          font-size: 14px; font-family: inherit; transition: border-color 0.15s; outline: none;
        }
        .field-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .password-wrap { position: relative; }
        .password-wrap .field-input { padding-right: 44px; }
        .toggle-btn {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: #94a3b8; padding: 6px;
          display: flex; align-items: center;
        }
        .submit-btn {
          width: 100%; padding: 12px; border: none; border-radius: 10px; font-size: 14px; font-weight: 600;
          font-family: inherit; cursor: pointer; background: #6366f1; color: #fff;
          display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.15s;
        }
        .submit-btn:hover { background: #4f46e5; }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .error-box {
          display: flex; align-items: center; gap: 8px; padding: 12px 14px; background: #fef2f2;
          border: 1px solid #fecaca; border-radius: 10px; font-size: 13px; color: #dc2626; margin-bottom: 20px;
        }
        .success-box {
          display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 24px 14px;
          background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; font-size: 14px; color: #16a34a;
          margin-bottom: 20px; text-align: center;
        }
        .back-link {
          display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600;
          color: #6366f1; text-decoration: none; transition: color 0.15s;
        }
        .back-link:hover { color: #4f46e5; }
      `}</style>
      <div className="reset-root">
        <div className="reset-card">
          {done ? (
            <>
              <div className="success-box">
                <CheckCircle size={28} />
                <div><strong>Password reset successful!</strong><br />You can now sign in with your new password.</div>
              </div>
              <Link to="/login" className="submit-btn" style={{ textDecoration: 'none' }}>
                Sign in
              </Link>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <h1>Set new password</h1>
              <p className="sub">Enter your new password below.</p>

              {error && (
                <div className="error-box">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              <div className="form-group">
                <label>New password</label>
                <div className="password-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="field-input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" className="toggle-btn" onClick={() => setShowPassword(v => !v)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      {showPassword
                        ? <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></>
                        : <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>
                      }
                    </svg>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Confirm new password</label>
                <input
                  type="password"
                  className="field-input"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Resetting...</> : 'Reset password'}
              </button>

              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Link to="/login" className="back-link">
                  <ArrowLeft size={16} /> Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
