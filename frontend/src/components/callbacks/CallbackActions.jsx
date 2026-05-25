import { Calendar, Edit, ArrowLeftRight, X, Trash2, Loader2 } from 'lucide-react'

export default function CallbackActions({ 
  callback, 
  converting,
  onConvert,
  convertLabel = 'Convert to Transfer',
  onNotInterested,
  onReschedule,
  onEdit,
  onDelete
}) {
  const isDone = callback?.status === 'done'

  return (
    <div
      style={{
        backgroundColor: '#f8fafc', // Light slate background for contrast
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '16px 20px',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)', // Elegant drop shadow
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginTop: '32px'
      }}
    >

      {/* LEFT SIDE: Isolated Red Destructive Button Group */}
      <div>
        <button
          type="button"
          onClick={onDelete}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: '#fff1f2', // Soft red pill background
            color: '#e11d48', // Vibrant crimson
            border: '1px solid #ffe4e6',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => { e.target.style.backgroundColor = '#ffe4e6'; e.target.style.borderColor = '#fecdd3'; }}
          onMouseLeave={(e) => { e.target.style.backgroundColor = '#fff1f2'; e.target.style.borderColor = '#ffe4e6'; }}
        >
          <Trash2 size={16} />
          Delete Record
        </button>
      </div>

      {/* RIGHT SIDE: Operational Management Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        {!isDone && (
          <>
            {/* Not Interested Button */}
            <button
              type="button"
              onClick={onNotInterested}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#f8fafc'; e.target.style.borderColor = '#94a3b8'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#ffffff'; e.target.style.borderColor = '#cbd5e1'; }}
            >
              <X size={16} style={{ color: '#94a3b8' }} />
              Not Interested
            </button>

            {/* Reschedule Button */}
            <button
              type="button"
              onClick={onReschedule}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#f8fafc'; e.target.style.borderColor = '#94a3b8'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#ffffff'; e.target.style.borderColor = '#cbd5e1'; }}
            >
              <Calendar size={16} style={{ color: '#94a3b8' }} />
              Reschedule
            </button>

            {/* Edit Info Button */}
            <button
              type="button"
              onClick={onEdit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#f8fafc'; e.target.style.borderColor = '#94a3b8'; }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#ffffff'; e.target.style.borderColor = '#cbd5e1'; }}
            >
              <Edit size={16} style={{ color: '#94a3b8' }} />
              Edit Info
            </button>

            {/* Convert to Transfer Primary Button */}
            <button
              type="button"
              onClick={onConvert}
              disabled={converting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: '#4f46e5', // Deep rich indigo solid color
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(79, 70, 229, 0.25)', // Premium purple shadow glow
                opacity: converting ? 0.7 : 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { if(!converting) e.target.style.backgroundColor = '#4338ca'; }}
              onMouseLeave={(e) => { if(!converting) e.target.style.backgroundColor = '#4f46e5'; }}
            >
              {converting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowLeftRight size={16} />}
              {convertLabel}
            </button>
          </>
        )}
      </div>

    </div>
  )
}
