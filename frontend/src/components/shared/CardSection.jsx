export default function CardSection({ title, children, border, headerRight, titleIcon: Icon, iconColor = '#6366f1', style: extraStyle }) {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5"
      style={{ border: border ? `1px solid ${border}` : '1px solid #f1f5f9', ...extraStyle }}
    >
      {title && (
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50">
          <h3 className="text-[0.9rem] font-bold text-slate-900 tracking-tight flex items-center gap-2">
            {Icon && <Icon size={16} color={iconColor} />}
            {title}
          </h3>
          {headerRight}
        </div>
      )}
      <div className="px-6 py-5">
        {children}
      </div>
    </div>
  )
}
