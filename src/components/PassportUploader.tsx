import { useCallback, useRef, useState } from 'react'
import { Upload, Camera, FileImage, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { formatBytes, validateUploadFile } from '@/lib/privacy'
import { useApp } from '@/context/AppContext'

interface Props {
  disabled?: boolean
  progress?: number
  statusMessage?: string
  onFileSelected: (file: File) => void
}

export function PassportUploader({
  disabled,
  progress,
  statusMessage,
  onFileSelected,
}: Props) {
  const { settings, pushToast } = useApp()
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const acceptFile = useCallback(
    (file: File | undefined) => {
      if (!file) return
      const result = validateUploadFile(file, settings.maxUploadMb)
      if (!result.ok) {
        pushToast({ type: 'error', title: 'Upload rejected', message: result.message })
        return
      }
      onFileSelected(file)
    },
    [onFileSelected, pushToast, settings.maxUploadMb],
  )

  const busy = Boolean(statusMessage) || disabled

  return (
    <div className="animate-fade-up">
      <div
        role="button"
        tabIndex={0}
        aria-disabled={busy}
        onKeyDown={(e) => {
          if (busy) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (busy) return
          acceptFile(e.dataTransfer.files?.[0])
        }}
        className={clsx(
          'panel relative overflow-hidden rounded-2xl border-2 border-dashed p-8 text-center transition md:p-12',
          dragging ? 'border-teal bg-teal/5' : 'border-ink/15',
          busy && 'pointer-events-none opacity-80',
        )}
      >
        {busy ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="h-10 w-10 animate-spin-slow text-teal" />
            <div>
              <p className="font-display text-lg font-semibold text-ink">
                {statusMessage ?? 'Processing…'}
              </p>
              <p className="mt-1 text-sm text-ink/55">
                OCR runs locally in your browser. Passport data is not uploaded.
              </p>
            </div>
            <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-ink/10">
              <div
                className="h-full rounded-full bg-teal transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(4, progress ?? 8))}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal/10 text-teal">
              <Upload className="h-8 w-8" />
            </div>
            <h2 className="font-display text-2xl font-bold text-ink">Upload Passport</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
              Drag and drop a passport image or PDF, or choose a file. Supported: JPG, JPEG, PNG,
              PDF — up to {settings.maxUploadMb} MB.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-teal px-5 py-2.5 font-display text-sm font-semibold text-white transition hover:bg-teal/90"
                onClick={() => inputRef.current?.click()}
              >
                <FileImage className="h-4 w-4" />
                Upload Passport
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-ink/15 bg-white px-5 py-2.5 font-display text-sm font-semibold text-ink transition hover:bg-ink/3"
                onClick={() => cameraRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
                Use Camera
              </button>
            </div>
            <p className="mt-4 text-xs text-ink/40">
              Tip: Photograph the biodata page in good light, keeping the MRZ lines sharp.
            </p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
        className="sr-only"
        onChange={(e) => {
          acceptFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          acceptFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      {!busy && (
        <p className="mt-3 text-center text-xs text-ink/45">
          Selected files stay on this device. Max size shown after validation ({formatBytes(settings.maxUploadMb * 1024 * 1024)}).
        </p>
      )}
    </div>
  )
}
