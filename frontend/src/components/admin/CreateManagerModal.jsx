import { useState } from 'react'
import { X } from 'lucide-react'

export default function CreateManagerModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSave = async () => {
    if (!form.name || !form.email || !form.password) { setError('All fields required'); return }
    setLoading(true); setError('')
    try {
      await onSave(form)
      setForm({ name: '', email: '', password: '' })
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
          {['name', 'email', 'password'].map(f => (
            <div key={f}>
              <label className="rt-label capitalize">{f}</label>
              <input
                type={f === 'password' ? 'password' : 'text'}
                value={form[f]}
                onChange={e => setForm({ ...form, [f]: e.target.value })}
                placeholder={`Enter ${f}`}
                className="rt-input"
              />
            </div>
          ))}
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
