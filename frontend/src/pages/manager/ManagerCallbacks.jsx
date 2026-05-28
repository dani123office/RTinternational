import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useManagerStore } from '@/store/managerStore'

import StatusBadge from '@/components/manager/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toastContext'
import { PhoneCall, Loader2, Check, Calendar, Trash2, Clock, ArrowRight } from 'lucide-react'
import { APP_STYLES } from '@/lib/styles'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
]

const DOT_COLORS = {
  overdue: { dot: '#ef4444', ring: 'rgba(239,68,68,0.15)' },
  today: { dot: '#f59e0b', ring: 'rgba(245,158,11,0.15)' },
  upcoming: { dot: '#6366f1', ring: 'rgba(99,102,241,0.15)' },
}

const GROUP_META = {
  Overdue: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
  Today: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  Upcoming: { color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
}

export default function ManagerCallbacks() {
  const { callbacks, isLoading, updateCallback, deleteCallback, loadCallbacks } = useManagerStore()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [activeFilter, setActiveFilter] = useState('all')
  const [markDoneId, setMarkDoneId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [rescheduleId, setRescheduleId] = useState(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('10:00')
  const [initialLoad, setInitialLoad] = useState(false)

  useEffect(() => {
    loadCallbacks().finally(() => setInitialLoad(true))
  }, [loadCallbacks])

  const today = useMemo(() => new Date(), [])
  const todayStr = today.toDateString()
  const formattedTodayDate = useMemo(() => today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), [today])

  const displayName = (val) => {
    if (!val || val === 'N/A') return null
    return val.replace(/\b(MRS|MR|MS|DR|MISS)\.(?=[A-Z])/gi, '$1. ')
  }

  const { grouped, counts, activeList } = useMemo(() => {
    const activeCallbacks = callbacks.filter((cb) => cb.status !== 'done' && cb.status !== 'not_interested')
    const buckets = { overdue: [], today: [], upcoming: [] }
    activeCallbacks.forEach((cb) => {
      const d = new Date(cb.scheduledDateTime || cb.scheduledDate)
      if (d.toDateString() === todayStr) buckets.today.push(cb)
      else if (d < today) buckets.overdue.push(cb)
      else buckets.upcoming.push(cb)
    })
    const sortByDate = (arr) => arr.sort((a, b) => new Date(a.scheduledDateTime || a.scheduledDate) - new Date(b.scheduledDateTime || b.scheduledDate))
    const g = { overdue: sortByDate(buckets.overdue), today: sortByDate(buckets.today), upcoming: sortByDate(buckets.upcoming) }
    return {
      grouped: g,
      counts: { all: activeCallbacks.length, overdue: g.overdue.length, today: g.today.length, upcoming: g.upcoming.length },
      activeList: activeFilter === 'all' ? activeCallbacks : g[activeFilter] ?? activeCallbacks,
    }
  }, [callbacks, activeFilter, today, todayStr])

  const handleMarkDone = async () => {
    if (!markDoneId) return
    try {
      await updateCallback(markDoneId, { status: 'done' })
      toast('Callback marked as done', 'success')
      setMarkDoneId(null)
    } catch {
      toast('Failed to update callback', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteCallback(deleteId)
      toast('Callback deleted', 'success')
      setDeleteId(null)
    } catch {
      toast('Failed to delete callback', 'error')
    }
  }

  const handleReschedule = async () => {
    if (!rescheduleId || !rescheduleDate) return
    try {
      await updateCallback(rescheduleId, { scheduledDateTime: `${rescheduleDate}T${rescheduleTime}:00` })
      toast('Callback rescheduled', 'success')
      setRescheduleId(null)
    } catch {
      toast('Failed to reschedule callback', 'error')
    }
  }

  const renderCallbackRow = (cb) => {
    const d = new Date(cb.scheduledDateTime || cb.scheduledDate)
    const isOverdue = cb.status !== 'done' && d < today
    const isUrgent = !isOverdue && d.toDateString() === todayStr
    const dotKey = isOverdue ? 'overdue' : isUrgent ? 'today' : cb.status === 'done' ? 'done' : 'upcoming'
    const dot = DOT_COLORS[dotKey]
    return (
      <div
        key={cb.id}
        onClick={() => navigate(`/callbacks/${cb.id}`)}
        className="rt-card-flat"
        style={{cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px'}}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200"
            style={{ background: dot.ring }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: dot.dot }}
            />
          </div>
          <div className="min-w-0">
            <p style={{color:'#0f172a',fontWeight:600,fontSize:'14px',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textTransform:'capitalize'}}>
              {cb.customer?.businessName || displayName(cb.customer?.ownerName) || 'Unknown'}
            </p>
            <p style={{color:'#94a3b8',fontSize:'12px',margin:'2px 0 0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textTransform:'capitalize'}}>
              {cb.agentName ? `Agent: ${cb.agentName}` : displayName(cb.customer?.ownerName) || 'No contact person assigned'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-2">
          {cb.status !== 'done' && (
            <div style={{display:'flex',alignItems:'center',gap:'6px',color:'#94a3b8',background:'#f8fafc',padding:'4px 10px',borderRadius:'8px',fontSize:'12px'}}>
              <Clock size={12} />
              {!isUrgent ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' : ''}
              {d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          <StatusBadge status={isOverdue ? 'overdue' : cb.status} type="callback" />
          <div style={{color:'#d1d5db',display:'flex'}}>
            <ArrowRight size={14} />
          </div>
        </div>
      </div>
    )
  }

  const renderGrouped = () => {
    if (!grouped.overdue.length && !grouped.today.length && !grouped.upcoming.length) {
      return (
        <div style={{textAlign:'center',padding:'48px 20px'}}>
          <div style={{width:'48px',height:'48px',borderRadius:'14px',background:'rgba(99,102,241,0.08)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
            <PhoneCall size={20} color="#6366f1" opacity={0.5} />
          </div>
          <p style={{fontSize:'15px',fontWeight:700,color:'#0f172a',margin:'0 0 4px'}}>No callbacks found</p>
          <p style={{fontSize:'13px',color:'#94a3b8',margin:0}}>No callbacks linked to your transfers yet.</p>
        </div>
      )
    }
    return (
      <div className="rt-section-gap">
        {[['Overdue', grouped.overdue], ['Today', grouped.today], ['Upcoming', grouped.upcoming]].map(([title, list]) =>
          list.length > 0 && (
            <div key={title}>
              <div className="flex items-center gap-2.5 px-0 py-2">
                <div className="w-1 h-4 rounded-full" style={{ background: GROUP_META[title].color }} />
                <h3 style={{color:GROUP_META[title].color,fontSize:'11px',fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',margin:0}}>
                  {title === 'Today' ? `Today (${formattedTodayDate})` : title}
                </h3>
                <span style={{background:GROUP_META[title].bg,color:GROUP_META[title].color,fontSize:'10px',fontWeight:700,padding:'2px 8px',borderRadius:'10px'}}>
                  {list.length}
                </span>
              </div>
              <div className="rt-section-gap">{list.map(renderCallbackRow)}</div>
            </div>
          )
        )}
      </div>
    )
  }

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{maxWidth:'860px',margin:'0 auto'}}>
          <div className="rt-fade" style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'28px'}}>
            <div>
              <h1 style={{fontSize:'22px',fontWeight:800,color:'#0f172a',letterSpacing:'-0.5px',margin:0}}>Callbacks</h1>
              <p style={{fontSize:'13px',color:'#64748b',margin:'3px 0 0'}}>Callbacks linked to your team&apos;s transfers</p>
            </div>
          </div>

          <div className="rt-fade rt-d1" style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'20px'}}>
            {FILTERS.map((f) => {
              const isActive = activeFilter === f.key
              return (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className="rt-toggle-row"
                  style={{
                    cursor:'pointer',
                    background: isActive ? 'linear-gradient(135deg,#6366f1,#7c3aed)' : '#f8fafc',
                    color: isActive ? '#fff' : '#64748b',
                    borderColor: isActive ? 'transparent' : '#e2e6ec',
                    fontWeight:600,
                    fontSize:'12px',
                    textTransform:'uppercase',
                    letterSpacing:'.4px',
                    transition:'all .2s',
                  }}
                >
                  {f.label}
                  <span style={{
                    background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(99,102,241,0.1)',
                    color: isActive ? '#fff' : '#6366f1',
                    padding:'1px 7px',
                    borderRadius:'10px',
                    fontSize:'11px',
                    fontWeight:700,
                  }}>
                    {counts[f.key]}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="rt-card rt-fade rt-d2">
            <div className="rt-card-header">
              <div className="rt-card-header-left">
                <div className="rt-card-icon" style={{background:'rgba(99,102,241,0.1)'}}>
                  <PhoneCall size={16} color="#6366f1" />
                </div>
                <span className="rt-card-title">
                  {activeFilter === 'all' ? 'All' : FILTERS.find((f) => f.key === activeFilter)?.label} Callbacks
                </span>
              </div>
              <span style={{fontSize:'12px',fontWeight:700,padding:'3px 12px',borderRadius:'10px',background:'rgba(99,102,241,0.1)',color:'#6366f1'}}>
                {activeList.length}
              </span>
            </div>
            <div className="rt-card-body" style={{padding:'18px 22px'}}>
              {!initialLoad || (isLoading && !callbacks.length) ? (
                <div style={{display:'flex',justifyContent:'center',padding:'48px 0'}}>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'12px'}}>
                    <Loader2 size={24} className="rt-spin" color="#6366f1" />
                    <span style={{fontSize:'13px',color:'#94a3b8',fontWeight:500}}>Loading callbacks...</span>
                  </div>
                </div>
              ) : activeFilter === 'all' ? (
                renderGrouped()
              ) : activeList.length === 0 ? (
                <div style={{textAlign:'center',padding:'48px 20px'}}>
                  <div style={{width:'48px',height:'48px',borderRadius:'14px',background:'rgba(99,102,241,0.08)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
                    <PhoneCall size={20} color="#6366f1" opacity={0.5} />
                  </div>
                  <p style={{fontSize:'15px',fontWeight:700,color:'#0f172a',margin:'0 0 4px'}}>No callbacks found</p>
                  <p style={{fontSize:'13px',color:'#94a3b8',margin:0}}>No callbacks match the selected filter.</p>
                </div>
              ) : (
                <div className="rt-section-gap">{activeList.map(renderCallbackRow)}</div>
              )}
            </div>
          </div>

          <Dialog open={markDoneId !== null} onOpenChange={(o) => !o && setMarkDoneId(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogClose onClose={() => setMarkDoneId(null)} />
              <DialogHeader>
                <DialogTitle className="text-lg flex items-center gap-2">
                  <Check size={18} color="#22c55e" /> Mark Callback Done
                </DialogTitle>
                <DialogDescription className="text-gray-500">Close this callback.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setMarkDoneId(null)}>Cancel</Button>
                <Button onClick={handleMarkDone}>Mark as Done</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={rescheduleId !== null} onOpenChange={(o) => !o && setRescheduleId(null)}>
            <DialogContent className="max-w-md w-full">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  Reschedule Callback
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500 mt-1">
                  Set a new date and time for this callback.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reschedule-date">DATE</Label>
                  <Input id="reschedule-date" type="date" value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)} className="w-full" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reschedule-time">TIME</Label>
                  <Input id="reschedule-time" type="time" value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)} className="w-full" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setRescheduleId(null)}>Cancel</Button>
                <Button onClick={handleReschedule}><Calendar className="h-4 w-4" /> Reschedule</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
            <DialogContent className="max-w-sm w-full">
              <DialogHeader>
                <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-3">
                  <Trash2 size={22} color="#ef4444" />
                </div>
                <DialogTitle className="text-lg text-center">Delete Callback?</DialogTitle>
                <DialogDescription className="text-center text-slate-500">
                  This action cannot be undone. The callback will be permanently removed.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="justify-center">
                <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete}>Delete</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  )
}