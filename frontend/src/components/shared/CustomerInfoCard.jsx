import { User } from 'lucide-react'

export default function CustomerInfoCard({ customer, agentName }) {
  if (!customer) return null

  return (
    <div className="rt-card">
      <div className="rt-card-header">
        <div className="rt-card-header-left">
          <div className="rt-card-icon"><User size={16} /></div>
          <span className="rt-card-title">Customer Info</span>
        </div>
      </div>
      
      <div className="rt-card-body grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {agentName && (
          <div className="md:col-span-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 flex items-center justify-between mb-1">
            <span className="text-indigo-950 font-bold">Assigned To</span>
            <span className="font-bold text-indigo-700 capitalize">{agentName}</span>
          </div>
        )}

        {(customer.businessAddress || customer.postcode) && (
          <div className="md:col-span-2">
            <span className="text-slate-500">Address</span>
            <p className="font-semibold text-slate-900 mt-1">
              {customer.businessAddress}
              {customer.postcode && !customer.businessAddress?.toUpperCase().includes(customer.postcode.toUpperCase())
                ? `, ${customer.postcode}`
                : ''}
            </p>
          </div>
        )}

        <div>
          <span className="text-slate-500">Business Phone</span>
          <p className="font-semibold text-slate-900 mt-1">{customer.businessPhone || 'N/A'}</p>
        </div>
        <div>
          <span className="text-slate-500">Owner Phone</span>
          <p className="font-semibold text-slate-900 mt-1">{customer.ownerPhone || 'N/A'}</p>
        </div>

        {customer.email && (
          <div>
            <span className="text-slate-500">Email</span>
            <p className="font-semibold text-slate-900 mt-1">{customer.email}</p>
          </div>
        )}

        <div>
          <span className="text-slate-500">Utility Type</span>
          <p className="font-semibold text-slate-900 mt-1 capitalize">{customer.utilityType || 'N/A'}</p>
        </div>
      </div>
    </div>
  )
}
