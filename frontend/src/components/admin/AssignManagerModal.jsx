import { useState } from 'react'
import { X } from 'lucide-react'

export default function AssignManagerModal({ isOpen, onClose, onSave, agent, managers }) {
  const [managerId, setManagerId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSave = async () => {
    if (!managerId) { setError('Please select a manager'); return }
    setLoading(true); setError('')
    try {
      await onSave(agent.id, Number(managerId))
      setManagerId('')
      onClose()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to assign')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[90%] max-w-[400px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Assign Manager</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border-0 bg-slate-50 text-slate-400 cursor-pointer flex items-center justify-center hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6">
          {agent && <p className="text-[0.85rem] text-slate-600 mb-4">Assign manager for <strong>{agent.name}</strong></p>}
          {error && <p className="text-[0.8rem] text-red-500 p-2 bg-red-50 rounded-lg mb-3">{error}</p>}
          <select
            value={managerId}
            onChange={e => setManagerId(e.target.value)}
            className="rt-input"
          >
            <option value="">Select a manager...</option>
            {(managers || []).map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="rt-btn-outline text-sm">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="rt-btn-primary text-sm">
            {loading ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  )
}
