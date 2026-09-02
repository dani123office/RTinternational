import { useState, useEffect } from 'react'
import { X, Clock, Calendar, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react'
import api, { endpoints } from '@/lib/api'
import { useToast } from '@/components/ui/toastContext'

export default function EditAttendanceModal({ isOpen, onClose, record, onSaved }) {
  const { toast } = useToast()
  if (!isOpen || !record) return null

  // Extract initial times
  const extractTime = (val) => {
    if (!val) return ''
    if (typeof val === 'string' && val.includes('T')) {
      const d = new Date(val)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    if (typeof val === 'string' && val.includes(':')) {
      // Could be '1:49 PM' or '13:49:00'
      if (val.toLowerCase().includes('am') || val.toLowerCase().includes('pm')) {
        const parts = val.trim().split(/[:\s]/)
        let hours = parseInt(parts[0], 10)
        const mins = parts[1] || '00'
        const ampm = val.slice(-2).toLowerCase()
        if (ampm === 'pm' && hours < 12) hours += 12
        if (ampm === 'am' && hours === 12) hours = 0
        return `${String(hours).padStart(2, '0')}:${mins}`
      }
      return val.slice(0, 5)
    }
    return ''
  }

  const [checkInTime, setCheckInTime] = useState(() => extractTime(record.checkIn || record.check_in))
  const [checkOutTime, setCheckOutTime] = useState(() => extractTime(record.checkOut || record.check_out))
  const [status, setStatus] = useState(record.status || 'present')
  const [reason, setReason] = useState(record.checkin_reason || record.reason || '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setCheckInTime(extractTime(record.checkIn || record.check_in))
    setCheckOutTime(extractTime(record.checkOut || record.check_out))
    setStatus(record.status || 'present')
    setReason(record.checkin_reason || record.reason || '')
  }, [record])

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus)
    if (newStatus === 'absent') {
      setCheckInTime('')
      setCheckOutTime('')
      if (!reason || reason === 'Manual Entry') {
        setReason('Absent (Manager Override)')
      }
    } else if (newStatus === 'present' && !checkInTime) {
      setCheckInTime('14:00')
    } else if (newStatus === 'late' && !checkInTime) {
      setCheckInTime('14:30')
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        userId: record.userId || record.user_id,
        date: record.date,
        checkIn: checkInTime ? `${checkInTime}:00` : '',
        checkOut: checkOutTime ? `${checkOutTime}:00` : '',
        status: status,
        checkin_reason: reason.trim() || 'Manual Entry',
        checkout_reason: record.checkout_reason || null,
      }

      await api.put(endpoints.attendance.update, payload)
      toast.success(`Attendance updated for ${record.userName || record.name || 'employee'} on ${record.date}`)
      if (onSaved) onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update attendance')
    } finally {
      setLoading(false)
    }
  }

  const employeeName = record.userName || record.name || 'Employee'
  const recordDate = record.date ? new Date(record.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Attendance</h3>
              <p className="text-xs text-slate-500">{employeeName} • {recordDate}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          
          {/* Status Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
              Attendance Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange('present')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  status === 'present'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-500 dark:text-emerald-300 shadow-sm ring-1 ring-emerald-500'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Present
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('late')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  status === 'late'
                    ? 'bg-amber-50 border-amber-500 text-amber-700 dark:bg-amber-950/40 dark:border-amber-500 dark:text-amber-300 shadow-sm ring-1 ring-amber-500'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Late
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('absent')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  status === 'absent'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/40 dark:border-rose-500 dark:text-rose-300 shadow-sm ring-1 ring-rose-500'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Absent
              </button>
            </div>
          </div>

          {/* Time pickers grid */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Check-In Time */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Check-In Time
                </label>
                {checkInTime && (
                  <button
                    type="button"
                    onClick={() => setCheckInTime('')}
                    className="text-[10px] text-rose-500 hover:text-rose-600 font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => {
                  setCheckInTime(e.target.value)
                  if (status === 'absent' && e.target.value) setStatus('present')
                }}
                disabled={status === 'absent'}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </div>

            {/* Check-Out Time */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Check-Out Time
                </label>
                {checkOutTime && (
                  <button
                    type="button"
                    onClick={() => setCheckOutTime('')}
                    className="text-[10px] text-rose-500 hover:text-rose-600 font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>
              <input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                disabled={status === 'absent'}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Reason / Adjustment Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Adjustment Note / Reason
            </label>
            <input
              type="text"
              placeholder="e.g. Approved adjustment, Biometric missed, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
