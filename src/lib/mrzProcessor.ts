import { parse } from 'mrz'
import type { PassportFields } from '@/types/passport'
import { createEmptyFields } from '@/types/passport'
import { makeField, normalizeSex, parseMrzDate, parseMrzExpiry } from '@/lib/validation'

/**
 * Extract TD3 (passport) MRZ lines from noisy OCR text.
 * TD3: two lines of 44 characters each, starting with P.
 */
/** Strip non-MRZ characters; leave letter/digit disambiguation to softCorrectTd3. */
function correctMrzOcrNoise(line: string): string {
  return line
    .toUpperCase()
    .replace(/[«»]/g, '<')
    .replace(/[|\u00A0]/g, '')
    .replace(/[^A-Z0-9<]/g, '')
}

function softCorrectTd3(line1: string, line2: string): [string, string] {
  // Line 1 is names/codes — prefer letters for digit lookalikes outside fillers.
  let a = line1.slice(0, 44).padEnd(44, '<')
  a = a.replace(/0/g, 'O')
  // Line 2 has fixed digit slots for check digits and dates.
  let b = line2.slice(0, 44).padEnd(44, '<')
  const digitMap: Record<string, string> = {
    O: '0',
    D: '0',
    Q: '0',
    I: '1',
    L: '1',
    Z: '2',
    S: '5',
    B: '8',
    G: '6',
  }
  const forceDigit = (idx: number) => {
    const ch = b[idx]
    if (digitMap[ch]) b = `${b.slice(0, idx)}${digitMap[ch]}${b.slice(idx + 1)}`
  }
  ;[9, 13, 14, 15, 16, 17, 18, 20, 21, 22, 23, 24, 25, 42].forEach(forceDigit)
  return [a, b]
}

export function extractMrzLines(ocrText: string): string[] | null {
  const normalized = ocrText
    .toUpperCase()
    .replace(/[«»]/g, '<')
    .replace(/[|\u00A0]/g, ' ')

  const lines = normalized
    .split(/\r?\n/)
    .map((l) => correctMrzOcrNoise(l))
    .filter((l) => l.length >= 28)

  // Prefer classic passport TD3 (2 × 44).
  for (let i = 0; i < lines.length - 1; i++) {
    let a = padOrTrim(lines[i], 44)
    let b = padOrTrim(lines[i + 1], 44)
    // Line 1 should start with P; undo digit-forcing on the leading P if OCR made it messy.
    if (a.startsWith('P') || a.startsWith('0')) {
      if (a.startsWith('0')) a = `P${a.slice(1)}`
      ;[a, b] = softCorrectTd3(a, b)
      if (a.startsWith('P') && countFillers(a) + countFillers(b) >= 4) {
        return [a, b]
      }
    }
  }

  // Sliding window over concatenated text for broken line breaks.
  const compact = correctMrzOcrNoise(normalized)
  const idx = compact.indexOf('P<') >= 0 ? compact.indexOf('P<') : compact.indexOf('P')
  if (idx >= 0 && compact.length >= idx + 88) {
    let a = compact.slice(idx, idx + 44)
    let b = compact.slice(idx + 44, idx + 88)
    ;[a, b] = softCorrectTd3(a, b)
    if (countFillers(a) + countFillers(b) >= 4) return [a, b]
  }

  // TD1 (3 × 30) — less common for passports but supported.
  for (let i = 0; i < lines.length - 2; i++) {
    const a = padOrTrim(lines[i], 30)
    const b = padOrTrim(lines[i + 1], 30)
    const c = padOrTrim(lines[i + 2], 30)
    if (/^[ACI]/.test(a) && countFillers(a) + countFillers(b) + countFillers(c) >= 6) {
      return [a, b, c]
    }
  }

  return null
}

function padOrTrim(line: string, len: number): string {
  if (line.length === len) return line
  if (line.length > len) return line.slice(0, len)
  return line.padEnd(len, '<')
}

function countFillers(line: string): number {
  return (line.match(/</g) ?? []).length
}

/**
 * Parse MRZ lines into passport fields.
 * Returns null when parsing fails entirely — never invents data.
 */
export function parseMrzToFields(lines: string[]): Partial<PassportFields> | null {
  try {
    const result = parse(lines)
    const f = result.fields
    const out = createEmptyFields()

    const last = (f.lastName ?? '').replace(/</g, ' ').trim()
    const first = (f.firstName ?? '').replace(/</g, ' ').trim()
    const full = [last, first].filter(Boolean).join(', ')

    out.surname = makeField(last, result.valid ? 'high' : 'medium', 'mrz')
    out.givenNames = makeField(first, result.valid ? 'high' : 'medium', 'mrz')
    out.fullName = makeField(full, result.valid ? 'high' : 'medium', 'mrz')
    out.passportNumber = makeField(f.documentNumber ?? '', result.valid ? 'high' : 'medium', 'mrz')
    out.nationality = makeField(f.nationality ?? '', result.valid ? 'high' : 'medium', 'mrz')
    out.issuingCountry = makeField(f.issuingState ?? '', result.valid ? 'high' : 'medium', 'mrz')
    out.sex = makeField(normalizeSex(f.sex), result.valid ? 'high' : 'medium', 'mrz')
    out.dateOfBirth = makeField(parseMrzDate(f.birthDate), result.valid ? 'high' : 'medium', 'mrz')
    out.dateOfExpiry = makeField(parseMrzExpiry(f.expirationDate), result.valid ? 'high' : 'medium', 'mrz')
    out.personalNumber = makeField(
      (f.personalNumber ?? f.optional1 ?? '').replace(/</g, '').trim(),
      'medium',
      'mrz',
    )
    out.documentType = makeField(f.documentCode ?? 'P', 'high', 'mrz')
    out.mrz = makeField(lines.join('\n'), result.valid ? 'high' : 'medium', 'mrz')

    // Mark invalid detail fields as needing review without inventing replacements.
    for (const detail of result.details) {
      if (!detail.valid && detail.field) {
        const mapped = mapDetailField(detail.field)
        if (mapped && out[mapped]) {
          out[mapped] = { ...out[mapped], confidence: 'low', needsReview: true }
        }
      }
    }

    return out
  } catch {
    return null
  }
}

function mapDetailField(
  field: string,
): keyof PassportFields | null {
  switch (field) {
    case 'lastName':
      return 'surname'
    case 'firstName':
      return 'givenNames'
    case 'documentNumber':
      return 'passportNumber'
    case 'nationality':
      return 'nationality'
    case 'issuingState':
      return 'issuingCountry'
    case 'sex':
      return 'sex'
    case 'birthDate':
      return 'dateOfBirth'
    case 'expirationDate':
      return 'dateOfExpiry'
    case 'personalNumber':
    case 'optional1':
      return 'personalNumber'
    case 'documentCode':
      return 'documentType'
    default:
      return null
  }
}
