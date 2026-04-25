import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface ConfigFieldProps {
  label: string
  value: string | null
  full?: boolean
  copy?: boolean
}

export function ConfigField({ label, value, full = false, copy = false }: ConfigFieldProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!value) return
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`space-y-1 ${full ? 'col-span-2' : ''}`}>
      <Label className="text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={value || '-'} className="font-mono text-sm" />
        {copy && (
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  )
}
