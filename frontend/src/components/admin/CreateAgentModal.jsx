import { useState } from 'react'
import { X } from 'lucide-react'

export default function CreateAgentModal({ isOpen, onClose, onSave, managers }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', managerId: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSave = async () => {
    if (!form.name || !form.email || !form.password) { setError('Name, email and password required'); return }
    if (!form.managerId) { setError('Please assign a manager'); return }
    setLoading(true); setError('')
    try {
      await onSave({ ...form, managerId: Number(form.managerId) })
      setForm({ name: '', email: '', password: '', managerId: '' })
      onClose()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create agent')
    } finally { setLoading(false) }
  }

  const noManagers = !managers || managers.length === 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[90%] max-w-[440px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Create Agent</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border-0 bg-slate-50 text-slate-400 cursor-pointer flex items-center justify-center hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 flex flex-col gap-3">
          {error && <p className="text-[0.8rem] text-red-500 p-2 bg-red-50 rounded-lg">{error}</p>}
          {noManagers && (
            <p className="text-[0.8rem] text-amber-600 p-2 bg-amber-50 rounded-lg border border-amber-200">
              Please create a manager first
            </p>
          )}
          <div>
            <label className="rt-label">Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Enter name"
              className="rt-input" />
          </div>
          <div>
            <label className="rt-label">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Enter email"
              className="rt-input" />
          </div>
          <div>
            <label className="rt-label">Password</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Enter password"
              className="rt-input" />
          </div>
          <div>
            <label className="rt-label">Assigned Manager *</label>
            <select
              value={form.managerId}
              onChange={e => setForm({ ...form, managerId: e.target.value })}
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
          <button onClick={handleSave} disabled={loading || noManagers} className="rt-btn-primary text-sm">
            {loading ? 'Creating...' : 'Create Agent'}
          </button>
        </div>
      </div>
    </div>
  )
}
