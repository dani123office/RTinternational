import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

export default function ResetPasswordModal({ isOpen, onClose, onSave, user }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  if (!isOpen) return null

  const handleSave = async () => {
    setError('')
    if (!newPassword) { setError('Please enter a new password'); return }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      await onSave(user.id, newPassword)
      setDone(true)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to reset password')
    } finally { setLoading(false) }
  }

  const handleClose = () => {
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setDone(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleClose}>
      <div className="bg-white rounded-2xl w-[90%] max-w-[400px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">Reset Password</h3>
          <button onClick={handleClose} className="w-8 h-8 rounded-lg border-0 bg-slate-50 text-slate-400 cursor-pointer flex items-center justify-center hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6">
          {done ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <p className="text-sm font-semibold text-green-700">Password reset successful!</p>
              <p className="text-xs text-slate-500 mt-1">The user can now log in with the new password.</p>
            </div>
          ) : (
            <>
              {user && <p className="text-[0.85rem] text-slate-600 mb-4">Set a new password for <strong>{user.name}</strong></p>}
              {error && <p className="text-[0.8rem] text-red-500 p-2 bg-red-50 rounded-lg mb-3">{error}</p>}
              <div className="flex flex-col gap-3">
                <input
                  type="password"
                  className="rt-input"
                  placeholder="New password (min 6 chars)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
                <input
                  type="password"
                  className="rt-input"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={handleClose} className="rt-btn-outline text-sm">
            {done ? 'Close' : 'Cancel'}
          </button>
          {!done && (
            <button onClick={handleSave} disabled={loading} className="rt-btn-primary text-sm">
              {loading ? <><Loader2 size={14} className="animate-spin" /> Resetting...</> : 'Reset Password'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
