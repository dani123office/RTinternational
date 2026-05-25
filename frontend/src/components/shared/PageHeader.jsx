export default function PageHeader({ icon: Icon, iconBg, iconColor, title, action, subtitle }) {
  return (
    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div className="flex items-center gap-3">
        {Icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: iconBg || '#eef2ff' }}
          >
            <Icon size={20} color={iconColor || '#6366f1'} />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}
