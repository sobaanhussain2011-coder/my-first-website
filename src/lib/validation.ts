import type { FieldValue, PassportFields } from '@/types/passport'

/** Parse YYMMDD MRZ dates into ISO YYYY-MM-DD when valid. */
export function parseMrzDate(yymmdd: string | null | undefined): string {
  if (!yymmdd || !/^\d{6}$/.test(yymmdd)) return ''
  const yy = Number(yymmdd.slice(0, 2))
  const mm = Number(yymmdd.slice(2, 4))
  const dd = Number(yymmdd.slice(4, 6))
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return ''

  // MRZ uses two-digit years; choose century relative to "now" for DOB vs expiry.
  const now = new Date()
  const currentYear = now.getFullYear() % 100
  const currentCentury = Math.floor(now.getFullYear() / 100) * 100
  // Default: years > current+10 are previous century (common for DOB).
  let year = currentCentury + yy
  if (yy > currentYear + 10) year -= 100

  const iso = `${year.toString().padStart(4, '0')}-${mm.toString().padStart(2, '0')}-${dd.toString().padStart(2, '0')}`
  if (!isValidIsoDate(iso)) return ''
  return iso
}

/** Parse expiry with preference for future dates when ambiguous. */
export function parseMrzExpiry(yymmdd: string | null | undefined): string {
  if (!yymmdd || !/^\d{6}$/.test(yymmdd)) return ''
  const yy = Number(yymmdd.slice(0, 2))
  const mm = Number(yymmdd.slice(2, 4))
  const dd = Number(yymmdd.slice(4, 6))
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return ''

  const now = new Date()
  const currentYear = now.getFullYear() % 100
  const currentCentury = Math.floor(now.getFullYear() / 100) * 100
  let year = currentCentury + yy
  // Expiry is usually in the future or recent past — prefer current century.
  if (yy < currentYear - 20) year += 100

  const iso = `${year.toString().padStart(4, '0')}-${mm.toString().padStart(2, '0')}-${dd.toString().padStart(2, '0')}`
  if (!isValidIsoDate(iso)) return ''
  return iso
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return false
  return d.toISOString().slice(0, 10) === value
}

export function normalizeSex(raw: string | null | undefined): string {
  if (!raw) return ''
  const v = raw.trim().toUpperCase()
  if (v === 'M' || v === 'MALE') return 'M'
  if (v === 'F' || v === 'FEMALE') return 'F'
  if (v === 'X' || v === '<' || v === 'UNSPECIFIED') return 'X'
  return ''
}

export function makeField(
  value: string,
  confidence: FieldValue['confidence'],
  source: FieldValue['source'],
): FieldValue {
  const trimmed = value.trim()
  if (!trimmed) {
    return { value: '', confidence: 'missing', source: 'none', needsReview: true }
  }
  return {
    value: trimmed,
    confidence,
    source,
    needsReview: confidence === 'low' || confidence === 'medium',
  }
}

/**
 * Cross-check visible OCR fields against MRZ-derived fields.
 * Never invents values — only flags inconsistencies for user review.
 */
export function validateAndMergeFields(
  ocrFields: PassportFields,
  mrzFields: Partial<PassportFields>,
): { fields: PassportFields; warnings: string[] } {
  const warnings: string[] = []
  const fields: PassportFields = { ...ocrFields }

  const preferKeys: (keyof PassportFields)[] = [
    'surname',
    'givenNames',
    'fullName',
    'dateOfBirth',
    'sex',
    'nationality',
    'passportNumber',
    'issuingCountry',
    'dateOfExpiry',
    'personalNumber',
    'documentType',
    'mrz',
  ]

  for (const key of preferKeys) {
    const mrz = mrzFields[key]
    if (!mrz || !mrz.value) continue

    const ocr = fields[key]
    if (!ocr.value) {
      fields[key] = { ...mrz, needsReview: mrz.confidence !== 'high' }
      continue
    }

    const a = normalizeComparable(ocr.value, key)
    const b = normalizeComparable(mrz.value, key)
    if (a && b && a !== b) {
      warnings.push(
        `${labelFor(key)} from the visible page ("${ocr.value}") does not match the MRZ ("${mrz.value}"). Please verify.`,
      )
      // Prefer MRZ for structured fields (checksum-backed) but force review.
      fields[key] = {
        ...mrz,
        confidence: 'medium',
        source: 'merged',
        needsReview: true,
      }
    } else {
      fields[key] = {
        value: mrz.value || ocr.value,
        confidence: 'high',
        source: 'merged',
        needsReview: false,
      }
    }
  }

  // Date sanity checks
  if (fields.dateOfBirth.value && !isValidIsoDate(fields.dateOfBirth.value)) {
    warnings.push('Date of birth appears invalid. Please correct it.')
    fields.dateOfBirth = { ...fields.dateOfBirth, confidence: 'low', needsReview: true }
  }
  if (fields.dateOfExpiry.value && !isValidIsoDate(fields.dateOfExpiry.value)) {
    warnings.push('Date of expiry appears invalid. Please correct it.')
    fields.dateOfExpiry = { ...fields.dateOfExpiry, confidence: 'low', needsReview: true }
  }
  if (fields.dateOfIssue.value && !isValidIsoDate(fields.dateOfIssue.value)) {
    warnings.push('Date of issue appears invalid. Please correct it.')
    fields.dateOfIssue = { ...fields.dateOfIssue, confidence: 'low', needsReview: true }
  }

  if (
    fields.dateOfBirth.value &&
    fields.dateOfExpiry.value &&
    isValidIsoDate(fields.dateOfBirth.value) &&
    isValidIsoDate(fields.dateOfExpiry.value) &&
    fields.dateOfBirth.value >= fields.dateOfExpiry.value
  ) {
    warnings.push('Date of birth is not before date of expiry. Please review these dates.')
    fields.dateOfBirth.needsReview = true
    fields.dateOfExpiry.needsReview = true
  }

  if (fields.passportNumber.value && !looksLikePassportNumber(fields.passportNumber.value)) {
    warnings.push('Passport number format looks unusual. Please double-check.')
    fields.passportNumber = { ...fields.passportNumber, confidence: 'low', needsReview: true }
  }

  const lowCount = Object.values(fields).filter((f) => f.needsReview || f.confidence === 'missing').length
  if (lowCount > 0) {
    warnings.unshift(
      'Some information could not be confidently recognized. Please review the highlighted fields before creating the Excel document.',
    )
  }

  return { fields, warnings }
}

function normalizeComparable(value: string, key: keyof PassportFields): string {
  let v = value.trim().toUpperCase().replace(/\s+/g, ' ')
  if (key === 'sex') return normalizeSex(v)
  if (key === 'passportNumber' || key === 'personalNumber') return v.replace(/[\s-]/g, '')
  if (key === 'nationality' || key === 'issuingCountry') return v.replace(/[^A-Z]/g, '').slice(0, 3)
  return v
}

function looksLikePassportNumber(value: string): boolean {
  const cleaned = value.replace(/[\s-]/g, '')
  // ICAO passport numbers are typically 6–9 alphanumeric characters.
  return /^[A-Z0-9]{5,12}$/i.test(cleaned)
}

function labelFor(key: keyof PassportFields): string {
  const map: Record<keyof PassportFields, string> = {
    fullName: 'Full name',
    givenNames: 'Given names',
    surname: 'Surname',
    dateOfBirth: 'Date of birth',
    placeOfBirth: 'Place of birth',
    sex: 'Sex',
    nationality: 'Nationality',
    passportNumber: 'Passport number',
    issuingCountry: 'Issuing country',
    issuingAuthority: 'Issuing authority',
    dateOfIssue: 'Date of issue',
    dateOfExpiry: 'Date of expiry',
    personalNumber: 'Personal number',
    documentType: 'Document type',
    mrz: 'MRZ',
  }
  return map[key]
}

export function fieldsToSnapshot(fields: PassportFields): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(fields)) {
    out[k] = v.value
  }
  return out
}
