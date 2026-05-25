import { PhoneCall, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function LinkedRecordsCard({ linkedCallback, linkedSales }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isManager = user?.role === 'manager'

  if (!linkedCallback && (!linkedSales || linkedSales.length === 0)) return null

  return (
    <div className="rt-card">
      <div className="rt-card-header">
        <div className="rt-card-header-left">
          <div className="rt-card-icon"><PhoneCall size={16} /></div>
          <span className="rt-card-title">Linked Records</span>
        </div>
      </div>
      
      <div className="rt-card-body flex flex-col gap-2">
        {linkedCallback && (
          <div 
            onClick={() => navigate(isManager ? `/manager/callbacks/${linkedCallback.id}` : `/callbacks/${linkedCallback.id}`)}
            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <PhoneCall size={14} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Callback</p>
              <p className="text-xs text-slate-500">{linkedCallback.customer?.businessName}</p>
            </div>
          </div>
        )}

        {linkedSales?.map((s) => (
          <div 
            key={s.id}
            onClick={() => navigate(`/sales/${s.id}`)}
            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle size={14} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Sale</p>
              <p className="text-xs text-slate-500">{s.ownerFullName || s.customer?.businessName}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
