import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmation({
  open,
  title,
  message,
  confirmLabel = 'Delete permanently',
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      onClose={onCancel}
      className="w-[min(28rem,calc(100vw-2rem))]"
    >
      <div className="p-6">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-danger">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/65">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-ink/15 px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/3"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white hover:bg-danger/90"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
