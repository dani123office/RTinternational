import { Check, Edit3, PhoneCall, Trash2, X } from 'lucide-react'

export default function TransferActions({ 
  transfer, 
  onMarkAsSale, 
  onScheduleCallback, 
  onDelete,
  onEdit,
  onNotInterested,
}) {
  const isSaleComplete = transfer?.status === 'saleComplete' || transfer?.status === 'not_interested'

  return (
    <div
      style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '16px 20px',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginTop: '32px'
      }}
    >
      {/* LEFT: Delete */}
      <div>
        <button
          type="button"
          onClick={onDelete}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: '#fff1f2',
            color: '#e11d48',
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

      {/* RIGHT: Actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
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
          <Edit3 size={16} style={{ color: '#94a3b8' }} />
          Edit Details
        </button>

        {!isSaleComplete && (
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
        )}

        {!isSaleComplete && (
          <button
            type="button"
            onClick={onScheduleCallback}
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
            <PhoneCall size={16} style={{ color: '#94a3b8' }} />
            Schedule Callback
          </button>
        )}

        {!isSaleComplete && (
          <button
            type="button"
            onClick={onMarkAsSale}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(79, 70, 229, 0.25)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.target.style.backgroundColor = '#4338ca'; }}
            onMouseLeave={(e) => { e.target.style.backgroundColor = '#4f46e5'; }}
          >
            <Check size={16} />
            Mark as Sale
          </button>
        )}
      </div>
    </div>
  )
}
