import { useRef, useState } from 'react'
import { Lock } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { verifyPin } from '@/lib/storage'

export function PinLockScreen() {
  const { settings, unlock, pushToast } = useApp()
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const ok = await verifyPin(pin, settings)
      if (ok) {
        unlock()
        pushToast({ type: 'success', title: 'Unlocked', message: 'Session unlocked for this browser tab.' })
      } else {
        pushToast({ type: 'error', title: 'Incorrect PIN', message: 'Try again.' })
        setPin('')
        inputRef.current?.focus()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-bg flex min-h-dvh items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="panel animate-fade-up w-full max-w-sm rounded-2xl p-8"
        method="post"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal/10 text-teal">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">PassPorto Locked</h1>
          <p className="mt-2 text-sm text-ink/60">
            Enter your local PIN to access stored passport documents on this device.
          </p>
        </div>
        <label htmlFor="pin" className="mb-1.5 block text-sm font-medium text-ink">
          PIN
        </label>
        <input
          ref={inputRef}
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          enterKeyHint="done"
          required
          minLength={4}
          maxLength={12}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="mb-4 w-full rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-center text-lg tracking-[0.35em]"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-teal px-4 py-2.5 font-display text-sm font-semibold text-white transition hover:bg-teal/90 disabled:opacity-60"
        >
          {busy ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    </div>
  )
}
