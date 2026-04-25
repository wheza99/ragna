interface StatsCardProps {
  value: string | number
  label: string
  className?: string
}

export function StatsCard({ value, label, className = '' }: StatsCardProps) {
  return (
    <div className="rounded-md border px-4 py-3 flex-1 text-center">
      <p className={`text-2xl font-bold ${className}`}>{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
