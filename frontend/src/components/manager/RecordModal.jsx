import { X } from 'lucide-react'

export default function RecordModal({ isOpen, onClose, title, children, onSave, saveLabel = 'Save' }) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-[90%] max-w-[520px] max-h-[85vh] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border-0 bg-slate-50 text-slate-400 cursor-pointer flex items-center justify-center hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
        {onSave && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
            <button onClick={onClose} className="rt-btn-outline text-sm">Cancel</button>
            <button onClick={onSave} className="rt-btn-primary text-sm">{saveLabel}</button>
          </div>
        )}
      </div>
    </div>
  )
}
