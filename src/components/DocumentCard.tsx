import {
  Download,
  Eye,
  Pencil,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react'
import type { StoredDocument } from '@/types/passport'
import { maskPassportNumber } from '@/lib/privacy'
import { useApp } from '@/context/AppContext'

interface Props {
  document: StoredDocument
  onView: (doc: StoredDocument) => void
  onDownload: (doc: StoredDocument) => void
  onRename: (doc: StoredDocument) => void
  onDelete: (doc: StoredDocument) => void
}

export function DocumentCard({
  document: doc,
  onView,
  onDownload,
  onRename,
  onDelete,
}: Props) {
  const { settings } = useApp()
  const passportDisplay = settings.showPartialPassportNumber
    ? maskPassportNumber(doc.passportNumber || '----')
    : doc.passportNumber || '—'

  return (
    <article className="panel animate-fade-up rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-teal/10 text-teal">
          {doc.photoThumbnail ? (
            <img
              src={doc.photoThumbnail}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <FileSpreadsheet className="h-6 w-6" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-semibold text-ink">
            {doc.personName || 'Unnamed document'}
          </h3>
          <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-ink/55 sm:grid-cols-4">
            <div>
              <dt className="sr-only">Passport number</dt>
              <dd>{passportDisplay}</dd>
            </div>
            <div>
              <dt className="sr-only">Created</dt>
              <dd>{new Date(doc.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="sr-only">Document type</dt>
              <dd>{doc.documentType || 'Passport'}</dd>
            </div>
            <div>
              <dt className="sr-only">File type</dt>
              <dd className="uppercase">{doc.fileType}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton icon={Eye} label="View" onClick={() => onView(doc)} />
        <ActionButton icon={Download} label="Download" onClick={() => onDownload(doc)} />
        <ActionButton icon={Pencil} label="Rename" onClick={() => onRename(doc)} />
        <ActionButton icon={Trash2} label="Delete" danger onClick={() => onDelete(doc)} />
      </div>
    </article>
  )
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Eye
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        danger
          ? 'inline-flex items-center gap-1.5 rounded-lg border border-danger/20 bg-red-50 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-red-100'
          : 'inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-white px-3 py-1.5 text-xs font-semibold text-ink/80 hover:bg-ink/3'
      }
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}
