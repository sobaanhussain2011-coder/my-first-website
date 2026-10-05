import { Link } from 'react-router-dom'
import { FileSpreadsheet, ScanLine, FolderOpen, Sparkles } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { maskPassportNumber } from '@/lib/privacy'

export function DashboardPage() {
  const { totalDocuments, documentsToday, documents, loadingDocs, settings } = useApp()
  const recent = documents.slice(0, 5)

  return (
    <div className="space-y-8">
      <header className="animate-fade-up">
        <p className="text-sm font-medium tracking-wide text-teal uppercase">Dashboard</p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-ink md:text-4xl">
          PassPorto
        </h1>
        <p className="mt-2 max-w-2xl text-ink/60">
          Scan passports locally, review extracted details, and keep Excel exports private on this
          device.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total documents"
          value={loadingDocs ? '—' : String(totalDocuments)}
          icon={FileSpreadsheet}
        />
        <StatCard
          label="Created today"
          value={loadingDocs ? '—' : String(documentsToday)}
          icon={Sparkles}
        />
        <div className="panel animate-fade-up flex flex-col justify-center gap-3 rounded-2xl p-5 sm:col-span-2 lg:col-span-1">
          <Link
            to="/scan"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal px-4 py-3 font-display text-sm font-semibold text-white transition hover:bg-teal/90"
          >
            <ScanLine className="h-4 w-4" />
            Scan Passport
          </Link>
          <Link
            to="/documents"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/12 bg-white px-4 py-3 font-display text-sm font-semibold text-ink transition hover:bg-ink/3"
          >
            <FolderOpen className="h-4 w-4" />
            View Documents
          </Link>
        </div>
      </section>

      <section className="animate-fade-up">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Recent documents</h2>
          <Link to="/documents" className="text-sm font-medium text-teal hover:underline">
            View all
          </Link>
        </div>

        {loadingDocs ? (
          <div className="panel animate-pulse-soft rounded-2xl p-8 text-center text-ink/45">
            Loading…
          </div>
        ) : recent.length === 0 ? (
          <div className="panel rounded-2xl px-6 py-12 text-center">
            <p className="font-display text-base font-semibold text-ink">No documents yet</p>
            <p className="mt-1 text-sm text-ink/55">
              Start by scanning a passport to generate your first Excel file.
            </p>
            <Link
              to="/scan"
              className="mt-4 inline-flex rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-white"
            >
              Scan Passport
            </Link>
          </div>
        ) : (
          <ul className="panel divide-y divide-ink/8 overflow-hidden rounded-2xl">
            {recent.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{doc.personName || 'Unnamed'}</p>
                  <p className="text-xs text-ink/50">
                    {settings.showPartialPassportNumber
                      ? maskPassportNumber(doc.passportNumber || '----')
                      : doc.passportNumber || '—'}{' '}
                    · {new Date(doc.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-teal/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-teal uppercase">
                  {doc.fileType}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof FileSpreadsheet
}) {
  return (
    <div className="panel animate-fade-up rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink/55">{label}</p>
        <Icon className="h-4 w-4 text-teal" />
      </div>
      <p className="font-display mt-2 text-3xl font-bold text-ink">{value}</p>
    </div>
  )
}
