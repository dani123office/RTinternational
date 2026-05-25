export default function FilterPill({ label, count, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border-0 text-xs font-semibold cursor-pointer transition-all duration-150 ${
        isSelected
          ? 'text-white shadow-[0_2px_8px_rgba(99,102,241,0.25)]'
          : 'text-slate-600 bg-slate-100'
      }`}
      style={{
        background: isSelected ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : undefined,
      }}
    >
      {label}
      {count !== undefined && (
        <span className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full ${
          isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
        }`}>
          {count}
        </span>
      )}
    </button>
  )
}
