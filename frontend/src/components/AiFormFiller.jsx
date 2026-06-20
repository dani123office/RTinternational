import { useState } from 'react'
import api from '@/lib/api'
import { endpoints } from '@/lib/api'
import { useToast } from '@/components/ui/toastContext'
import { Sparkles, Loader2, Zap } from 'lucide-react'

export default function AiFormFiller({ onFill }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()

  const handleExtract = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await api.post(endpoints.ai.extract, { text: text.trim() })
      const data = res.data
      if (data.error) {
        setError(data.error)
        return
      }
      if (data.warnings?.length) {
        const msg = data.warnings.join('. ')
        setError(msg)
        toast(msg, 'warning')
      }
      onFill(data)
      setText('')
      if (!data.warnings?.length) {
        toast('Form auto-filled successfully', 'success')
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Extraction failed. Please try again.'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="rounded-xl border overflow-hidden transition-all duration-200"
      style={{
        borderColor: '#e0e7ff',
        background: 'linear-gradient(135deg, #f5f3ff 0%, #eef2ff 100%)',
      }}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: '#e0e7ff' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)' }}>
          <Sparkles size={14} color="white" />
        </div>
        <span className="text-sm font-semibold text-indigo-700">AI Assistant</span>
      </div>
      <div className="p-4 space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste energy broker notes here to auto-fill the form..."
          rows={3}
          className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-none transition-all"
        />
        {error && (
          <p className="text-xs text-rose-600 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-rose-500" />
            {error}
          </p>
        )}
        <button
          onClick={handleExtract}
          disabled={loading || !text.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-none text-white text-sm font-semibold cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)' }}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Zap size={16} />
          )}
          {loading ? 'Extracting...' : 'Auto-Fill Form'}
        </button>
      </div>
    </div>
  )
}
