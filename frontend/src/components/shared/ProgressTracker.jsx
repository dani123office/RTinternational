import { Check } from 'lucide-react'

export default function ProgressTracker({ currentStatus, steps }) {
  const currentIdx = steps.findIndex((s) => s.key === currentStatus)
  const active = currentIdx >= 0 ? currentIdx : 0

  return (
    <div className="flex items-center w-full pr-1 overflow-x-auto sm:overflow-x-visible">
      {steps.map((step, i) => {
        const isCompleted = i < active
        const isCurrent = i === active
        const isLast = i === steps.length - 1
        return (
          <div key={step.key} className={`flex items-center min-w-0 ${isLast ? 'shrink-0' : 'flex-1'}`}>
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full whitespace-nowrap shrink-0"
              style={{
                background: isCurrent ? '#ede9fe' : isCompleted ? '#d1fae5' : '#f1f5f9',
              }}
            >
              {isCompleted ? (
                <div className="w-[18px] h-[18px] rounded-full bg-green-500 flex items-center justify-center">
                  <Check size={10} color="white" />
                </div>
              ) : (
                <div
                  className="w-[18px] h-[18px] rounded-full flex items-center justify-center"
                  style={{ background: isCurrent ? '#7c3aed' : '#e2e8f0' }}
                >
                  <span className="text-[0.6rem] font-bold" style={{ color: isCurrent ? 'white' : '#94a3b8' }}>{i + 1}</span>
                </div>
              )}
              <span
                className="text-[0.75rem]"
                style={{
                  fontWeight: isCurrent ? 700 : 600,
                  color: isCurrent ? '#5b21b6' : isCompleted ? '#065f46' : '#94a3b8',
                }}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className="flex-1 h-0.5 mx-1 min-w-[15px]" style={{ background: isCompleted ? '#22c55e' : '#e2e8f0' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
