import { STATUS_CONFIG } from '@/lib/constants'

export default function StatusBadge({ status, type, style }) {
  const statusKey = (status || '').toLowerCase()
  const cfg = STATUS_CONFIG[statusKey] || { label: status || 'Unknown', bg: '#f1f5f9', color: '#475569' }
  
  let label = cfg.label
  if (statusKey === 'done' || statusKey === 'completed') {
    if (type === 'callback') {
      label = 'Callback Complete'
    } else if (type === 'transfer') {
      label = 'Transfer Complete'
    } else if (type === 'sale') {
      label = 'Sale Complete'
    }
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[0.72rem] font-semibold leading-tight whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color, ...style }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />
      {label}
    </span>
  )
}
