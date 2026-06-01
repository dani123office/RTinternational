import { useEffect, useRef, useState } from 'react'

const animateValue = (target, setDisplay) => {
  const steps = 30
  const inc = target / steps
  let cur = 0
  const t = setInterval(() => {
    cur += inc
    if (cur >= target) { setDisplay(target); clearInterval(t) }
    else setDisplay(Math.floor(cur))
  }, 1000 / steps)
}

export default function StatCard({ icon: Icon, label, value, accent, subtext, progress, onClick }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  const done = useRef(null)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true
        animateValue(Number(value) || 0, setDisplay)
      }
    }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [value])

  return (
    <div
      ref={ref}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
      className={`bg-white/85 backdrop-blur-md rounded-2xl p-5 border border-slate-200/60 shadow-sm transition-all duration-200 hover:-translate-y-0.5 ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[0.76rem] text-slate-500 font-medium mb-1">{label}</p>
          <h3 className="text-[1.75rem] font-bold text-slate-900 tracking-tight leading-tight">
            {typeof value === 'string' ? value : display}
          </h3>
          {subtext && <p className="text-[0.7rem] text-slate-400 mt-0.5">{subtext}</p>}
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
            className="h-full rounded-full transition-all duration-1000"
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
