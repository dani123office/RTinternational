import { User } from 'lucide-react'

export default function AccountDetailsCard({ transfer }) {
  if (!transfer || (!transfer.accountNumber && !transfer.mpan && !transfer.mprn && !transfer.msn)) return null

  return (
    <div className="rt-card">
      <div className="rt-card-header">
        <div className="rt-card-header-left">
          <div className="rt-card-icon"><User size={16} /></div>
          <span className="rt-card-title">Account Details</span>
        </div>
      </div>
      
      <div className="rt-card-body grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {transfer.accountNumber && (
          <div>
            <span className="text-slate-500">Account No.</span>
            <p className="font-semibold text-slate-900 mt-1">{transfer.accountNumber}</p>
          </div>
        )}
        {transfer.mpan && (
          <div>
            <span className="text-slate-500">MPAN</span>
            <p className="font-semibold text-slate-900 mt-1">{transfer.mpan}</p>
          </div>
        )}
        {transfer.mprn && (
          <div>
            <span className="text-slate-500">MPRN</span>
            <p className="font-semibold text-slate-900 mt-1">{transfer.mprn}</p>
          </div>
        )}
        {transfer.msn && (
          <div>
            <span className="text-slate-500">MSN</span>
            <p className="font-semibold text-slate-900 mt-1">{transfer.msn}</p>
          </div>
        )}
      </div>
    </div>
  )
}
