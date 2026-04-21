export function ProgressBar({ porcentaje, colorClass = 'bg-primary-500', height = 'h-2' }) {
  const pct = Math.min(100, Math.max(0, porcentaje))
  return (
    <div className={`w-full bg-white/10 rounded-full ${height} overflow-hidden`}>
      <div
        className={`${height} rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
