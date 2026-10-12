import { useState } from 'react'
import { X, User, Mail, Lock, DollarSign, Briefcase, Building2, Phone } from 'lucide-react'

export default function CreateManagerModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    monthlySalary: '',
    designation: '',
    department: 'Management',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSave = async () => {
    if (!form.name || !form.email || !form.password) { setError('Name, email, and password are required'); return }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email.trim())) {
      setError('Please enter a valid email address with @ (e.g. name@domain.com)')
      return
    }
    setLoading(true); setError('')
    try {
      await onSave({
        ...form,
        monthlySalary: form.monthlySalary ? Math.round(Number(form.monthlySalary)) : 0,
        phone: form.phone || null,
        designation: form.designation || 'Manager',
        department: form.department || 'Management',
      })
      setForm({
        name: '',
        email: '',
        password: '',
        monthlySalary: '',
        designation: '',
        department: 'Management',
        phone: '',
      })
      onClose()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create manager')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[90%] max-w-[500px] shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="text-base font-semibold text-slate-900">Create New Manager</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border-0 bg-slate-50 text-slate-400 cursor-pointer flex items-center justify-center hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 flex flex-col gap-3.5">
          {error && <p className="text-[0.8rem] text-red-500 p-2 bg-red-50 rounded-lg">{error}</p>}
          <div>
            <label className="rt-label flex items-center gap-1.5"><User size={13} /> Full Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Enter full name"
              className="rt-input"
            />
          </div>
          <div>
            <label className="rt-label flex items-center gap-1.5"><Mail size={13} /> Email Address *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="Enter email address"
              className="rt-input"
            />
          </div>
          <div>
            <label className="rt-label flex items-center gap-1.5"><Lock size={13} /> Password *</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Enter password"
              className="rt-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rt-label flex items-center gap-1.5"><DollarSign size={13} /> Monthly Salary (Rs.)</label>
              <input
                type="number"
                value={form.monthlySalary}
                onChange={e => setForm({ ...form, monthlySalary: e.target.value })}
                placeholder="e.g. 80000"
                className="rt-input"
              />
            </div>
            <div>
              <label className="rt-label flex items-center gap-1.5"><Phone size={13} /> Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="e.g. 03001234567"
                className="rt-input"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rt-label flex items-center gap-1.5"><Briefcase size={13} /> Designation</label>
              <input
                type="text"
                value={form.designation}
                onChange={e => setForm({ ...form, designation: e.target.value })}
                placeholder="e.g. Operations Manager"
                className="rt-input"
              />
            </div>
            <div>
              <label className="rt-label flex items-center gap-1.5"><Building2 size={13} /> Department</label>
              <input
                type="text"
                value={form.department}
                onChange={e => setForm({ ...form, department: e.target.value })}
                placeholder="e.g. Management"
                className="rt-input"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="rt-btn-outline text-sm">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="rt-btn-primary text-sm">
            {loading ? 'Creating...' : 'Create Manager'}
          </button>
        </div>
      </div>
    </div>
  )
}
