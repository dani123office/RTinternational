import { APP_STYLES } from '@/lib/styles'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Building2, Zap, FileText, Loader2, Save, Calendar as CalendarIcon, Clock } from 'lucide-react'
import { useTransferForm } from '@/hooks/useTransferForm'
import { Switch } from '@/components/ui/switch'
import UtilityTypeSelector from '@/components/UtilityTypeSelector'
import ElectricityMeterSection from '@/components/ElectricityMeterSection'
import GasMeterSection from '@/components/GasMeterSection'
import AiFormFiller from '@/components/AiFormFiller'

function Card({ icon: Icon, title, headerRight, children, delay }) {
  return (
    <div className={`rt-card rt-fade ${delay || ''}`}>
      <div className="rt-card-header">
        <div className="rt-card-header-left">
          <div className="rt-card-icon">
            <Icon size={16} />
          </div>
          <span className="rt-card-title">{title}</span>
        </div>
        {headerRight}
      </div>
      <div className="rt-card-body">{children}</div>
    </div>
  )
}

function Field({ label, required, icon: Icon, children }) {
  return (
    <div>
      <label className="rt-label">{label}{required && <span className="rt-required">*</span>}</label>
      <div style={{ position: 'relative', width: '100%' }}>
        {Icon && (
          <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
            <Icon size={15} />
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export default function AddTransfer() {
  const navigate = useNavigate()
  const location = useLocation()
  const { form, isLoading, setField, handleAiFill, handleSubmit, addElectricityMeter, removeElectricityMeter, addGasMeter, removeGasMeter } = useTransferForm(location.state, navigate)

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="rt-page">
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button className="rt-back-btn" onClick={() => navigate('/transfers')}>
                <ArrowLeft size={17} />
              </button>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', margin: 0 }}>
                  Add Transfer
                </h1>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '3px 0 0', fontFamily: "'DM Sans',sans-serif" }}>
                  Fill in the details to create a new transfer record
                </p>
              </div>
            </div>
            <AiFormFiller onFill={handleAiFill} />
          </div>

          <form onSubmit={handleSubmit} className="rt-section-gap">

            <Card icon={Building2} iconColor="#6366f1" iconBg="rgba(99,102,241,0.15)" title="Business Information" delay="rt-d1">
              <div className="rt-grid2">
                <div className="rt-span2">
                  <Field label="Business Name" required>
                    <input className="rt-input" placeholder="e.g. Acme Corp Ltd" value={form.businessName} onChange={(e) => setField('businessName', e.target.value)} />
                  </Field>
                </div>
                <div className="rt-span2">
                  <Field label="Business Phone" required>
                    <input className="rt-input" placeholder="e.g. 01234 567890" value={form.businessPhone} onChange={(e) => setField('businessPhone', e.target.value)} />
                  </Field>
                </div>
                <div className="rt-span2">
                  <Field label="Business Address" required>
                    <input className="rt-input" placeholder="e.g. 123 High Street, London, EC1A 1BB" value={form.businessAddress} onChange={(e) => setField('businessAddress', e.target.value)} />
                  </Field>
                </div>
                <div className="rt-span2">
                  <Field label="Postcode" required>
                    <input className="rt-input" placeholder="e.g. SW1A 1AA" value={form.postcode} onChange={(e) => setField('postcode', e.target.value.toUpperCase())} />
                  </Field>
                </div>
                <div className="rt-span2">
                  <Field label="Owner Name">
                    <input className="rt-input" placeholder="e.g. John Smith" value={form.ownerName} onChange={(e) => setField('ownerName', e.target.value)} />
                  </Field>
                </div>
                <div className="rt-span2">
                  <Field label="Owner Direct Phone">
                    <input className="rt-input" placeholder="e.g. 07712 345678" value={form.ownerPhone} onChange={(e) => setField('ownerPhone', e.target.value)} />
                  </Field>
                </div>
                <div className="rt-span2">
                  <Field label="Email">
                    <input className="rt-input" type="email" placeholder="e.g. info@acmecorp.com" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                  </Field>
                </div>
              </div>
            </Card>

            <Card icon={Zap} iconColor="#22c55e" iconBg="rgba(34,197,94,0.15)" title="Meter Details" delay="rt-d2">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <UtilityTypeSelector value={form.utilityType} onChange={(v) => setField('utilityType', v)} />
                {(form.utilityType === 'electricity' || form.utilityType === 'both') && (
                  <ElectricityMeterSection meters={form.elecMeters} onUpdate={(v) => setField('elecMeters', v)} onAdd={addElectricityMeter} onRemove={removeElectricityMeter} />
                )}
                {(form.utilityType === 'gas' || form.utilityType === 'both') && (
                  <GasMeterSection meters={form.gasMeters} onUpdate={(v) => setField('gasMeters', v)} onAdd={addGasMeter} onRemove={removeGasMeter} />
                )}
              </div>
            </Card>



            <Card icon={CalendarIcon} iconColor="#f59e0b" iconBg="rgba(245,158,11,0.15)" title="Schedule as Call Back" delay="rt-d4"
              headerRight={
                <div className="rt-toggle-row">
                  <span className="rt-toggle-label">Enable</span>
                  <Switch checked={form.scheduleAsCallback} onCheckedChange={(v) => setField('scheduleAsCallback', v)} />
                </div>
              }
            >
              {form.scheduleAsCallback ? (
                <div className="rt-grid2">
                  <div>
                    <Field label="Date" icon={CalendarIcon}>
                      <input className="rt-input" style={{ paddingLeft: '38px' }} type="date" value={form.scheduledDate} onChange={(e) => setField('scheduledDate', e.target.value)} />
                    </Field>
                  </div>
                  <div>
                    <Field label="Time" icon={Clock}>
                      <input className="rt-input" style={{ paddingLeft: '38px' }} type="time" value={form.scheduledTime} onChange={(e) => setField('scheduledTime', e.target.value)} />
                    </Field>
                  </div>
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '13.5px', margin: 0, fontStyle: 'italic' }}>
                  Enable to schedule a callback for this transfer.
                </p>
              )}
            </Card>

            <Card icon={FileText} iconColor="#f59e0b" iconBg="rgba(245,158,11,0.15)" title="Notes" delay="rt-d5">
              <Field label="Notes">
                <textarea className="rt-textarea" rows={4} placeholder="Any additional notes about this transfer..." value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
              </Field>
            </Card>

            <div className="rt-actions">
              <button type="submit" className="rt-btn-primary" disabled={isLoading}>
                {isLoading
                  ? <><Loader2 size={16} className="rt-spin" /> Saving…</>
                  : <><Save size={16} /> Save Transfer</>
                }
              </button>
            </div>

          </form>
        </div>
      </div>
    </>
  )
}

