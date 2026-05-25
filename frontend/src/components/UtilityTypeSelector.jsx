import { Bolt, Flame, Gauge } from 'lucide-react'

const types = [
  { value: 'electricity', label: 'Electricity', icon: Bolt, color: 'text-amber-500' },
  { value: 'gas', label: 'Gas', icon: Flame, color: 'text-blue-500' },
  { value: 'both', label: 'Dual Fuel', icon: Gauge, color: 'text-purple-500' },
]

export default function UtilityTypeSelector({ value, onChange }) {
  return (
    <div className="flex gap-2 mb-4">
      {types.map((type) => {
        const Icon = type.icon
        const isSelected = value === type.value
        return (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 ${
              isSelected
                ? 'bg-blue-600 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Icon className={`inline-block h-4 w-4 mr-1.5 ${type.color}`} />
            {type.label}
          </button>
        )
      })}
    </div>
  )
}
