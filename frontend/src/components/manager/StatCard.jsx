import { useEffect, useState, useRef } from 'react'

export default function StatCard({ icon: Icon, label, value, accent, subtext, progress }) {
  const [displayValue, setDisplayValue] = useState(0)
  const ref = useRef(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (typeof value === 'string') {
      Promise.resolve().then(() => setDisplayValue(value))
      return
    }
    const animateValue = () => {
      const target = value || 0
      const duration = 1000
      const steps = 30
      const increment = target / steps
      let current = 0
      const timer = setInterval(() => {
        current += increment
        if (current >= target) {
          setDisplayValue(target)
          clearInterval(timer)
        } else {
          setDisplayValue(Math.floor(current))
        }
      }, duration / steps)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          animateValue()
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value])

  return (
    <div
      ref={ref}
      className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-slate-200/60 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[0.78rem] text-slate-500 font-medium mb-1">{label}</p>
          <h3 className="text-[1.75rem] font-bold text-slate-900 tracking-tight leading-tight">
            {displayValue}
          </h3>
          {subtext && (
            <p className="text-[0.72rem] text-slate-400 mt-1">{subtext}</p>
          )}
        </div>
        <div
          className="w-[42px] h-[42px] rounded-xl flex items-center justify-center shrink-0 opacity-90"
          style={{ background: accent || 'linear-gradient(135deg, #6366f1, #3b82f6)' }}
        >
          <Icon size={18} color="white" />
        </div>
      </div>
      {progress !== undefined && (
        <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-in-out"
            style={{
              width: `${Math.min(progress, 100)}%`,
              background: accent || 'linear-gradient(135deg, #6366f1, #3b82f6)',
            }}
          />
        </div>
      )}
    </div>
  )
}
