import { Inbox } from 'lucide-react'

export default function EmptyState({ icon: Icon = Inbox, title = 'No data', description = 'Nothing to show yet' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
        <Icon size={28} color="#94a3b8" />
      </div>
      <h4 className="text-[0.95rem] font-semibold text-slate-600 mb-1">{title}</h4>
      <p className="text-[0.82rem] text-slate-400">{description}</p>
    </div>
  )
}
