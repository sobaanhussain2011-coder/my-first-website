import { useRef, useState } from 'react'
import { DocumentsList } from '@/components/DocumentsList'
import { DeleteConfirmation } from '@/components/DeleteConfirmation'
import { useApp } from '@/context/AppContext'
import type { StoredDocument } from '@/types/passport'
import { downloadBlob } from '@/lib/excelGenerator'
import { maskPassportNumber, sanitizeFileName } from '@/lib/privacy'

export function DocumentsPage() {
  const {
    documents,
    loadingDocs,
    removeDocument,
    renameDocument,
    pushToast,
    settings,
  } = useApp()
  const [pendingDelete, setPendingDelete] = useState<StoredDocument | null>(null)
  const [viewDoc, setViewDoc] = useState<StoredDocument | null>(null)
  const [renameDoc, setRenameDoc] = useState<StoredDocument | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameDialogRef = useRef<HTMLDialogElement>(null)
  const viewDialogRef = useRef<HTMLDialogElement>(null)

  function openRename(doc: StoredDocument) {
    setRenameDoc(doc)
    setRenameValue(doc.fileName.replace(/\.xlsx$/i, ''))
    queueMicrotask(() => renameDialogRef.current?.showModal())
  }

  function openView(doc: StoredDocument) {
    setViewDoc(doc)
    queueMicrotask(() => viewDialogRef.current?.showModal())
  }

  async function confirmRename() {
    if (!renameDoc) return
    const clean = sanitizeFileName(renameValue, 'passport-document')
    const fileName = clean.endsWith('.xlsx') ? clean : `${clean}.xlsx`
    await renameDocument(renameDoc.id, fileName)
    renameDialogRef.current?.close()
    setRenameDoc(null)
    pushToast({ type: 'success', title: 'Document renamed' })
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    await removeDocument(pendingDelete.id)
    setPendingDelete(null)
    pushToast({
      type: 'success',
      title: 'Document deleted',
      message: 'The Excel file and associated extracted data were removed from this device.',
    })
  }

  function handleDownload(doc: StoredDocument) {
    downloadBlob(doc.excelBlob, doc.fileName)
    pushToast({ type: 'info', title: 'Download started', message: doc.fileName })
  }

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <p className="text-sm font-medium tracking-wide text-teal uppercase">Documents</p>
        <h1 className="font-display mt-1 text-3xl font-bold text-ink">Saved Excel files</h1>
        <p className="mt-2 max-w-2xl text-ink/60">
          Every confirmed passport export is stored privately in this browser’s IndexedDB. View,
          download, rename, or permanently delete anytime.
        </p>
      </header>

      <DocumentsList
        documents={documents}
        loading={loadingDocs}
        onView={openView}
        onDownload={handleDownload}
        onRename={openRename}
        onDelete={setPendingDelete}
      />

      <DeleteConfirmation
        open={Boolean(pendingDelete)}
        title="Delete this document?"
        message="This permanently removes the Excel file and the extracted passport metadata stored on this device. This cannot be undone."
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />

      <dialog
        ref={renameDialogRef}
        closedby="any"
        onClose={() => setRenameDoc(null)}
        className="w-[min(28rem,calc(100vw-2rem))]"
      >
        <form
          method="dialog"
          className="p-6"
          onSubmit={(e) => {
            e.preventDefault()
            void confirmRename()
          }}
        >
          <h2 className="font-display text-lg font-bold text-ink">Rename document</h2>
          <label htmlFor="rename-input" className="mt-4 block text-sm font-medium text-ink">
            File name
          </label>
          <input
            id="rename-input"
            name="fileName"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            className="mt-1 w-full rounded-xl border border-ink/15 px-3 py-2.5 text-sm"
            required
            autoComplete="off"
          />
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-xl border border-ink/15 px-4 py-2 text-sm font-semibold"
              onClick={() => renameDialogRef.current?.close()}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-white"
            >
              Save name
            </button>
          </div>
        </form>
      </dialog>

      <dialog
        ref={viewDialogRef}
        closedby="any"
        onClose={() => setViewDoc(null)}
        className="w-[min(36rem,calc(100vw-2rem))]"
      >
        {viewDoc ? (
          <div className="p-6">
            <h2 className="font-display text-lg font-bold text-ink">{viewDoc.personName}</h2>
            <p className="mt-1 text-sm text-ink/55">{viewDoc.fileName}</p>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <ViewRow
                label="Passport number"
                value={
                  settings.showPartialPassportNumber
                    ? maskPassportNumber(viewDoc.passportNumber || '----')
                    : viewDoc.passportNumber || '—'
                }
              />
              <ViewRow label="Document type" value={viewDoc.documentType || 'Passport'} />
              <ViewRow label="Created" value={new Date(viewDoc.createdAt).toLocaleString()} />
              <ViewRow label="File type" value={viewDoc.fileType.toUpperCase()} />
            </dl>
            {viewDoc.photoThumbnail ? (
              <img
                src={viewDoc.photoThumbnail}
                alt="Stored passport photograph thumbnail"
                className="mt-4 h-36 w-28 rounded-lg object-cover shadow"
              />
            ) : null}
            <div className="mt-4 max-h-56 overflow-auto rounded-xl border border-ink/10 bg-mist/50 p-3">
              <p className="mb-2 text-xs font-semibold tracking-wide text-ink/45 uppercase">
                Field snapshot
              </p>
              <dl className="space-y-1 text-xs">
                {Object.entries(viewDoc.fieldsSnapshot).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[10rem_1fr] gap-2">
                    <dt className="font-medium text-ink/55">{k}</dt>
                    <dd className="break-all text-ink">{v || '—'}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-ink/15 px-4 py-2 text-sm font-semibold"
                onClick={() => viewDialogRef.current?.close()}
              >
                Close
              </button>
              <button
                type="button"
                className="rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-white"
                onClick={() => handleDownload(viewDoc)}
              >
                Download
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </div>
  )
}

function ViewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-mist/60 px-3 py-2">
      <dt className="text-xs text-ink/45">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  )
}
