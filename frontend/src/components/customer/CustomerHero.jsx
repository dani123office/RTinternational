import { Building2, MapPin } from 'lucide-react'
import { formatDate } from '@/lib/formatters'

const FALLBACK_DATE = new Date().toISOString()

export default function CustomerHero({ customer }) {
  if (!customer) return null

  return (
    <div
      style={{
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}
    >
      {/* Decorative background glow */}
      <div
        style={{
          position: 'absolute',
          top: '-32px',
          right: '-32px',
          width: '192px',
          height: '192px',
          borderRadius: '50%',
          opacity: 0.15,
          background: 'radial-gradient(circle, #ffffff, transparent)',
          filter: 'blur(40px)',
          pointerEvents: 'none'
        }}
      />
      
      {/* Content wrapper */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Top row: Utility Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            {customer.utilityType}
          </span>
        </div>
        
        {/* Middle row: Customer business info */}
        <div>
          <h2
            style={{
              fontSize: '28px',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              margin: '0 0 6px 0',
              lineHeight: '1.2'
            }}
          >
            {customer.businessName || 'Unknown'}
          </h2>
          <p
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '15px',
              margin: 0
            }}
          >
            {customer.ownerName}
          </p>

          {customer.businessAddress && (
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '13px',
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                margin: '6px 0 0 0'
              }}
            >
              <MapPin size={12} style={{ opacity: 0.8 }} /> 
              {customer.businessAddress}
              {customer.postcode && !customer.businessAddress?.toUpperCase().includes(customer.postcode.toUpperCase())
                ? `, ${customer.postcode}`
                : ''}
            </p>
          )}
        </div>

        {/* Bottom row: Created date */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '8px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.8)'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={16} /> 
            Created {formatDate(customer.createdAt || FALLBACK_DATE)}
          </span>
        </div>
      </div>
    </div>
  )
}
