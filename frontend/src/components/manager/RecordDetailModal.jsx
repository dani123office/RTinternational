import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, PhoneCall, ArrowLeftRight, Calendar, FileText, Pencil } from 'lucide-react'
import StatusBadge from './StatusBadge'
import AgentAvatar from './AgentAvatar'
import { useToast } from '@/components/ui/toastContext'
import CustomerInfoCard from '@/components/shared/CustomerInfoCard'
import AccountDetailsCard from '@/components/shared/AccountDetailsCard'
import MeterDetailsCard from '@/components/shared/MeterDetailsCard'
import OfferedRatesCard from '@/components/shared/OfferedRatesCard'

const dayOptions = [
  { value: 'Monday', label: 'Monday' },
  { value: 'Tuesday', label: 'Tuesday' },
  { value: 'Wednesday', label: 'Wednesday' },
  { value: 'Thursday', label: 'Thursday' },
  { value: 'Friday', label: 'Friday' },
  { value: 'Saturday', label: 'Saturday' },
]

function getNextDate(dayName) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const target = days.indexOf(dayName)
  if (target === -1) return ''
  const today = new Date()
  const current = today.getDay()
  let diff = target - current
  if (diff <= 0) diff += 7
  const next = new Date(today)
  next.setDate(today.getDate() + diff)
  return next.toISOString().split('T')[0]
}

export default function RecordDetailModal({ isOpen, onClose, record, type, agentMap, onReschedule, onDelete, onConvert, onScheduleCallback }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [rescheduling, setRescheduling] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scheduleDay, setScheduleDay] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('12:00')

  if (!isOpen || !record) return null

  const agentName = agentMap?.[record.employeeId]?.name || 'Unknown'
  const isCallback = type === 'callback'

  const handleDayChange = (day) => {
    setScheduleDay(day)
    setScheduleDate(getNextDate(day))
  }

  const handleReschedule = async () => {
    if (!scheduleDate || !scheduleTime) {
      toast('Please select a date and time', 'error')
      return
    }
    setSaving(true)
    try {
      await onReschedule?.(record.id, `${scheduleDate}T${scheduleTime}:00`, scheduleDay)
      setRescheduling(false)
      setScheduleDay('')
      setScheduleDate('')
      setScheduleTime('12:00')
      onClose()
    } catch {
      toast('Failed to reschedule', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className={`bg-white rounded-2xl w-[90%] ${!isCallback ? 'max-w-[850px]' : 'max-w-[560px]'} max-h-[85vh] flex flex-col shadow-2xl transition-all duration-200`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isCallback ? 'bg-indigo-50' : 'bg-green-50'}`}>
              {isCallback ? <PhoneCall size={16} color="#6366f1" /> : <ArrowLeftRight size={16} color="#22c55e" />}
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              {isCallback ? 'Callback' : 'Transfer'} #{record.id}
            </h3>
            <StatusBadge status={record.status} type={type} />
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border-0 bg-slate-50 text-slate-400 cursor-pointer flex items-center justify-center hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-5">
          {isCallback ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">Agent</p>
                <AgentAvatar name={agentName} size={26} showName />
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Customer ID</p>
                <p className="text-sm font-medium text-slate-900">#{record.customerId}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Day</p>
                <p className="text-sm font-medium text-slate-900">{record.dayOfWeek || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Date</p>
                <p className="text-sm font-medium text-slate-900">{record.callbackDate || record.scheduledDateTime?.split('T')[0] || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Time</p>
                <p className="text-sm font-medium text-slate-900">{record.callbackTime || (record.scheduledDateTime ? record.scheduledDateTime.split('T')[1]?.split(':').slice(0, 2).join(':') : 'N/A')}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Created</p>
                <p className="text-sm font-medium text-slate-900">{record.createdAt ? new Date(record.createdAt).toLocaleDateString('en-GB') : 'N/A'}</p>
              </div>
              {record.notes && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-400 mb-1">Notes</p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3 whitespace-pre-wrap leading-relaxed">{record.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Agent & general header metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl text-sm">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Agent</p>
                  <AgentAvatar name={agentName} size={26} showName />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Customer ID</p>
                  <p className="text-sm font-semibold text-slate-900">#{record.customerId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Utility Type</p>
                  <p className="text-sm font-semibold text-slate-900 capitalize">{record.utilityType || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Created</p>
                  <p className="text-sm font-semibold text-slate-900">{record.createdAt ? new Date(record.createdAt).toLocaleDateString('en-GB') : 'N/A'}</p>
                </div>
              </div>

              {/* Customer Info Card */}
              {record.customer && (
                <CustomerInfoCard customer={record.customer} />
              )}

              {/* Account Details Card */}
              <AccountDetailsCard transfer={record} />

              {/* Meter details side by side */}
              {record.customer && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MeterDetailsCard utilityType="electricity" meters={record.customer.electricityMeters} />
                  <MeterDetailsCard utilityType="gas" meters={record.customer.gasMeters} />
                </div>
              )}

              {/* Offered Rates */}
              <OfferedRatesCard transfer={record} />

              {/* Notes */}
              {record.notes && (
                <div className="rt-card">
                  <div className="rt-card-header">
                    <div className="rt-card-header-left">
                      <div className="rt-card-icon" style={{background: 'rgba(99,102,241,0.15)'}}>
                        <FileText size={16} color="#6366f1" />
                      </div>
                      <span className="rt-card-title">Notes</span>
                    </div>
                  </div>
                  <div className="rt-card-body">
                    <p style={{color:'#334155',fontSize:'13.5px',whiteSpace:'pre-wrap',lineHeight:1.7,margin:0}}>{record.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {rescheduling ? (
            <div className="bg-slate-50 rounded-xl p-4 flex flex-col gap-3">
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Calendar size={14} /> Reschedule
              </p>
              <div className="flex gap-3 flex-wrap">
                <select value={scheduleDay} onChange={e => handleDayChange(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white outline-none cursor-pointer flex-1 min-w-[120px]">
                  <option value="">Select day</option>
                  {dayOptions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white outline-none flex-1 min-w-[140px]" />
                <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white outline-none flex-1 min-w-[100px]" />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setRescheduling(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition-all duration-150">Cancel</button>
                <button onClick={handleReschedule} disabled={saving} className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 border-0 rounded-lg shadow-sm hover:shadow active:scale-[0.98] cursor-pointer transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed">{saving ? 'Saving…' : 'Confirm'}</button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 p-5 bg-slate-50/80 backdrop-blur-sm rounded-b-2xl shrink-0">
          <div>
            <button onClick={() => onDelete?.(record.id)}
              className="px-4 py-2.5 text-sm font-semibold text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100/60 active:bg-rose-200 rounded-xl transition-all duration-200 cursor-pointer shadow-sm hover:shadow-rose-100/50 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2">
              Delete
            </button>
          </div>
          <div className="flex items-center gap-3">
            {!rescheduling && (
              <button onClick={() => setRescheduling(true)}
                className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-all duration-200 cursor-pointer shadow-sm hover:shadow-slate-100/80 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2">
                <Calendar size={14} /> Reschedule
              </button>
            )}
            {isCallback && (
              <button onClick={() => { navigate(`/callbacks/${record.id}/edit`); onClose() }}
                className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-all duration-200 cursor-pointer shadow-sm hover:shadow-slate-100/80 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2">
                <Pencil size={14} /> Edit
              </button>
            )}
            {isCallback && onConvert && (
              <button onClick={() => { onConvert(record.id); onClose() }}
                className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 border-0 hover:from-indigo-700 hover:to-violet-700 active:from-indigo-800 active:to-violet-800 rounded-xl transition-all duration-200 cursor-pointer shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200/50 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2">
                <ArrowLeftRight size={14} /> Mark as Transfer
              </button>
            )}
            {!isCallback && onScheduleCallback && (
              <button onClick={() => { onScheduleCallback(record.id); onClose() }}
                className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 border-0 hover:from-emerald-700 hover:to-teal-700 active:from-emerald-800 active:to-teal-800 rounded-xl transition-all duration-200 cursor-pointer shadow-md shadow-emerald-100 hover:shadow-lg hover:shadow-emerald-200/50 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2">
                <PhoneCall size={14} /> Schedule Callback
              </button>
            )}
            {!isCallback && onConvert && (
              <button onClick={() => { onConvert(record.id); onClose() }}
                className="px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 border-0 hover:from-amber-600 hover:to-orange-600 active:from-amber-700 active:to-orange-700 rounded-xl transition-all duration-200 cursor-pointer shadow-md shadow-amber-100 hover:shadow-lg hover:shadow-amber-200/50 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2">
                Mark as Sale
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
