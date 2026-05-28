const statusConfig = {
  pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  done: { bg: '#d1fae5', color: '#065f46', label: 'Sale Complete' },
  completed: { bg: '#d1fae5', color: '#065f46', label: 'Completed' },
  chasing: { bg: '#dbeafe', color: '#1e40af', label: 'Chasing' },
  cotinprogress: { bg: '#e0e7ff', color: '#3730a3', label: 'COT In Progress' },
  cotcomplete: { bg: '#d1fae5', color: '#065f46', label: 'COT Complete' },
  failed: { bg: '#fee2e2', color: '#991b1b', label: 'Failed' },
  overdue: { bg: '#fce7f3', color: '#9d174d', label: 'Overdue' },
  hold: { bg: '#f3e8ff', color: '#6b21a8', label: 'On Hold' },
  success: { bg: '#d1fae5', color: '#065f46', label: 'Success' },
}

export default function StatusBadge({ status, type }) {
  const statusKey = (status || '').toLowerCase()
  const config = statusConfig[statusKey] || { bg: '#f1f5f9', color: '#475569', label: status || 'Unknown' }

  let label = config.label
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
      style={{ background: config.bg, color: config.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: config.color }} />
      {label}
    </span>
  )
}
