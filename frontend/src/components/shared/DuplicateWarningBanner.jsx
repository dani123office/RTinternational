import { AlertTriangle, Info, UserCheck, ShieldAlert } from 'lucide-react'

export default function DuplicateWarningBanner({ warning, isChecking }) {
  if (isChecking) {
    return (
      <div className="flex items-center gap-2 p-2.5 px-3 mb-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-600 animate-pulse">
        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
        Checking duplicate records across system...
      </div>
    )
  }

  if (!warning) return null

  const isInfo = warning.isInfo

  return (
    <div
      className={`p-3.5 mb-5 rounded-xl border flex items-start gap-3 transition-all ${
        isInfo
          ? 'bg-blue-50/80 border-blue-200 text-blue-900'
          : 'bg-amber-50/90 border-amber-300 text-amber-900 shadow-sm'
      }`}
    >
      <div
        className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${
          isInfo ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
        }`}
      >
        {isInfo ? <Info size={16} /> : <AlertTriangle size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold leading-snug">
          {isInfo ? 'Notice: Re-assignable Lead' : 'Duplicate Record Alert'}
        </p>
        <p className="text-xs mt-0.5 opacity-90 leading-relaxed font-medium">
          {warning.message ||
            (warning.agentName
              ? `This customer belongs to Agent: ${warning.agentName}`
              : 'A customer with this postcode/phone already exists.')}
        </p>
        {warning.businessName && (
          <p className="text-[11px] mt-1 font-semibold opacity-75">
            Registered Business: <span className="underline">{warning.businessName}</span>
          </p>
        )}
      </div>
    </div>
  )
}
