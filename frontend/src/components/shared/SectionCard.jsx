export default function SectionCard({ title, children, icon: Icon, iconColor, headerRight, className = '', border }) {
  return (
    <div
      className={`bg-white rounded-2xl border ${border ? border : 'border-gray-100'} shadow-sm overflow-hidden mb-5 ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between p-5 border-b border-gray-50">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 tracking-tight">
            {Icon && <Icon size={16} color={iconColor || '#6366f1'} />}
            {title}
          </h3>
          {headerRight}
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
    </div>
  )
}
