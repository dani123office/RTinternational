import { useState } from 'react'
import { X, User, Mail, Lock, Briefcase, DollarSign, CreditCard, Phone, Building2, BadgePercent, Calendar, Heart, Users, Send, CheckCircle2, Loader2 } from 'lucide-react'
import api from '@/lib/api'

const formatCNIC = (value) => {
  if (!value) return value;
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 5) {
    return digits;
  } else if (digits.length <= 12) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  } else {
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
  }
};

export default function CreateAgentModal({ isOpen, onClose, onSave, managers }) {
  const [form, setForm] = useState({
    name: '', email: '', password: '', managerId: '',
    fatherName: '', monthlySalary: '', cnic: '', phone: '',
    department: '', designation: '', dateOfBirth: '', dateOfJoining: '',
    emergContactName: '', emergContactNumber: '',
  })
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
    if (!form.name || !form.email || !form.password) { setError('Name, email and password required'); return }
    if (!form.managerId) { setError('Please assign a manager'); return }
    if (otpState !== 'verified') { setError('Please verify the email first'); return }
    setLoading(true); setError('')
    try {
      await onSave({
        ...form,
        managerId: Number(form.managerId),
        monthlySalary: form.monthlySalary ? Math.round(Number(form.monthlySalary)) : 0,
      })
      setForm({
        name: '', email: '', password: '', managerId: '',
        fatherName: '', monthlySalary: '', cnic: '', phone: '',
        department: '', designation: '', dateOfBirth: '', dateOfJoining: '',
        emergContactName: '', emergContactNumber: '',
      })
      setOtpState('idle'); setOtpCode('')
      onClose()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create agent')
    } finally { setLoading(false) }
  }

  const set = (key) => (e) => {
    let val = e.target.value
    if (key === 'cnic') {
      val = formatCNIC(val)
    }
    if (key === 'email' && otpState !== 'idle') {
      setOtpState('idle'); setOtpCode(''); setOtpError('')
    }
    setForm({ ...form, [key]: val })
  }
  const noManagers = !managers || managers.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[90%] max-w-[620px] shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="text-base font-semibold text-slate-900">Add New Staff Member</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border-0 bg-slate-50 text-slate-400 cursor-pointer flex items-center justify-center hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          {error && <p className="text-[0.8rem] text-red-500 p-2 bg-red-50 rounded-lg">{error}</p>}
          {noManagers && (
            <p className="text-[0.8rem] text-amber-600 p-2 bg-amber-50 rounded-lg border border-amber-200">
              Please create a manager first
            </p>
          )}

          <div className="rt-grid2">
            <div>
              <label className="rt-label flex items-center gap-1.5"><User size={13} /> Full Name *</label>
              <input value={form.name} onChange={set('name')} placeholder="Enter full name" className="rt-input" />
            </div>
            <div>
              <label className="rt-label flex items-center gap-1.5"><User size={13} /> Father's Name</label>
              <input value={form.fatherName} onChange={set('fatherName')} placeholder="Enter father's name" className="rt-input" />
            </div>
          </div>

          <div className="rt-grid2">
            <div>
              <label className="rt-label flex items-center gap-1.5"><Mail size={13} /> Email *</label>
              <div className="flex gap-2">
                <input type="email" value={form.email} onChange={set('email')} placeholder="Enter email" className="rt-input flex-1" />
                {otpState === 'idle' && (
                  <button
                    onClick={handleSendOtp}
                    disabled={!form.email}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer border-0 transition-all shrink-0"
                    style={{ background: !form.email ? '#94a3b8' : '#4F46E5' }}
                  >
                    <Send size={13} /> Send Code
                  </button>
                )}
                {otpState === 'sending' && (
                  <button disabled className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white border-0 shrink-0" style={{ background: '#94a3b8' }}>
                    <Loader2 size={13} className="animate-spin" /> Sending...
                  </button>
                )}
                {otpState === 'verified' && (
                  <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-green-700 bg-green-50 shrink-0">
                    <CheckCircle2 size={13} /> Verified
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className="rt-label flex items-center gap-1.5"><Briefcase size={13} /> Role *</label>
              <select value="employee" disabled className="rt-input">
                <option value="employee">Employee</option>
              </select>
            </div>
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

          <div className="rt-grid2">
            <div>
              <label className="rt-label flex items-center gap-1.5"><Lock size={13} /> Password *</label>
              <input type="password" value={form.password} onChange={set('password')} placeholder="Enter password" className="rt-input" />
            </div>
            <div>
              <label className="rt-label flex items-center gap-1.5"><span className="text-[11px] font-bold text-slate-500 mr-0.5">Rs</span> Monthly Salary</label>
              <input type="number" value={form.monthlySalary} onChange={set('monthlySalary')} placeholder="0" className="rt-input" />
            </div>
          </div>

          <div className="rt-grid2">
            <div>
              <label className="rt-label flex items-center gap-1.5"><CreditCard size={13} /> CNIC</label>
              <input value={form.cnic} onChange={set('cnic')} placeholder="Enter CNIC number" maxLength={15} className="rt-input" />
            </div>
            <div>
              <label className="rt-label flex items-center gap-1.5"><Phone size={13} /> Telephone</label>
              <input type="tel" value={form.phone} onChange={set('phone')} placeholder="Enter telephone number" className="rt-input" />
            </div>
          </div>

          <div className="rt-grid2">
            <div>
              <label className="rt-label flex items-center gap-1.5"><Building2 size={13} /> Department</label>
              <input value={form.department} onChange={set('department')} placeholder="Enter department" className="rt-input" />
            </div>
            <div>
              <label className="rt-label flex items-center gap-1.5"><BadgePercent size={13} /> Designation</label>
              <input value={form.designation} onChange={set('designation')} placeholder="Enter designation" className="rt-input" />
            </div>
          </div>

          <div className="rt-grid2">
            <div>
              <label className="rt-label flex items-center gap-1.5"><Calendar size={13} /> Date of Birth</label>
              <input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} className="rt-input" />
            </div>
            <div>
              <label className="rt-label flex items-center gap-1.5"><Calendar size={13} /> Date of Joining</label>
              <input type="date" value={form.dateOfJoining} onChange={set('dateOfJoining')} className="rt-input" />
            </div>
          </div>

          <div className="rt-grid2">
            <div>
              <label className="rt-label flex items-center gap-1.5"><Heart size={13} /> Emerg. Contact Name</label>
              <input value={form.emergContactName} onChange={set('emergContactName')} placeholder="Enter emergency contact" className="rt-input" />
            </div>
            <div>
              <label className="rt-label flex items-center gap-1.5"><Phone size={13} /> Emerg. Contact Number</label>
              <input type="tel" value={form.emergContactNumber} onChange={set('emergContactNumber')} placeholder="Enter emergency number" className="rt-input" />
            </div>
          </div>

          <div>
            <label className="rt-label flex items-center gap-1.5"><Users size={13} /> Assigned Manager *</label>
            <select
              value={form.managerId}
              onChange={set('managerId')}
              disabled={noManagers}
              className="rt-input"
            >
              <option value="">{noManagers ? 'No managers available' : 'Select a manager...'}</option>
              {(managers || []).map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.teamSize || 0} agents)</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="rt-btn-outline text-sm">Cancel</button>
          <button onClick={handleSave} disabled={loading || noManagers || otpState !== 'verified'} className="rt-btn-primary text-sm">
            {loading ? 'Creating...' : 'Add Staff Member'}
          </button>
        </div>
      </div>
    </div>
  )
}
