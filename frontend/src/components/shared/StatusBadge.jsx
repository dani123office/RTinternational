import { STATUS_CONFIG } from '@/lib/constants'

export default function StatusBadge({ status, style }) {
  const statusKey = (status || '').toLowerCase()
  const cfg = STATUS_CONFIG[statusKey] || { label: status || 'Unknown', bg: '#f1f5f9', color: '#475569' }
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[0.72rem] font-semibold leading-tight whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color, ...style }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  )
}
