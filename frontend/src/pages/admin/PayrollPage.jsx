import { useEffect, useState, useCallback } from 'react'
import api, { endpoints } from '@/lib/api'
import { APP_STYLES } from '@/lib/styles'
import { FileText, DollarSign, Mail, Download, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toastContext'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - 3 + i)

export default function PayrollPage() {
  const [agents, setAgents] = useState([])
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [month, setMonth] = useState(String(new Date().getMonth() + 1))
  const [year, setYear] = useState(String(CURRENT_YEAR))
  const [commission, setCommission] = useState('0.00')
  const [loanDeduction, setLoanDeduction] = useState('0.00')
  const [loading, setLoading] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const [agentsLoading, setAgentsLoading] = useState(true)
  const { toast } = useToast()

  const loadAgents = useCallback(async () => {
    setAgentsLoading(true)
    try {
      const res = await api.get(endpoints.admin.agents)
      const list = Array.isArray(res.data) ? res.data : res.data?.items || res.data?.agents || []
      setAgents(list)
      if (list.length > 0 && !selectedAgentId) {
        setSelectedAgentId(String(list[0].id))
      }
    } catch (err) { console.error(err) }
    setAgentsLoading(false)
  }, [selectedAgentId])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAgents()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadAgents])

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
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.detail || 'Failed to generate slip')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Salary_Slip_${MONTHS[Number(month) - 1]}_${year}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast('Salary slip downloaded successfully', 'success')
    } catch (err) {
      toast(err.message || 'Failed to download slip', 'error')
    }
    setLoading(false)
  }

  const handleEmail = async () => {
    if (!selectedAgentId) return
    setEmailing(true)
    try {
      const res = await api.post(endpoints.salary.emailSlip(selectedAgentId), null, {
        params: {
          month,
          year,
          commission,
          loan_deduction: loanDeduction,
        },
      })
      toast(res.data?.message || 'Salary slip emailed successfully', 'success')
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || 'Failed to email salary slip', 'error')
    } finally {
      setEmailing(false)
    }
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

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                {selectedAgent && (
                  <div className="text-xs font-medium" style={{ color: '#64748b' }}>
                    Monthly Salary: <span className="font-bold" style={{ color: '#0f172a' }}>Rs. {selectedAgent.monthlySalary?.toLocaleString() || '0'}</span>
                    {selectedAgent.email && <span className="text-[11px] text-slate-400 block mt-0.5">Email: {selectedAgent.email}</span>}
                  </div>
                )}
                <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
                  <button
                    type="button"
                    onClick={handleEmail}
                    disabled={emailing || !selectedAgentId || !selectedAgent?.email}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200"
                    style={{
                      background: '#ffffff',
                      color: '#4f46e5',
                      border: '1.5px solid #e0e7ff',
                      opacity: emailing || !selectedAgentId || !selectedAgent?.email ? 0.6 : 1,
                    }}
                  >
                    {emailing ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                    {emailing ? 'Sending Email...' : 'Email Slip to Employee'}
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={loading || !selectedAgentId}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200"
                    style={{
                      background: loading ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                      color: '#ffffff',
                      border: 'none',
                      boxShadow: loading ? 'none' : '0 2px 8px rgba(99,102,241,0.3)',
                      opacity: loading || !selectedAgentId ? 0.6 : 1,
                    }}
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    {loading ? 'Generating PDF...' : 'Download PDF Slip'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
