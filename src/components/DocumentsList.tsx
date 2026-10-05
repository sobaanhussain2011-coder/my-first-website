import { useMemo, useState } from 'react'
import type { StoredDocument } from '@/types/passport'
import { DocumentCard } from '@/components/DocumentCard'
import { SearchBar } from '@/components/SearchBar'
import { FolderOpen } from 'lucide-react'

interface Props {
  documents: StoredDocument[]
  loading?: boolean
  onView: (doc: StoredDocument) => void
  onDownload: (doc: StoredDocument) => void
  onRename: (doc: StoredDocument) => void
  onDelete: (doc: StoredDocument) => void
}

export function DocumentsList({
  documents,
  loading,
  onView,
  onDownload,
  onRename,
  onDelete,
}: Props) {
  const [query, setQuery] = useState('')
  const [nameFilter, setNameFilter] = useState('')
  const [passportFilter, setPassportFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return documents.filter((doc) => {
      if (nameFilter && !doc.personName.toLowerCase().includes(nameFilter.toLowerCase())) {
        return false
      }
      if (
        passportFilter &&
        !doc.passportNumber.toLowerCase().includes(passportFilter.toLowerCase())
      ) {
        return false
      }
      if (typeFilter && !doc.documentType.toLowerCase().includes(typeFilter.toLowerCase())) {
        return false
      }
      if (dateFilter && !doc.createdAt.startsWith(dateFilter)) return false
      if (!q) return true
      const hay = `${doc.personName} ${doc.passportNumber} ${doc.documentType} ${doc.fileName}`.toLowerCase()
      return hay.includes(q)
    })
  }, [documents, query, nameFilter, passportFilter, typeFilter, dateFilter])

  if (loading) {
    return (
      <div className="panel animate-pulse-soft rounded-2xl p-10 text-center text-ink/50">
        Loading documents…
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="panel rounded-2xl p-4">
        <SearchBar value={query} onChange={setQuery} />
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <FilterInput label="Name" value={nameFilter} onChange={setNameFilter} />
          <FilterInput label="Passport number" value={passportFilter} onChange={setPassportFilter} />
          <FilterInput label="Document type" value={typeFilter} onChange={setTypeFilter} />
          <label className="block text-xs font-medium text-ink/60">
            Date created
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ink/12 bg-white px-2.5 py-2 text-sm text-ink"
            />
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="panel rounded-2xl px-6 py-16 text-center">
          <FolderOpen className="mx-auto h-10 w-10 text-ink/25" />
          <h3 className="mt-3 font-display text-lg font-semibold text-ink">No documents found</h3>
          <p className="mt-1 text-sm text-ink/55">
            {documents.length === 0
              ? 'Scan a passport and confirm the Excel file to see it here.'
              : 'Try adjusting your search or filters.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onView={onView}
              onDownload={onDownload}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block text-xs font-medium text-ink/60">
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-ink/12 bg-white px-2.5 py-2 text-sm text-ink"
        autoComplete="off"
      />
    </label>
  )
}
