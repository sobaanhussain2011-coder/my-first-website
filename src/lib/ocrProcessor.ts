import { createWorker, type Worker } from 'tesseract.js'
import { createEmptyFields, type PassportFields } from '@/types/passport'
import { makeField } from '@/lib/validation'
import { safeLog } from '@/lib/privacy'

export type OcrProgressCallback = (progress: number, status: string) => void

let workerPromise: Promise<Worker> | null = null

async function getWorker(onProgress?: OcrProgressCallback): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      // Local browser OCR — passport images are not sent to third-party AI APIs.
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number') {
            onProgress?.(Math.round(m.progress * 100), 'Reading passport text…')
          }
        },
      })
      // MRZ uses a narrow character set; whitelist improves recognition of fillers.
      await worker.setParameters({
        tessedit_char_whitelist:
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789<.,/-: ',
        preserve_interword_spaces: '1',
      })
      return worker
    })()
  }
  return workerPromise
}

export async function runOcr(
  imageSource: HTMLCanvasElement | HTMLImageElement | string,
  onProgress?: OcrProgressCallback,
): Promise<{ text: string; confidence: number }> {
  try {
    onProgress?.(5, 'Initializing OCR engine…')
    const worker = await getWorker(onProgress)
    onProgress?.(15, 'Scanning passport…')
    const result = await worker.recognize(imageSource)
    const text = result.data.text ?? ''
    const confidence = result.data.confidence ?? 0
    safeLog('OCR completed', { textLength: text.length, confidence: Math.round(confidence) })
    return { text, confidence }
  } catch (err) {
    safeLog('OCR failed', { error: err instanceof Error ? err.message : 'unknown' })
    throw new Error(
      'Could not read text from this image. Try a clearer, well-lit photo of the passport biodata page.',
    )
  }
}

/**
 * Heuristic extraction of visible (non-MRZ) passport labels from OCR text.
 * Only returns values when a label pattern is found — never guesses.
 */
export function extractFieldsFromOcrText(text: string, overallConfidence: number): PassportFields {
  const fields = createEmptyFields()
  const baseConf = overallConfidence >= 70 ? 'medium' : 'low'

  const surname = matchLabeledValue(text, [
    /(?:surname|nom|apellido)[:\s]+([A-ZÄÖÜÁÉÍÓÚÑ][A-ZÄÖÜÁÉÍÓÚÑ\-\s']{1,40})/i,
  ])
  const given = matchLabeledValue(text, [
    /(?:given\s*names?|pr[eé]noms?|nombres?)[:\s]+([A-ZÄÖÜÁÉÍÓÚÑ][A-ZÄÖÜÁÉÍÓÚÑ\-\s']{1,60})/i,
  ])
  const passportNo = matchLabeledValue(text, [
    /(?:passport\s*no\.?|document\s*no\.?|n[°o]\s*de\s*passeport)[:\s]*([A-Z0-9]{5,12})/i,
  ])
  const nationality = matchLabeledValue(text, [
    /(?:nationality|nationalit[eé]|nacionalidad)[:\s]+([A-Z][A-Z\s]{1,30})/i,
  ])
  const sex = matchLabeledValue(text, [/(?:sex|sexe|sexo)[:\s]*([MFX])/i])
  const dob = matchDateNearLabel(text, /(?:date\s*of\s*birth|birth|naissance|fecha\s*de\s*nacimiento)/i)
  const issue = matchDateNearLabel(text, /(?:date\s*of\s*issue|issued|d[eé]livrance|fecha\s*de\s*expedici[oó]n)/i)
  const expiry = matchDateNearLabel(text, /(?:date\s*of\s*expiry|expiry|expiration|caducidad)/i)
  const pob = matchLabeledValue(text, [
    /(?:place\s*of\s*birth|lieu\s*de\s*naissance|lugar\s*de\s*nacimiento)[:\s]+([A-ZÄÖÜÁÉÍÓÚÑ][A-ZÄÖÜÁÉÍÓÚÑ\-\s,/']{1,40})/i,
  ])
  const authority = matchLabeledValue(text, [
    /(?:authority|autorit[eé]|autoridad)[:\s]+([A-ZÄÖÜÁÉÍÓÚÑ0-9][A-ZÄÖÜÁÉÍÓÚÑ0-9\-\s,/']{1,40})/i,
  ])

  if (surname) fields.surname = makeField(cleanName(surname), baseConf, 'ocr')
  if (given) fields.givenNames = makeField(cleanName(given), baseConf, 'ocr')
  if (surname || given) {
    fields.fullName = makeField(
      [cleanName(surname ?? ''), cleanName(given ?? '')].filter(Boolean).join(', '),
      baseConf,
      'ocr',
    )
  }
  if (passportNo) fields.passportNumber = makeField(passportNo.toUpperCase(), baseConf, 'ocr')
  if (nationality) fields.nationality = makeField(nationality.trim().toUpperCase(), 'low', 'ocr')
  if (sex) fields.sex = makeField(sex.toUpperCase(), baseConf, 'ocr')
  if (dob) fields.dateOfBirth = makeField(dob, baseConf, 'ocr')
  if (issue) fields.dateOfIssue = makeField(issue, 'low', 'ocr')
  if (expiry) fields.dateOfExpiry = makeField(expiry, baseConf, 'ocr')
  if (pob) fields.placeOfBirth = makeField(cleanName(pob), 'low', 'ocr')
  if (authority) fields.issuingAuthority = makeField(authority.trim(), 'low', 'ocr')

  return fields
}

function matchLabeledValue(text: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) return m[1].trim()
  }
  return null
}

function matchDateNearLabel(text: string, label: RegExp): string | null {
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    if (!label.test(lines[i])) continue
    const window = [lines[i], lines[i + 1] ?? '', lines[i + 2] ?? ''].join(' ')
    const iso = findDateInText(window)
    if (iso) return iso
  }
  // Fallback: search whole text after label match position.
  const idx = text.search(label)
  if (idx >= 0) return findDateInText(text.slice(idx, idx + 80))
  return null
}

/** Convert common passport date formats to ISO — returns '' if ambiguous. */
export function findDateInText(text: string): string | null {
  const patterns: { re: RegExp; parse: (m: RegExpMatchArray) => string | null }[] = [
    {
      re: /\b(\d{4})[./-](\d{2})[./-](\d{2})\b/,
      parse: (m) => toIso(m[1], m[2], m[3]),
    },
    {
      re: /\b(\d{2})[./-](\d{2})[./-](\d{4})\b/,
      parse: (m) => toIso(m[3], m[2], m[1]),
    },
    {
      re: /\b(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s+(\d{4})\b/i,
      parse: (m) => {
        const months: Record<string, string> = {
          JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
          JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
        }
        const mm = months[m[2].slice(0, 3).toUpperCase()]
        if (!mm) return null
        return toIso(m[3], mm, m[1].padStart(2, '0'))
      },
    },
  ]

  for (const { re, parse } of patterns) {
    const m = text.match(re)
    if (m) {
      const iso = parse(m)
      if (iso) return iso
    }
  }
  return null
}

function toIso(y: string, m: string, d: string): string | null {
  const iso = `${y}-${m}-${d}`
  const dt = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(dt.getTime()) || dt.toISOString().slice(0, 10) !== iso) return null
  return iso
}

function cleanName(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/[^A-Za-zÄÖÜÁÉÍÓÚÑäöüáéíóúñ\-\s']/g, '')
    .trim()
}

export async function terminateOcrWorker(): Promise<void> {
  if (workerPromise) {
    const w = await workerPromise
    await w.terminate()
    workerPromise = null
  }
}
