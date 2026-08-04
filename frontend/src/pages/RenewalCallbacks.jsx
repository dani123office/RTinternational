import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDataStore } from '@/store/dataStore'
import { extractRenewalItems } from '@/lib/renewalUtils'
import { APP_STYLES } from '@/lib/styles'
import {
  RefreshCw, Search, Phone, Calendar, ArrowRight,
  Clock, AlertTriangle, Building2, User, MapPin, Zap,
  CheckCircle2, Plus, ArrowLeftRight, PoundSterling, Eye
} from 'lucide-react'

export default function RenewalCallbacks() {
  const { customers, callbacks, transfers, sales, isLoading, loadAll } = useDataStore()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    loadAll()
  }, [])

  const renewalItems = useMemo(() => {
    return extractRenewalItems({ customers, callbacks, transfers, sales })
  }, [customers, callbacks, transfers, sales])

  const counts = useMemo(() => {
    return {
      all: renewalItems.length,
      urgent: renewalItems.filter((item) => item.isUrgent && !item.isExpired).length,
      upcoming: renewalItems.filter((item) => !item.isUrgent && !item.isExpired).length,
      expired: renewalItems.filter((item) => item.isExpired).length,
    }
  }, [renewalItems])

  const filteredItems = useMemo(() => {
    return renewalItems.filter((item) => {
      // Filter by tab
      if (activeTab === 'urgent' && (!item.isUrgent || item.isExpired)) return false
      if (activeTab === 'upcoming' && (item.isUrgent || item.isExpired)) return false
      if (activeTab === 'expired' && !item.isExpired) return false

      // Filter by search term
      if (!searchTerm.trim()) return true
      const q = searchTerm.toLowerCase()
      return (
        item.businessName.toLowerCase().includes(q) ||
        item.ownerName.toLowerCase().includes(q) ||
        item.businessPhone.toLowerCase().includes(q) ||
        item.postcode.toLowerCase().includes(q) ||
        item.supplier.toLowerCase().includes(q) ||
        item.mpanOrMprn.toLowerCase().includes(q)
      )
    })
  }, [renewalItems, activeTab, searchTerm])

  const handleScheduleCallback = (item) => {
    navigate('/callbacks/add', {
      state: {
        fromRenewal: true,
        prefillData: {
          ...item.customer,
          notes: `Contract renewal callback for ${item.supplier} (${item.meterType.toUpperCase()}). Contract End Date: ${item.formattedEndDate}`,
        },
      },
    })
  }

  const handleCreateSale = (item) => {
    navigate('/sales/apply', {
      state: {
        fromRenewal: true,
        prefillData: {
          ...item.customer,
        },
      },
    })
  }

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        {/* Header */}
        <div className="rt-fade mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', boxShadow: '0 4px 12px rgba(139,92,246,0.3)' }}>
                  <RefreshCw size={20} color="#ffffff" className="animate-spin-slow" />
                </div>
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>
                    Renewal Callbacks
                  </h1>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0', fontWeight: 500 }}>
                    Customers with contract end date within 1 month (30 days)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadAll()}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200"
                style={{ background: '#ffffff', color: '#334155', border: '1.5px solid #e2e6ec' }}
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="rt-fade rt-d1 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="rt-card-flat p-4 cursor-pointer hover:shadow-md transition-all" onClick={() => setActiveTab('all')} style={{ borderLeft: '4px solid #8b5cf6' }}>
            <p className="text-xs font-semibold text-slate-500">Total Renewals</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{counts.all}</p>
            <p className="text-xs text-purple-600 font-medium mt-0.5">Expiring in ≤30 days</p>
          </div>

          <div className="rt-card-flat p-4 cursor-pointer hover:shadow-md transition-all" onClick={() => setActiveTab('urgent')} style={{ borderLeft: '4px solid #f59e0b' }}>
            <p className="text-xs font-semibold text-slate-500">Urgent (≤15 Days)</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">{counts.urgent}</p>
            <p className="text-xs text-amber-600 font-medium mt-0.5">High priority action</p>
          </div>

          <div className="rt-card-flat p-4 cursor-pointer hover:shadow-md transition-all" onClick={() => setActiveTab('upcoming')} style={{ borderLeft: '4px solid #6366f1' }}>
            <p className="text-xs font-semibold text-slate-500">Upcoming (16-30 Days)</p>
            <p className="text-2xl font-extrabold text-indigo-600 mt-1">{counts.upcoming}</p>
            <p className="text-xs text-indigo-600 font-medium mt-0.5">Pipeline opportunities</p>
          </div>

          <div className="rt-card-flat p-4 cursor-pointer hover:shadow-md transition-all" onClick={() => setActiveTab('expired')} style={{ borderLeft: '4px solid #ef4444' }}>
            <p className="text-xs font-semibold text-slate-500">Expired Contracts</p>
            <p className="text-2xl font-extrabold text-red-600 mt-1">{counts.expired}</p>
            <p className="text-xs text-red-600 font-medium mt-0.5">Immediate renewal needed</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="rt-fade rt-d2 rt-card p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/80 shrink-0 overflow-x-auto">
              {[
                { key: 'all', label: `All (${counts.all})` },
                { key: 'urgent', label: `Urgent (${counts.urgent})` },
                { key: 'upcoming', label: `15-30 Days (${counts.upcoming})` },
                { key: 'expired', label: `Expired (${counts.expired})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === tab.key
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search business name, phone, postcode, supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs font-medium border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* List of Renewal Items */}
        <div className="rt-fade rt-d3">
          {isLoading ? (
            <div className="rt-card p-12 text-center">
              <RefreshCw size={28} className="animate-spin text-purple-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">Loading renewal opportunities...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rt-card p-12 text-center">
              <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Renewal Callbacks Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {searchTerm
                  ? 'No matching customer contracts found for your search criteria.'
                  : 'Great job! None of your customer contracts are expiring within the 30-day window right now.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredItems.map((item) => (
                <div
                  key={item.key}
                  className="rt-card p-4 sm:p-5 transition-all hover:border-purple-200 hover:shadow-md"
                  style={{
                    borderLeft: `4px solid ${
                      item.isExpired ? '#ef4444' : item.isUrgent ? '#f59e0b' : '#6366f1'
                    }`,
                  }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Customer Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            item.isExpired
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : item.isUrgent
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {item.isExpired
                            ? `EXPIRED (${Math.abs(item.daysRemaining)} DAYS AGO)`
                            : `${item.daysRemaining} DAYS REMAINING`}
                        </span>

                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {item.meterType === 'electricity' ? '⚡ Electricity' : '🔥 Gas'} Meter
                        </span>

                        {item.supplier && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                            Supplier: {item.supplier}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        {item.businessName}
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-1 gap-x-4 mt-2 text-xs text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5">
                          <User size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate">{item.ownerName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone size={13} className="text-slate-400 shrink-0" />
                          <a href={`tel:${item.businessPhone}`} className="hover:underline text-indigo-600 font-semibold">
                            {item.businessPhone}
                          </a>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          <span>{item.postcode}</span>
                        </div>
                      </div>

                      {item.mpanOrMprn !== 'N/A' && (
                        <div className="mt-2 text-xs text-slate-500 font-mono">
                          {item.meterType === 'electricity' ? 'MPAN' : 'MPRN'}: <span className="font-semibold text-slate-700">{item.mpanOrMprn}</span>
                        </div>
                      )}
                    </div>

                    {/* Contract End Date Card */}
                    <div className="flex items-center justify-between lg:justify-end gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
                      <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Contract End Date</p>
                        <p className="text-sm font-extrabold text-slate-800 mt-0.5 flex items-center gap-1.5">
                          <Calendar size={14} className="text-purple-600" />
                          {item.formattedEndDate}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <button
                        onClick={() => handleScheduleCallback(item)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer bg-purple-600 text-white hover:bg-purple-700 shadow-sm"
                      >
                        <Phone size={13} /> Schedule Callback
                      </button>

                      <button
                        onClick={() => handleCreateSale(item)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                      >
                        <PoundSterling size={13} /> Submit Renewal Sale
                      </button>

                      <button
                        onClick={() => navigate(`/customers/${item.customerId}`)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                      >
                        <Eye size={13} /> Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
