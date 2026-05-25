export default function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className="flex-1 h-4 rounded-md rt-shimmer"
              style={{
                background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
                backgroundSize: '200% 100%',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
