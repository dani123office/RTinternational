import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

export default function GasMeterSection({ meters, onUpdate, onAdd, onRemove }) {
  const updateMeter = (idx, field, value) => {
    const updated = meters.map((m, i) => (i === idx ? { ...m, [field]: value } : m))
    onUpdate(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800">Gas Details</h3>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add Meter
        </Button>
      </div>
      {meters.map((meter, idx) => (
        <Card key={idx} className="border border-blue-200 bg-blue-50/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm text-blue-800">Meter {idx + 1}</span>
              {meters.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => onRemove(idx)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div><Label>Current Supplier</Label><Input value={meter.currentSupplier || ''} onChange={(e) => updateMeter(idx, 'currentSupplier', e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Unit Rate (p/kWh)</Label><Input type="number" step="0.01" value={meter.unitRate || ''} onChange={(e) => updateMeter(idx, 'unitRate', e.target.value)} /></div>
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
