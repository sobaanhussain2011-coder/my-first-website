import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  ScanLine,
  FolderOpen,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { ToastStack } from '@/components/ToastStack'
import { PinLockScreen } from '@/components/PinLockScreen'
import clsx from 'clsx'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/scan', label: 'Scan Passport', icon: ScanLine },
  { to: '/documents', label: 'Documents', icon: FolderOpen },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppLayout() {
  const { unlocked, settings } = useApp()

  if (settings.pinEnabled && !unlocked) {
    return (
      <>
        <PinLockScreen />
        <ToastStack />
      </>
    )
  }

  return (
    <div className="app-bg min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-[1440px]">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-ink/10 bg-ink/95 px-4 py-6 text-white md:flex">
          <div className="mb-10 px-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-bright/20 ring-1 ring-teal-bright/40">
                <ShieldCheck className="h-5 w-5 text-teal-bright" />
              </div>
              <div>
                <p className="font-display text-lg font-bold tracking-tight">PassPorto</p>
                <p className="text-xs text-white/55">Document Manager</p>
              </div>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {nav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                    isActive
                      ? 'bg-white/12 text-white shadow-inner'
                      : 'text-white/65 hover:bg-white/6 hover:text-white',
                  )
                }
              >
                <Icon className="h-4.5 w-4.5" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto rounded-xl bg-white/6 p-3 text-xs leading-relaxed text-white/55">
            <p className="font-medium text-white/80">Local-first privacy</p>
            <p className="mt-1">
              Passport scans and Excel files stay in this browser. Nothing is uploaded to a server.
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ink/8 bg-white/70 px-4 py-3 backdrop-blur-md md:hidden">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-teal" />
              <span className="font-display font-bold">PassPorto</span>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </main>

          <nav className="sticky bottom-0 z-20 grid grid-cols-4 border-t border-ink/10 bg-white/90 backdrop-blur-md md:hidden">
            {nav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  clsx(
                    'flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium',
                    isActive ? 'text-teal' : 'text-ink/45',
                  )
                }
              >
                <Icon className="h-5 w-5" />
                {label.split(' ')[0]}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
      <ToastStack />
    </div>
  )
}
