const colors = [
  { bg: '#6366f1', light: '#eef2ff' },
  { bg: '#22c55e', light: '#f0fdf4' },
  { bg: '#f59e0b', light: '#fffbeb' },
  { bg: '#ef4444', light: '#fef2f2' },
  { bg: '#8b5cf6', light: '#f5f3ff' },
  { bg: '#ec4899', light: '#fdf2f8' },
  { bg: '#14b8a6', light: '#f0fdfa' },
  { bg: '#f97316', light: '#fff7ed' },
]

export default function AgentAvatar({ name, size = 28, showName = false }) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'
  const colorIndex = name ? name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length : 0
  const color = colors[colorIndex]

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center justify-center shrink-0 font-bold text-white rounded-lg"
        style={{
          width: size, height: size,
          background: color.bg,
          fontSize: `${size * 0.4}px`,
          letterSpacing: '-0.02em',
        }}
      >
        {initials}
      </div>
      {showName && <span className="text-[0.82rem] text-gray-700 font-medium">{name}</span>}
    </div>
  )
}
