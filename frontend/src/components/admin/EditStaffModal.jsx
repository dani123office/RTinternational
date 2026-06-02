import { useState, useEffect } from 'react'
import { X, User, Mail, Phone, CreditCard, Briefcase, DollarSign, Building2, BadgePercent, Calendar, Heart } from 'lucide-react'

export default function EditStaffModal({ isOpen, onClose, onSave, agent }) {
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (agent) {
      setForm({
        name: agent.name || '',
        email: agent.email || '',
        phone: agent.phone || '',
        fatherName: agent.fatherName || '',
        monthlySalary: agent.monthlySalary || '',
        cnic: agent.cnic || '',
        department: agent.department || '',
        designation: agent.designation || '',
        dateOfBirth: agent.dateOfBirth ? agent.dateOfBirth.slice(0, 10) : '',
        dateOfJoining: agent.dateOfJoining ? agent.dateOfJoining.slice(0, 10) : '',
        emergContactName: agent.emergContactName || '',
        emergContactNumber: agent.emergContactNumber || '',
      })
    }
  }, [agent])

  if (!isOpen) return null

  const handleSave = async () => {
    setLoading(true); setError('')
    try {
      const payload = {}
      for (const [key, val] of Object.entries(form)) {
        if (val !== '' && val !== undefined && val !== null) {
          if (key === 'monthlySalary') {
            payload[key] = Math.round(Number(val))
          } else {
            payload[key] = val
          }
        } else {
          payload[key] = null
        }
      }
      await onSave(payload)
      onClose()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to update agent')
    } finally { setLoading(false) }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[90%] max-w-[620px] shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="text-base font-semibold text-slate-900">Edit Staff Profile</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border-0 bg-slate-50 text-slate-400 cursor-pointer flex items-center justify-center hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          {error && <p className="text-[0.8rem] text-red-500 p-2 bg-red-50 rounded-lg">{error}</p>}

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
              <input type="email" value={form.email} onChange={set('email')} placeholder="Enter email" className="rt-input" />
            </div>
            <div>
              <label className="rt-label flex items-center gap-1.5"><span className="text-[11px] font-bold text-slate-500 mr-0.5">Rs</span> Monthly Salary</label>
              <input type="number" value={form.monthlySalary} onChange={set('monthlySalary')} placeholder="0" className="rt-input" />
            </div>
          </div>

          <div className="rt-grid2">
            <div>
              <label className="rt-label flex items-center gap-1.5"><CreditCard size={13} /> CNIC</label>
              <input value={form.cnic} onChange={set('cnic')} placeholder="Enter CNIC number" className="rt-input" />
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
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="rt-btn-outline text-sm">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="rt-btn-primary text-sm">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
