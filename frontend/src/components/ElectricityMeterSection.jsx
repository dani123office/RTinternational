import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

export default function ElectricityMeterSection({ meters, onUpdate, onAdd, onRemove }) {
  const updateMeter = (idx, field, value) => {
    const updated = meters.map((m, i) => (i === idx ? { ...m, [field]: value } : m))
    onUpdate(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800">Electricity Details</h3>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add Meter
        </Button>
      </div>
      {meters.map((meter, idx) => (
        <Card key={idx} className="border border-amber-200 bg-amber-50/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm text-amber-800">Meter {idx + 1}</span>
              {meters.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => onRemove(idx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div><Label>Current Supplier</Label><Input value={meter.currentSupplier || ''} onChange={(e) => updateMeter(idx, 'currentSupplier', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>MPAN / Supply Number</Label><Input value={meter.supplyNumber || ''} onChange={(e) => updateMeter(idx, 'supplyNumber', e.target.value)} placeholder="e.g. 04 1234 5678 901" /></div>
              <div><Label>MSN (Meter Serial No)</Label><Input value={meter.meterSerial || ''} onChange={(e) => updateMeter(idx, 'meterSerial', e.target.value)} placeholder="e.g. 12A3456789" /></div>
            </div>
            <div><Label>Account Number</Label><Input value={meter.accountNumber || ''} onChange={(e) => updateMeter(idx, 'accountNumber', e.target.value)} placeholder="e.g. AC12345678" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Day Unit Rate (p/kWh)</Label><Input type="number" step="0.01" value={meter.dayUnitRate || ''} onChange={(e) => updateMeter(idx, 'dayUnitRate', e.target.value)} /></div>
              <div><Label>Night Unit Rate (p/kWh)</Label><Input type="number" step="0.01" value={meter.nightUnitRate || ''} onChange={(e) => updateMeter(idx, 'nightUnitRate', e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Evening Unit Rate (p/kWh)</Label><Input type="number" step="0.01" value={meter.eveningUnitRate || ''} onChange={(e) => updateMeter(idx, 'eveningUnitRate', e.target.value)} /></div>
              <div><Label>Standing Rate (p/day)</Label><Input type="number" step="0.01" value={meter.standingRate || ''} onChange={(e) => updateMeter(idx, 'standingRate', e.target.value)} /></div>
            </div>
            <div><Label>Monthly Bill (£)</Label><Input type="number" step="0.01" value={meter.monthlyBill || ''} onChange={(e) => updateMeter(idx, 'monthlyBill', e.target.value)} /></div>
            <div><Label>Contract End Date</Label><Input type="date" value={meter.contractEndDate || ''} onChange={(e) => updateMeter(idx, 'contractEndDate', e.target.value)} /></div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
