import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Percent } from 'lucide-react'

export default function NonCommissionRateCard({ title, rates, onUpdate, type = 'electricity' }) {
  const handleChange = (field, value) => {
    onUpdate({ ...rates, [field]: value })
  }

  return (
    <Card className="border-orange-200 bg-orange-50/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-orange-700 font-semibold text-sm">
          <Percent className="h-4 w-4" />
          {title}
        </div>
        {type === 'electricity' ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Day Unit Rate (p/kWh)</Label><Input type="number" step="0.01" value={rates.dayUnitRate || ''} onChange={(e) => handleChange('dayUnitRate', e.target.value)} /></div>
              <div><Label>Night Unit Rate (p/kWh)</Label><Input type="number" step="0.01" value={rates.nightUnitRate || ''} onChange={(e) => handleChange('nightUnitRate', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Evening Unit Rate (p/kWh)</Label><Input type="number" step="0.01" value={rates.eveningUnitRate || ''} onChange={(e) => handleChange('eveningUnitRate', e.target.value)} /></div>
              <div><Label>Standing Rate (p/day)</Label><Input type="number" step="0.01" value={rates.standingRate || ''} onChange={(e) => handleChange('standingRate', e.target.value)} /></div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Unit Rate (p/kWh)</Label><Input type="number" step="0.01" value={rates.unitRate || ''} onChange={(e) => handleChange('unitRate', e.target.value)} /></div>
            <div><Label>Standing Rate (p/day)</Label><Input type="number" step="0.01" value={rates.standingRate || ''} onChange={(e) => handleChange('standingRate', e.target.value)} /></div>
          </div>
        )}
        <div><Label>Broker Service Charge (£)</Label><Input type="number" step="0.01" value={rates.brokerServiceCharge || ''} onChange={(e) => handleChange('brokerServiceCharge', e.target.value)} /></div>
      </CardContent>
    </Card>
  )
}
