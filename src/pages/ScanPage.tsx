import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Pencil,
  RotateCcw,
  X,
} from 'lucide-react'
import { PassportUploader } from '@/components/PassportUploader'
import { PassportPreview } from '@/components/PassportPreview'
import { PassportForm } from '@/components/PassportForm'
import { useApp } from '@/context/AppContext'
import { processPassportFile, type PipelineProgress } from '@/lib/scanPipeline'
import { generatePassportExcel } from '@/lib/excelGenerator'
import { fieldsToSnapshot } from '@/lib/validation'
import type { PassportFields, ScanStep, StoredDocument } from '@/types/passport'
import { buildDocumentFileName } from '@/lib/privacy'

export function ScanPage() {
  const navigate = useNavigate()
  const { settings, setScanResult, scanResult, persistDocument, pushToast } = useApp()
  const [step, setStep] = useState<ScanStep>(scanResult ? 'review' : 'idle')
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState<string | undefined>()
  const [fields, setFields] = useState<PassportFields | null>(scanResult?.fields ?? null)
  const [editing, setEditing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    setStep('uploading')
    setProgress(5)
    setStatusMessage('Preparing file…')
    try {
      const result = await processPassportFile(file, settings.maxUploadMb, (p: PipelineProgress) => {
        setStep(p.step)
        setProgress(p.progress)
        setStatusMessage(p.message)
      })
      setScanResult(result)
      setFields(result.fields)
      setEditing(true)
      setStep('review')
      setStatusMessage(undefined)
      if (result.warnings.length) {
        pushToast({
          type: 'warning',
          title: 'Review recommended',
          message: result.warnings[0],
        })
      } else {
        pushToast({
          type: 'success',
          title: 'Scan complete',
          message: 'Review the extracted fields, then create your Excel file.',
        })
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Something went wrong while processing this passport. Please try again.'
      setError(message)
      setStep('error')
      setStatusMessage(undefined)
      pushToast({ type: 'error', title: 'Scan failed', message })
    }
  }

  function updateField(key: keyof PassportFields, value: string) {
    setFields((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [key]: {
          ...prev[key],
          value,
          source: 'manual',
          confidence: value.trim() ? 'high' : 'missing',
          needsReview: !value.trim(),
        },
      }
    })
  }

  function resetScan() {
    setScanResult(null)
    setFields(null)
    setStep('idle')
    setError(null)
    setProgress(0)
    setStatusMessage(undefined)
  }

  async function confirmAndCreateExcel() {
    if (!fields || !scanResult) return
    setStep('generating')
    setStatusMessage('Creating Excel document…')
    setProgress(60)
    try {
      const { blob, fileName } = await generatePassportExcel(fields, scanResult.photographDataUrl)
      setProgress(85)
      const now = new Date().toISOString()
      const personName =
        fields.fullName.value ||
        [fields.surname.value, fields.givenNames.value].filter(Boolean).join(', ') ||
        'Unnamed'

      const doc: StoredDocument = {
        id: crypto.randomUUID(),
        personName,
        passportNumber: fields.passportNumber.value,
        documentType: fields.documentType.value || 'Passport',
        fileType: 'xlsx',
        createdAt: now,
        updatedAt: now,
        fileName: buildDocumentFileName(personName, now) || fileName,
        excelBlob: blob,
        photoThumbnail: scanResult.photographDataUrl,
        fieldsSnapshot: fieldsToSnapshot(fields),
      }

      await persistDocument(doc)
      setProgress(100)
      setStep('done')
      setScanResult(null)
      setFields(null)
      pushToast({
        type: 'success',
        title: 'Excel created',
        message: 'Saved to Documents on this device.',
      })
      navigate('/documents')
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Excel generation or storage failed. Please try again.'
      setError(message)
      setStep('review')
      setStatusMessage(undefined)
      pushToast({ type: 'error', title: 'Could not create Excel', message })
    }
  }

  const busy = ['uploading', 'converting', 'ocr', 'mrz', 'photo', 'validating', 'generating'].includes(
    step,
  )

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <p className="text-sm font-medium tracking-wide text-teal uppercase">Scan Passport</p>
        <h1 className="font-display mt-1 text-3xl font-bold text-ink">Scan & review</h1>
        <p className="mt-2 max-w-2xl text-ink/60">
          Upload a passport image or PDF. Text is read locally with OCR and MRZ parsing — correct
          anything before creating Excel.
        </p>
      </header>

      {(step === 'idle' || step === 'error' || busy) && step !== 'review' && step !== 'done' ? (
        <>
          <PassportUploader
            disabled={busy}
            progress={progress}
            statusMessage={busy ? statusMessage : undefined}
            onFileSelected={handleFile}
          />
          {error ? (
            <div className="animate-fade-up rounded-2xl border border-danger/20 bg-red-50 px-4 py-3 text-sm text-danger">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {step === 'review' && scanResult && fields ? (
        <div className="space-y-4">
          {scanResult.warnings.length > 0 ? (
            <div className="animate-fade-up rounded-2xl border border-warn/25 bg-amber-50 px-4 py-3 text-sm text-warn">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold text-ink">Please review highlighted fields</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-ink/70">
                    {scanResult.warnings.slice(0, 4).map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-fade-up rounded-2xl border border-ok/20 bg-emerald-50 px-4 py-3 text-sm text-ok">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <p>MRZ and OCR look consistent. You can still edit any field before exporting.</p>
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <PassportPreview
              imageDataUrl={scanResult.sourceImageDataUrl}
              photographDataUrl={scanResult.photographDataUrl}
              fileName={scanResult.sourceFileName}
            />
            <div className="panel rounded-2xl p-4 md:p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold text-ink">Extracted information</h2>
                {!editing ? (
                  <span className="text-xs font-medium text-ink/45">Read-only preview</span>
                ) : null}
              </div>
              <PassportForm fields={fields} readOnly={!editing} onChange={updateField} />
            </div>
          </div>

          <div className="panel sticky bottom-16 z-10 flex flex-wrap gap-2 rounded-2xl p-3 md:bottom-4 md:justify-end">
            <button
              type="button"
              onClick={confirmAndCreateExcel}
              className="inline-flex items-center gap-2 rounded-xl bg-teal px-4 py-2.5 font-display text-sm font-semibold text-white hover:bg-teal/90"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Confirm & Create Excel
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-ink/12 bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-ink/3"
            >
              <Pencil className="h-4 w-4" />
              Edit Information
            </button>
            <button
              type="button"
              onClick={resetScan}
              className="inline-flex items-center gap-2 rounded-xl border border-ink/12 bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-ink/3"
            >
              <RotateCcw className="h-4 w-4" />
              Scan Again
            </button>
            <button
              type="button"
              onClick={resetScan}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-ink/55 hover:bg-ink/5"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
