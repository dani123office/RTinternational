import { Calendar, Clock, User } from 'lucide-react'
import StatusBadge from '@/components/shared/StatusBadge'
import { formatDate, formatTime } from '@/lib/formatters'

export default function CallbackHero({ callback, customer }) {
  if (!callback || !customer) return null

  const scheduledDate = callback.scheduledDateTime || callback.scheduledDate

  return (
    <div
      style={{
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
        color: '#ffffff',
        position: 'relative',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px' // Creates clean space between badges, title, and footer
      }}
    >
      {/* 1. TOP ROW: Badges Container */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'inline-flex' }}>
          <StatusBadge status={callback.status} type="callback" />
        </div>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '9999px',
            padding: '4px 12px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          {customer.utilityType || 'Electricity'}
        </span>
      </div>

      {/* 2. MIDDLE ROW: Main Business Text Block */}
      <div style={{ marginTop: '4px' }}>
        <h2
          style={{
            fontSize: '28px',
            fontWeight: 800,
            letterSpacing: '-0.025em',
            margin: '0 0 6px 0',
            lineHeight: '1.2'
          }}
        >
          {customer.businessName || 'Unknown Business'}
        </h2>
        <p
          style={{
            color: 'rgba(219, 234, 254, 0.9)',
            fontSize: '15px',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <User size={15} style={{ opacity: 0.8 }} />
          {customer.ownerName || 'No Contact Person'}
        </p>
      </div>

      {/* 3. BOTTOM ROW: Date & Time Info Strip */}
      {scheduledDate && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '16px',
            marginTop: '8px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'rgba(243, 244, 246, 0.9)'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.08)', padding: '6px 12px', borderRadius: '8px' }}>
            <Calendar size={15} style={{ color: '#93c5fd' }} />
            {formatDate(scheduledDate)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.08)', padding: '6px 12px', borderRadius: '8px' }}>
            <Clock size={15} style={{ color: '#93c5fd' }} />
            {formatTime(scheduledDate)}
          </span>
        </div>
      )}
    </div>
  )
}
