import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FileUp, Upload, X } from 'lucide-react'

import { useAppShell } from '../context'
import { ICON_SM_CLASS } from '../lib/class-names'

interface ImportDialogProps {
  open: boolean
  onClose: () => void
}

/**
 * 统一导入对话框（仅 importExport 能力 available 时由 NiceNoteApp 渲染）。
 * 解析与落库交给 runtime.system.importMarkdownFiles（平台实现，Web=localStorage）。
 */
export function ImportDialog({ open, onClose }: ImportDialogProps) {
  if (!open) return null
  return <ImportDialogInner onClose={onClose} />
}

function ImportDialogInner({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const { importMarkdownFiles } = useAppShell()
  const [files, setFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const mdFiles = Array.from(fileList).filter(
      (f) => f.name.endsWith('.md') || f.name.endsWith('.markdown')
    )
    setFiles((prev) => [...prev, ...mdFiles])
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      addFiles(e.dataTransfer.files)
    },
    [addFiles]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(e.target.files)
    },
    [addFiles]
  )

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleImportAll = useCallback(async () => {
    if (!importMarkdownFiles) return
    setImporting(true)
    try {
      await importMarkdownFiles(files)
      onClose()
    } finally {
      setImporting(false)
    }
  }, [files, importMarkdownFiles, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label={t('import.title')}
        className="relative w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('import.title')}</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <X className={ICON_SM_CLASS} />
          </button>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <Upload className="mx-auto mb-2 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('import.dropzone')}</p>
          <p className="mt-1 text-xs text-muted-foreground/60">{t('import.acceptedFormats')}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {files.length > 0 && (
          <div className="mt-4 max-h-48 space-y-1 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent/50"
              >
                <FileUp className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setFiles([])}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              {t('import.clearAll')}
            </button>
            <button
              onClick={() => void handleImportAll()}
              disabled={importing}
              className="rounded-md bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {importing ? t('import.importing') : t('import.importCount', { count: files.length })}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
