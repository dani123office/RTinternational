import { Calendar, Clock } from 'lucide-react'
import StatusBadge from '@/components/shared/StatusBadge'
import { formatDate, formatTime } from '@/lib/formatters'

export default function TransferHero({ transfer, customer }) {
  if (!transfer || !customer) return null

  const scheduledDate = transfer.scheduledDateTime
  const statusLower = (transfer.status || 'pending').toLowerCase()

  // Dynamic colors for the top-right visual badge
  const badgeStyles = {
    pending: { bg: '#fffbeb', text: '#d97706', border: '#f59e0b' },
    approved: { bg: '#f0fdf4', text: '#15803d', border: '#22c55e' },
    completed: { bg: '#f0fdf4', text: '#15803d', border: '#22c55e' },
    done: { bg: '#f0fdf4', text: '#15803d', border: '#22c55e' },
    rejected: { bg: '#fef2f2', text: '#b91c1c', border: '#ef4444' },
    failed: { bg: '#fef2f2', text: '#b91c1c', border: '#ef4444' },
    dispute: { bg: '#fffbeb', text: '#d97706', border: '#f59e0b' },
    chasing: { bg: '#fffbeb', text: '#d97706', border: '#f59e0b' },
    hold: { bg: '#faf5ff', text: '#6b21a8', border: '#a855f7' },
  }

  const activeStyle = badgeStyles[statusLower] || { bg: '#f8fafc', text: '#475569', border: '#cbd5e1' }

  return (
    <div className="bg-indigo-600 text-white p-6 rounded-xl flex flex-col gap-3 relative overflow-hidden">
      <div className="flex gap-2 items-center">
        <StatusBadge status={transfer.status} />
        <span className="text-xs font-semibold rounded-full px-3 py-1 bg-indigo-500 capitalize border border-indigo-400">
          {customer.utilityType}
        </span>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight pr-28">
          {customer.businessName || 'Unknown Business'}
        </h1>
        <p className="text-indigo-200 mt-1 text-lg font-medium">
          {customer.ownerName}
        </p>
      </div>

      {scheduledDate && (
        <div className="flex items-center gap-6 text-sm text-indigo-200 font-medium">
          <span className="flex items-center gap-2">
            <Calendar size={16} />
            {formatDate(scheduledDate)}
          </span>
          <span className="flex items-center gap-2">
            <Clock size={16} />
            {formatTime(scheduledDate)}
          </span>
        </div>
      )}

      {/* Top Right Prominent Status Badge */}
      <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
        <span
          className="shadow-md"
          style={{
            backgroundColor: activeStyle.bg,
            color: activeStyle.text,
            borderColor: activeStyle.border,
            borderWidth: '1.5px',
            borderStyle: 'solid',
            padding: '6px 16px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'inline-block',
          }}
        >
          {transfer.status || 'Pending'}
        </span>
      </div>
    </div>
  )
}
