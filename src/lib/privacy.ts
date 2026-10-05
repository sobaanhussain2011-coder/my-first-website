/** Privacy helpers — never log or put passport PII in URLs. */

const SENSITIVE_KEYS = [
  'passport',
  'mrz',
  'dob',
  'birth',
  'personal',
  'photo',
  'nationality',
  'surname',
  'given',
] as const

/** Strip characters unsafe for download filenames. */
export function sanitizeFileName(name: string, fallback = 'passport-document'): string {
  const base = name
    .replace(/\.[^.]+$/, '')
    .replace(/[^\w\s\-().]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/^[-.]+|[-.]+$/g, '')
  return base || fallback
}

/** Mask passport number for UI display (e.g. AB12****90). */
export function maskPassportNumber(number: string): string {
  const cleaned = number.replace(/\s+/g, '')
  if (cleaned.length <= 4) return '****'
  if (cleaned.length <= 6) return `${cleaned.slice(0, 2)}${'*'.repeat(cleaned.length - 2)}`
  return `${cleaned.slice(0, 4)}${'*'.repeat(Math.max(4, cleaned.length - 6))}${cleaned.slice(-2)}`
}

/** Safe console helper — redacts obvious passport-related payloads. */
export function safeLog(message: string, meta?: Record<string, unknown>): void {
  if (!meta) {
    console.info(message)
    return
  }
  const redacted: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(meta)) {
    const lower = key.toLowerCase()
    if (SENSITIVE_KEYS.some((s) => lower.includes(s))) {
      redacted[key] = '[redacted]'
    } else if (typeof value === 'string' && value.length > 200) {
      redacted[key] = `[string length ${value.length}]`
    } else {
      redacted[key] = value
    }
  }
  console.info(message, redacted)
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
])

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.pdf'])

export function validateUploadFile(
  file: File,
  maxMb: number,
): { ok: true } | { ok: false; message: string } {
  const ext = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`
  const mimeOk = ALLOWED_MIME.has(file.type) || file.type === ''
  const extOk = ALLOWED_EXT.has(ext)

  if (!mimeOk && !extOk) {
    return {
      ok: false,
      message: 'Unsupported file type. Please upload a JPG, JPEG, PNG, or PDF file.',
    }
  }

  const maxBytes = maxMb * 1024 * 1024
  if (file.size > maxBytes) {
    return {
      ok: false,
      message: `File is too large (${formatBytes(file.size)}). Maximum size is ${maxMb} MB.`,
    }
  }

  if (file.size === 0) {
    return { ok: false, message: 'The selected file appears to be empty or corrupted.' }
  }

  return { ok: true }
}

/** Derive a download name without embedding raw passport numbers in URLs. */
export function buildDocumentFileName(personName: string, createdAt: string): string {
  const date = createdAt.slice(0, 10)
  const name = sanitizeFileName(personName || 'passport', 'passport')
  return `${name}_${date}.xlsx`
}
