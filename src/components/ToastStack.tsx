import { useApp } from '@/context/AppContext'
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from 'lucide-react'
import clsx from 'clsx'

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const styles = {
  success: 'border-ok/20 bg-emerald-50 text-ok',
  error: 'border-danger/20 bg-red-50 text-danger',
  warning: 'border-warn/20 bg-amber-50 text-warn',
  info: 'border-teal/20 bg-teal-50 text-teal',
}

export function ToastStack() {
  const { toasts, dismissToast } = useApp()
  if (!toasts.length) return null

  return (
    <div className="pointer-events-none fixed right-4 bottom-20 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 md:bottom-4">
      {toasts.map((t) => {
        const Icon = icons[t.type]
        return (
          <div
            key={t.id}
            className={clsx(
              'pointer-events-auto animate-fade-up rounded-xl border px-4 py-3 shadow-lg',
              styles[t.type],
            )}
            role="status"
          >
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-semibold text-ink">{t.title}</p>
                {t.message ? <p className="mt-0.5 text-sm text-ink/70">{t.message}</p> : null}
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                className="rounded-md p-1 text-ink/40 hover:bg-black/5 hover:text-ink"
                onClick={() => dismissToast(t.id)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
