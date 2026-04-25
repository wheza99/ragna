import { Badge } from '@/components/ui/badge'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

interface StatusConfig {
  label: string
  variant: BadgeVariant
  className?: string
}

interface StatusBadgeProps {
  status: string | null
  config: Record<string, StatusConfig>
  defaultKey?: string
}

export function StatusBadge({ status, config, defaultKey = 'draft' }: StatusBadgeProps) {
  const key = status || defaultKey
  const c = config[key] || config[defaultKey]
  return (
    <Badge variant={c.variant} className={`text-xs ${c.className || ''}`}>
      {c.label}
    </Badge>
  )
}
