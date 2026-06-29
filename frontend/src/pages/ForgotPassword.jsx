import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { endpoints } from '@/lib/api'
import { ArrowLeft, ShieldAlert, Mail, KeyRound, Loader2, CheckCircle, ArrowRight } from 'lucide-react'

export default function ForgotPassword() {
  // Steps: 'choose' | 'admin' | 'email' | 'otp' | 'newpass' | 'done'
  const [step, setStep] = useState('choose')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetToken, setResetToken] = useState('')
  const navigate = useNavigate()

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Please enter your email address.'); return }
    setLoading(true)
    try {
      // First call forgot-password to generate a reset token
      const fpRes = await api.post(endpoints.auth.forgotPassword, { email: email.trim() })
      if (fpRes.data?.token) {
        setResetToken(fpRes.data.token)
      }
      // Then send OTP to email
      const res = await api.post(endpoints.auth.sendOtp, { email: email.trim() })
      if (res.data?.sent === false) {
        setError('Could not send code to this email. Please check the email address.')
      } else {
        setStep('otp')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError('')
    if (!otp.trim()) { setError('Please enter the verification code.'); return }
    setLoading(true)
    try {
      await api.post(endpoints.auth.verifyOtp, { email: email.trim(), otp: otp.trim() })
      setStep('newpass')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    if (!password) { setError('Please enter a new password.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      await api.post(endpoints.auth.resetPassword, { token: resetToken, password })
      setStep('done')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await api.post(endpoints.auth.sendOtp, { email: email.trim() })
      if (res.data?.sent === false) {
        setError('Could not resend code. Please try again.')
      } else {
        setError('')
        setOtp('')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .fp-root {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          font-family: 'Sora', sans-serif; background: #f8fafc; color: #0f172a; padding: 24px;
        }
        .fp-card {
          width: 100%; max-width: 480px; background: #fff; border-radius: 20px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06); padding: 40px 36px;
          animation: fpSlideUp 0.4s ease-out;
        }
        @keyframes fpSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fp-card h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; text-align: center; }
        .fp-card p.sub { font-size: 14px; color: #64748b; margin-bottom: 28px; line-height: 1.5; text-align: center; }

        /* Step indicators */
        .fp-steps { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 28px; }
        .fp-step-dot {
          width: 10px; height: 10px; border-radius: 50%; background: #e2e8f0; transition: all 0.3s;
        }
        .fp-step-dot.active { background: #6366f1; transform: scale(1.2); }
        .fp-step-dot.done { background: #22c55e; }
        .fp-step-line { width: 24px; height: 2px; background: #e2e8f0; border-radius: 1px; }
        .fp-step-line.done { background: #22c55e; }

        /* Option cards */
        .fp-options { display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px; }
        .fp-option {
          display: flex; align-items: center; gap: 16px; padding: 20px;
          border: 2px solid #e2e8f0; border-radius: 14px; cursor: pointer;
          transition: all 0.2s ease; background: #fff; text-align: left;
        }
        .fp-option:hover { border-color: #6366f1; background: #f8f7ff; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.1); }
        .fp-option-icon {
          width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .fp-option-icon.admin-icon { background: linear-gradient(135deg, #fef3c7, #fde68a); }
        .fp-option-icon.email-icon { background: linear-gradient(135deg, #dbeafe, #93c5fd); }
        .fp-option-title { font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 4px; }
        .fp-option-desc { font-size: 12px; color: #64748b; line-height: 1.4; }
        .fp-option-arrow { margin-left: auto; color: #94a3b8; transition: all 0.2s; flex-shrink: 0; }
        .fp-option:hover .fp-option-arrow { color: #6366f1; transform: translateX(2px); }

        /* Admin info */
        .fp-admin-info {
          padding: 20px; background: #fffbeb; border: 1px solid #fde68a;
          border-radius: 14px; margin-bottom: 24px; line-height: 1.6;
        }
        .fp-admin-info strong { color: #78350f; font-size: 14px; }
        .fp-admin-info p { font-size: 13px; color: #92400e; margin-top: 8px; }
        .fp-admin-info ul { list-style: none; margin-top: 12px; padding: 0; }
        .fp-admin-info ul li {
          font-size: 13px; color: #92400e; padding: 6px 0; padding-left: 20px; position: relative;
        }
        .fp-admin-info ul li::before {
          content: ''; position: absolute; left: 0; top: 13px; width: 8px; height: 8px;
          border-radius: 50%; background: #f59e0b;
        }

        /* Form inputs */
        .fp-form-group { margin-bottom: 20px; }
        .fp-form-group label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }
        .fp-input {
          width: 100%; padding: 12px 14px; border: 1.5px solid #e2e8f0; border-radius: 10px;
          font-size: 14px; font-family: inherit; transition: all 0.15s; outline: none; background: #fff;
        }
        .fp-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .fp-input::placeholder { color: #94a3b8; }

        .fp-otp-input {
          width: 100%; padding: 14px; border: 1.5px solid #e2e8f0; border-radius: 10px;
          font-size: 24px; font-family: 'Sora', monospace; letter-spacing: 8px; text-align: center;
          transition: all 0.15s; outline: none; background: #fff;
        }
        .fp-otp-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }

        .fp-password-wrap { position: relative; }
        .fp-password-wrap .fp-input { padding-right: 44px; }
        .fp-toggle-btn {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: #94a3b8; padding: 6px;
          display: flex; align-items: center;
        }

        /* Buttons */
        .fp-btn {
          width: 100%; padding: 13px; border: none; border-radius: 10px; font-size: 14px; font-weight: 600;
          font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.2s;
        }
        .fp-btn-primary { background: #6366f1; color: #fff; }
        .fp-btn-primary:hover { background: #4f46e5; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.25); }
        .fp-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
        .fp-btn-ghost {
          background: transparent; color: #6366f1; border: 1.5px solid #e2e8f0; margin-top: 10px;
        }
        .fp-btn-ghost:hover { background: #f8f7ff; border-color: #c7d2fe; }

        .fp-resend {
          display: inline-block; font-size: 13px; color: #6366f1; font-weight: 600;
          background: none; border: none; cursor: pointer; padding: 0; margin-top: 12px;
          text-decoration: underline; font-family: inherit;
        }
        .fp-resend:hover { color: #4f46e5; }
        .fp-resend:disabled { color: #94a3b8; cursor: not-allowed; }

        /* Error */
        .fp-error {
          display: flex; align-items: center; gap: 8px; padding: 12px 14px; background: #fef2f2;
          border: 1px solid #fecaca; border-radius: 10px; font-size: 13px; color: #dc2626; margin-bottom: 20px;
        }

        /* Success */
        .fp-success {
          display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 28px 14px;
          background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1px solid #bbf7d0;
          border-radius: 14px; font-size: 14px; color: #16a34a; margin-bottom: 24px; text-align: center;
        }
        .fp-success-icon {
          width: 56px; height: 56px; border-radius: 50%; background: #22c55e;
          display: flex; align-items: center; justify-content: center;
        }

        /* Back link */
        .fp-back {
          display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600;
          color: #6366f1; text-decoration: none; transition: all 0.15s;
        }
        .fp-back:hover { color: #4f46e5; }
        .fp-center { text-align: center; margin-top: 16px; }

        .fp-email-highlight {
          display: inline-block; padding: 4px 12px; background: #eef2ff; border-radius: 8px;
          font-size: 13px; font-weight: 600; color: #4f46e5; margin-top: 4px;
        }

        @keyframes fpSpin {
          to { transform: rotate(360deg); }
        }
        .fp-spin { animation: fpSpin 1s linear infinite; }
      `}</style>

      <div className="fp-root">
        <div className="fp-card" key={step}>

          {/* ─── Step: Choose method ─── */}
          {step === 'choose' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px', background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KeyRound size={28} color="#6366f1" />
                </div>
              </div>
              <h1>Forgot your password?</h1>
              <p className="sub">Choose how you'd like to reset your password</p>

              <div className="fp-options">
                <button className="fp-option" onClick={() => setStep('email')}>
                  <div className="fp-option-icon email-icon">
                    <Mail size={22} color="#2563eb" />
                  </div>
                  <div>
                    <div className="fp-option-title">Reset via Email Code</div>
                    <div className="fp-option-desc">We'll send a verification code to your registered email address</div>
                  </div>
                  <ArrowRight size={18} className="fp-option-arrow" />
                </button>

                <button className="fp-option" onClick={() => setStep('admin')}>
                  <div className="fp-option-icon admin-icon">
                    <ShieldAlert size={22} color="#d97706" />
                  </div>
                  <div>
                    <div className="fp-option-title">Ask Admin to Reset</div>
                    <div className="fp-option-desc">Contact your administrator to reset your password manually</div>
                  </div>
                  <ArrowRight size={18} className="fp-option-arrow" />
                </button>
              </div>

              <div className="fp-center">
                <Link to="/login" className="fp-back">
                  <ArrowLeft size={16} /> Back to login
                </Link>
              </div>
            </>
          )}

          {/* ─── Step: Admin info ─── */}
          {step === 'admin' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={28} color="#dc2626" />
                </div>
              </div>
              <h1>Contact Your Admin</h1>
              <p className="sub">Your administrator can reset your password for you.</p>

              <div className="fp-admin-info">
                <strong>How to get a new password:</strong>
                <ul>
                  <li>Reach out to your administrator or team lead</li>
                  <li>Ask them to reset your password from the Staff Management panel</li>
                  <li>They will provide you with a new temporary password</li>
                  <li>Log in and change your password from your profile settings</li>
                </ul>
              </div>

              <button className="fp-btn fp-btn-ghost" onClick={() => setStep('choose')}>
                <ArrowLeft size={16} /> Back to options
              </button>

              <div className="fp-center">
                <Link to="/login" className="fp-back">
                  <ArrowLeft size={16} /> Back to login
                </Link>
              </div>
            </>
          )}

          {/* ─── Step: Enter email ─── */}
          {step === 'email' && (
            <>
              {/* Step indicators */}
              <div className="fp-steps">
                <div className="fp-step-dot active" />
                <div className="fp-step-line" />
                <div className="fp-step-dot" />
                <div className="fp-step-line" />
                <div className="fp-step-dot" />
              </div>

              <h1>Enter your email</h1>
              <p className="sub">We'll send a verification code to reset your password</p>

              {error && (
                <div className="fp-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSendOtp}>
                <div className="fp-form-group">
                  <label>Email address</label>
                  <input
                    type="email"
                    className="fp-input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>

                <button type="submit" disabled={loading} className="fp-btn fp-btn-primary">
                  {loading ? <><Loader2 size={16} className="fp-spin" /> Sending code...</> : <><Mail size={16} /> Send verification code</>}
                </button>
              </form>

              <button className="fp-btn fp-btn-ghost" onClick={() => { setStep('choose'); setError('') }}>
                <ArrowLeft size={16} /> Back to options
              </button>

              <div className="fp-center">
                <Link to="/login" className="fp-back">
                  <ArrowLeft size={16} /> Back to login
                </Link>
              </div>
            </>
          )}

          {/* ─── Step: Enter OTP ─── */}
          {step === 'otp' && (
            <>
              <div className="fp-steps">
                <div className="fp-step-dot done" />
                <div className="fp-step-line done" />
                <div className="fp-step-dot active" />
                <div className="fp-step-line" />
                <div className="fp-step-dot" />
              </div>

              <h1>Enter verification code</h1>
              <p className="sub">
                We sent a code to<br />
                <span className="fp-email-highlight">{email}</span>
              </p>

              {error && (
                <div className="fp-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleVerifyOtp}>
                <div className="fp-form-group">
                  <label>Verification code</label>
                  <input
                    type="text"
                    className="fp-otp-input"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="• • • • • •"
                    maxLength={6}
                    autoFocus
                    required
                  />
                </div>

                <button type="submit" disabled={loading} className="fp-btn fp-btn-primary">
                  {loading ? <><Loader2 size={16} className="fp-spin" /> Verifying...</> : 'Verify code'}
                </button>
              </form>

              <div style={{ textAlign: 'center' }}>
                <button className="fp-resend" onClick={handleResendOtp} disabled={loading}>
                  Didn't receive the code? Resend
                </button>
              </div>

              <button className="fp-btn fp-btn-ghost" onClick={() => { setStep('email'); setError(''); setOtp('') }}>
                <ArrowLeft size={16} /> Change email
              </button>
            </>
          )}

          {/* ─── Step: Set new password ─── */}
          {step === 'newpass' && (
            <>
              <div className="fp-steps">
                <div className="fp-step-dot done" />
                <div className="fp-step-line done" />
                <div className="fp-step-dot done" />
                <div className="fp-step-line done" />
                <div className="fp-step-dot active" />
              </div>

              <h1>Set new password</h1>
              <p className="sub">Create a strong password for your account</p>

              {error && (
                <div className="fp-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleResetPassword}>
                <div className="fp-form-group">
                  <label>New password</label>
                  <div className="fp-password-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="fp-input"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter new password (min 6 chars)"
                      autoComplete="new-password"
                      autoFocus
                      required
                    />
                    <button type="button" className="fp-toggle-btn" onClick={() => setShowPassword(v => !v)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {showPassword
                          ? <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></>
                          : <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>
                        }
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="fp-form-group">
                  <label>Confirm new password</label>
                  <input
                    type="password"
                    className="fp-input"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <button type="submit" disabled={loading} className="fp-btn fp-btn-primary">
                  {loading ? <><Loader2 size={16} className="fp-spin" /> Resetting...</> : 'Reset password'}
                </button>
              </form>
            </>
          )}

          {/* ─── Step: Done ─── */}
          {step === 'done' && (
            <>
              <div className="fp-success">
                <div className="fp-success-icon">
                  <CheckCircle size={28} color="#fff" />
                </div>
                <div>
                  <strong style={{ fontSize: 16 }}>Password reset successful!</strong><br />
                  <span style={{ fontSize: 13, color: '#15803d' }}>You can now sign in with your new password.</span>
                </div>
              </div>

              <button className="fp-btn fp-btn-primary" onClick={() => navigate('/login')} style={{ textDecoration: 'none' }}>
                Sign in now
              </button>
            </>
          )}

        </div>
      </div>
    </>
  )
}
