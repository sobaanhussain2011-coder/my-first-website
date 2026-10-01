import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { hashPin } from '@/lib/storage'
import { Lock, Shield } from 'lucide-react'

export function SettingsPage() {
  const { settings, updateSettings, lock, pushToast } = useApp()
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [busy, setBusy] = useState(false)

  async function enablePin(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length < 4) {
      pushToast({ type: 'error', title: 'PIN too short', message: 'Use at least 4 digits.' })
      return
    }
    if (pin !== confirmPin) {
      pushToast({ type: 'error', title: 'PINs do not match' })
      return
    }
    setBusy(true)
    try {
      const { hash, salt } = await hashPin(pin)
      await updateSettings({
        pinEnabled: true,
        pinHash: hash,
        pinSalt: salt,
      })
      sessionStorage.setItem('ps-unlocked', '1')
      setPin('')
      setConfirmPin('')
      pushToast({
        type: 'success',
        title: 'PIN protection enabled',
        message: 'Documents on this device require your PIN after lock or a new session.',
      })
    } finally {
      setBusy(false)
    }
  }

  async function disablePin() {
    await updateSettings({
      pinEnabled: false,
      pinHash: undefined,
      pinSalt: undefined,
    })
    pushToast({ type: 'info', title: 'PIN protection disabled' })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="animate-fade-up">
        <p className="text-sm font-medium tracking-wide text-teal uppercase">Settings</p>
        <h1 className="font-display mt-1 text-3xl font-bold text-ink">Privacy & preferences</h1>
        <p className="mt-2 text-ink/60">
          PassPorto keeps passport data in your browser. Configure local protections and upload
          limits here.
        </p>
      </header>

      <section className="panel animate-fade-up rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/10 text-teal">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-ink">Upload limits</h2>
            <p className="text-sm text-ink/55">Reject oversized files before OCR runs.</p>
          </div>
        </div>
        <label htmlFor="max-upload" className="block text-sm font-medium text-ink">
          Max upload size (MB)
        </label>
        <input
          id="max-upload"
          name="maxUploadMb"
          type="number"
          min={1}
          max={50}
          value={settings.maxUploadMb}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (n >= 1 && n <= 50) void updateSettings({ maxUploadMb: n })
          }}
          className="mt-1 w-32 rounded-xl border border-ink/15 px-3 py-2 text-sm"
        />
        <label className="mt-4 flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={settings.showPartialPassportNumber}
            onChange={(e) =>
              void updateSettings({ showPartialPassportNumber: e.target.checked })
            }
            className="rounded border-ink/20"
          />
          Mask passport numbers in the Documents list
        </label>
      </section>

      <section className="panel animate-fade-up rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/10 text-teal">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-ink">Local PIN lock</h2>
            <p className="text-sm text-ink/55">
              Optional device-local unlock. The PIN is hashed with PBKDF2 and never stored in plain
              text.
            </p>
          </div>
        </div>

        {settings.pinEnabled ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                lock()
                pushToast({ type: 'info', title: 'App locked' })
              }}
              className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white"
            >
              Lock now
            </button>
            <button
              type="button"
              onClick={() => void disablePin()}
              className="rounded-xl border border-ink/15 px-4 py-2 text-sm font-semibold text-ink"
            >
              Disable PIN
            </button>
          </div>
        ) : (
          <form onSubmit={enablePin} method="post" className="space-y-3">
            <div>
              <label htmlFor="new-pin" className="block text-sm font-medium text-ink">
                New PIN
              </label>
              <input
                id="new-pin"
                name="pin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                minLength={4}
                maxLength={12}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="mt-1 w-full rounded-xl border border-ink/15 px-3 py-2.5 text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="confirm-pin" className="block text-sm font-medium text-ink">
                Confirm PIN
              </label>
              <input
                id="confirm-pin"
                name="confirmPin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                minLength={4}
                maxLength={12}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="mt-1 w-full rounded-xl border border-ink/15 px-3 py-2.5 text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Enable PIN protection'}
            </button>
          </form>
        )}
      </section>

      <section className="panel animate-fade-up rounded-2xl p-5 text-sm leading-relaxed text-ink/65">
        <h2 className="font-display mb-2 font-semibold text-ink">How privacy works</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>OCR runs in your browser with Tesseract.js — images are not sent to cloud AI APIs.</li>
          <li>Excel files and metadata are stored in IndexedDB on this device only.</li>
          <li>Passport numbers and MRZ data are not written to the address bar or analytics logs.</li>
          <li>Deleting a document removes its Excel blob and extracted field snapshot.</li>
          <li>Use HTTPS when hosting this app in production.</li>
        </ul>
      </section>
    </div>
  )
}
