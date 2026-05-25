import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ size = 24, color = '#6366f1', text, fullPage }) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className="animate-spin" size={size} color={color} />
      {text && <p className="text-slate-400 text-[0.85rem]">{text}</p>}
    </div>
  )
  if (fullPage) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">{content}</div>
  }
  return <div className="py-12 flex justify-center">{content}</div>
}
