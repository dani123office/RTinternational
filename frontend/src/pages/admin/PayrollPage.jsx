import { useEffect, useState } from 'react'
import api, { endpoints } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { APP_STYLES } from '@/lib/styles'
import { FileText, DollarSign, Search } from 'lucide-react'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - 3 + i)

export default function PayrollPage() {
  const { user } = useAuthStore()
  const [agents, setAgents] = useState([])
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [year, setYear] = useState(String(CURRENT_YEAR))
  const [commission, setCommission] = useState('0.00')
  const [loanDeduction, setLoanDeduction] = useState('0.00')
  const [loading, setLoading] = useState(false)
  const [agentsLoading, setAgentsLoading] = useState(true)

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    setAgentsLoading(true)
    try {
      const res = await api.get(endpoints.admin.agents)
      const list = Array.isArray(res.data) ? res.data : res.data?.items || res.data?.agents || []
      setAgents(list)
      if (list.length > 0 && !selectedAgentId) {
        setSelectedAgentId(String(list[0].id))
      }
    } catch { }
    setAgentsLoading(false)
  }

  const handleGenerate = async () => {
    if (!selectedAgentId) return
    setLoading(true)
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      const params = new URLSearchParams({
        month,
        year,
        commission,
        loan_deduction: loanDeduction,
      })
      const res = await fetch(`/api/admin/salary/slip/${selectedAgentId}?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'Salary_Slip.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch { }
    setLoading(false)
  }

  const selectedAgent = agents.find(a => String(a.id) === selectedAgentId)

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="rt-fade" style={{ marginBottom: '28px' }}>
            <h1 className="rt-page-title">Payroll &amp; Salary Slips</h1>
            <p className="rt-page-subtitle">Generate and print employee salary slips.</p>
          </div>

          <div className="rt-card-flat rt-fade">
            <div className="p-6">
              <h2 className="text-base font-bold mb-5" style={{ color: '#0f172a' }}>
                <FileText size={18} className="inline mr-2" style={{ color: '#6366f1' }} />
                Generate Salary Slip
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>
                    Employee
                  </label>
                  <select
                    value={selectedAgentId}
                    onChange={e => setSelectedAgentId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm font-medium border"
                    style={{
                      background: '#ffffff',
                      borderColor: '#e2e8f0',
                      color: '#0f172a',
                    }}
                    disabled={agentsLoading}
                  >
                    {agentsLoading && <option value="">Loading...</option>}
                    {!agentsLoading && agents.length === 0 && <option value="">No agents found</option>}
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>
                    Month
                  </label>
                  <select
                    value={month}
                    onChange={e => setMonth(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm font-medium border"
                    style={{ background: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' }}
                  >
                    {MONTHS.map((name, i) => (
                      <option key={i + 1} value={i + 1}>{name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#64748b' }}>
                    Year
                  </label>
                  <select
                    value={year}
                    onChange={e => setYear(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm font-medium border"
                    style={{ background: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' }}
                  >
                    {YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
                      Commission
                    </label>
                    <span className="text-[10px] font-normal normal-case" style={{ color: '#94a3b8' }}>(Optional)</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={commission}
                    onChange={e => setCommission(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm font-medium border"
                    style={{ background: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' }}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
                      Loan Deduction
                    </label>
                    <span className="text-[10px] font-normal normal-case" style={{ color: '#94a3b8' }}>(Optional)</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={loanDeduction}
                    onChange={e => setLoanDeduction(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm font-medium border"
                    style={{ background: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                {selectedAgent && (
                  <div className="text-xs font-medium" style={{ color: '#64748b' }}>
                    Monthly Salary: <span className="font-bold" style={{ color: '#0f172a' }}>Rs. {selectedAgent.monthlySalary?.toLocaleString() || '0'}</span>
                  </div>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={loading || !selectedAgentId}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 ml-auto"
                  style={{
                    background: loading ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: '#ffffff',
                    border: 'none',
                    boxShadow: loading ? 'none' : '0 2px 8px rgba(99,102,241,0.3)',
                    opacity: loading || !selectedAgentId ? 0.6 : 1,
                  }}
                >
                  <DollarSign size={16} />
                  {loading ? 'Generating...' : 'Generate Salary Slip'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
