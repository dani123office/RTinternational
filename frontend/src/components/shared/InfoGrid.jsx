export default function InfoGrid({ items, columns = 2 }) {
  return (
    <div
      className="grid gap-4 text-[0.85rem]"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {items.map((item, i) => {
        if (!item) return null
        const { label, value, span } = item
        if (value === null || value === undefined || value === '') return null
        return (
          <div key={i} style={span ? { gridColumn: `span ${span}` } : {}}>
            <span className="text-gray-500">{label}</span>
            <p className="font-semibold text-gray-900 mt-0.5">{value}</p>
          </div>
        )
      })}
    </div>
  )
}
