import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { UploadCloud, X } from 'lucide-react'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  preview?: string | null
  accept?: string
  onClear?: () => void
}

export function FileUpload({ onFileSelect, preview, accept = 'image/*', onClear }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFileSelect(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileSelect(file)
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 transition-colors cursor-pointer ${
        dragging ? 'border-muted-foreground/50 bg-muted/50' : 'border-muted-foreground/25 bg-muted/30'
      }`}
      onClick={() => fileInputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {preview ? (
        <div className="relative">
          <img src={preview} alt="Preview" className="max-h-40 rounded-md object-contain" />
          {onClear && (
            <button
              className="absolute -top-2 -right-2 rounded-full bg-background border p-0.5 hover:bg-muted"
              onClick={(e) => { e.stopPropagation(); onClear() }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <>
          <UploadCloud className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Klik untuk pilih</span> atau drag & drop
          </p>
        </>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
