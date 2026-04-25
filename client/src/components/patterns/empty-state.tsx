import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  search?: string
}

export function EmptyState({ icon: Icon, title, description, search }: EmptyStateProps) {
  return (
    <div className="text-center py-12 text-muted-foreground border rounded-md">
      {search ? (
        <>
          <Icon className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Tidak ada {title} yang cocok dengan "{search}"</p>
        </>
      ) : (
        <>
          <Icon className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Belum ada {title}.</p>
          {description && <p className="text-sm mt-1">{description}</p>}
        </>
      )}
    </div>
  )
}
