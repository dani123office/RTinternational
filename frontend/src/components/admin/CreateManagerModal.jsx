import { useState } from 'react'
import { X, Send, Loader2, CheckCircle2, Mail } from 'lucide-react'
import api from '@/lib/api'

export default function CreateManagerModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [otpState, setOtpState] = useState('idle') // idle | sending | sent | verifying | verified
  const [otpCode, setOtpCode] = useState('')
  const [otpError, setOtpError] = useState('')
  const [fallbackOtp, setFallbackOtp] = useState('')

  if (!isOpen) return null

  const handleSendOtp = async () => {
    if (!form.email) { setOtpError('Please enter an email first'); return }
    setOtpError(''); setOtpState('sending'); setFallbackOtp('')
    try {
      const res = await api.post('/api/admin/send-otp', { email: form.email })
      if (res.data.otp) setFallbackOtp(res.data.otp)
      setOtpState('sent')
    } catch (e) {
      setOtpError(e.response?.data?.detail || 'Failed to send OTP')
      setOtpState('idle')
    }
  }

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) { setOtpError('Enter 6-digit verification code'); return }
    setOtpError(''); setOtpState('verifying')
    try {
      await api.post('/api/admin/verify-otp', { email: form.email, otp: otpCode })
      setOtpState('verified')
    } catch (e) {
      setOtpError(e.response?.data?.detail || 'Invalid OTP')
      setOtpState('sent')
    }
  }

  const handleSave = async () => {
    if (!form.name || !form.email || !form.password) { setError('All fields required'); return }
    if (otpState !== 'verified') { setError('Please verify the email first'); return }
    setLoading(true); setError('')
    try {
      await onSave(form)
      setForm({ name: '', email: '', password: '' })
      setOtpState('idle'); setOtpCode('')
      onClose()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create manager')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[90%] max-w-[440px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Create Manager</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border-0 bg-slate-50 text-slate-400 cursor-pointer flex items-center justify-center hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 flex flex-col gap-3">
          {error && <p className="text-[0.8rem] text-red-500 p-2 bg-red-50 rounded-lg">{error}</p>}

          {['name', 'email'].map(f => (
            <div key={f}>
              <label className="rt-label capitalize">{f}</label>
              <input
                type={f === 'password' ? 'password' : 'text'}
                value={form[f]}
                onChange={e => {
                  setForm({ ...form, [f]: e.target.value })
                  if (f === 'email' && otpState !== 'idle') {
                    setOtpState('idle'); setOtpCode(''); setOtpError('')
                  }
                }}
                placeholder={`Enter ${f}`}
                className="rt-input"
              />
            </div>
          ))}

          <div>
            <label className="rt-label">Email Verification</label>
            {otpState === 'idle' && (
              <button
                onClick={handleSendOtp}
                disabled={!form.email}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer border-0 transition-all w-full justify-center"
                style={{ background: !form.email ? '#94a3b8' : '#4F46E5' }}
              >
                <Send size={14} /> Send Verification Code
              </button>
            )}
            {otpState === 'sending' && (
              <button disabled className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white border-0 w-full justify-center" style={{ background: '#94a3b8' }}>
                <Loader2 size={14} className="animate-spin" /> Sending...
              </button>
            )}
            {otpState === 'verified' && (
              <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-green-700 bg-green-50 w-full justify-center">
                <CheckCircle2 size={14} /> Email Verified
              </span>
            )}
          </div>

          {(otpState === 'sent' || otpState === 'verifying') && (
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
              <label className="rt-label flex items-center gap-1.5 mb-2"><Mail size={13} /> Enter Verification Code</label>
              {fallbackOtp && (
                <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg mb-2 border border-amber-200">
                  Email delivery unavailable. Use code: <strong className="text-base tracking-widest">{fallbackOtp}</strong>
                </p>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  className="rt-input flex-1 text-center text-lg tracking-[0.3em] font-bold"
                />
                <button
                  onClick={handleVerifyOtp}
                  disabled={otpState === 'verifying'}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer border-0 transition-all shrink-0"
                  style={{ background: '#4F46E5' }}
                >
                  {otpState === 'verifying' ? <Loader2 size={14} className="animate-spin" /> : 'Verify'}
                </button>
              </div>
              {otpError && <p className="text-xs text-red-500 mt-1">{otpError}</p>}
              <button
                onClick={handleSendOtp}
                className="text-xs text-indigo-600 mt-1 bg-transparent border-0 cursor-pointer hover:underline p-0"
              >
                Resend code
              </button>
            </div>
          )}

          <div>
            <label className="rt-label capitalize">password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Enter password"
              className="rt-input"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="rt-btn-outline text-sm">Cancel</button>
          <button onClick={handleSave} disabled={loading || otpState !== 'verified'} className="rt-btn-primary text-sm">
            {loading ? 'Creating...' : 'Create Manager'}
          </button>
        </div>
      </div>
    </div>
  )
}
