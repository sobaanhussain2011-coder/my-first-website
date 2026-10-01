/** Confidence level for an extracted passport field. Never invent values — leave blank when unsure. */
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'missing'

export interface FieldValue {
  value: string
  confidence: ConfidenceLevel
  source: 'mrz' | 'ocr' | 'merged' | 'manual' | 'none'
  needsReview: boolean
}

export interface PassportFields {
  fullName: FieldValue
  givenNames: FieldValue
  surname: FieldValue
  dateOfBirth: FieldValue
  placeOfBirth: FieldValue
  sex: FieldValue
  nationality: FieldValue
  passportNumber: FieldValue
  issuingCountry: FieldValue
  issuingAuthority: FieldValue
  dateOfIssue: FieldValue
  dateOfExpiry: FieldValue
  personalNumber: FieldValue
  documentType: FieldValue
  mrz: FieldValue
}

export interface PassportScanResult {
  fields: PassportFields
  photographDataUrl: string | null
  sourceImageDataUrl: string
  sourceFileName: string
  sourceMimeType: string
  warnings: string[]
  mrzDetected: boolean
  ocrTextLength: number
  processedAt: string
}

export interface StoredDocument {
  id: string
  personName: string
  passportNumber: string
  documentType: string
  fileType: 'xlsx'
  createdAt: string
  updatedAt: string
  fileName: string
  /** Excel file bytes stored locally in IndexedDB — never uploaded. */
  excelBlob: Blob
  /** Optional thumbnail of passport photo for UI (data URL). */
  photoThumbnail: string | null
  /** Snapshot of reviewed fields for view/rename without re-parsing. */
  fieldsSnapshot: Record<string, string>
}

export interface AppSettings {
  maxUploadMb: number
  autoLockMinutes: number
  pinEnabled: boolean
  /** Salt + hash for local PIN unlock (Web Crypto). Never stores plaintext PIN. */
  pinSalt?: string
  pinHash?: string
  showPartialPassportNumber: boolean
}

export type ScanStep =
  | 'idle'
  | 'uploading'
  | 'converting'
  | 'ocr'
  | 'mrz'
  | 'photo'
  | 'validating'
  | 'review'
  | 'generating'
  | 'done'
  | 'error'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
}

export const EMPTY_FIELD = (): FieldValue => ({
  value: '',
  confidence: 'missing',
  source: 'none',
  needsReview: true,
})

export function createEmptyFields(): PassportFields {
  return {
    fullName: EMPTY_FIELD(),
    givenNames: EMPTY_FIELD(),
    surname: EMPTY_FIELD(),
    dateOfBirth: EMPTY_FIELD(),
    placeOfBirth: EMPTY_FIELD(),
    sex: EMPTY_FIELD(),
    nationality: EMPTY_FIELD(),
    passportNumber: EMPTY_FIELD(),
    issuingCountry: EMPTY_FIELD(),
    issuingAuthority: EMPTY_FIELD(),
    dateOfIssue: EMPTY_FIELD(),
    dateOfExpiry: EMPTY_FIELD(),
    personalNumber: EMPTY_FIELD(),
    documentType: EMPTY_FIELD(),
    mrz: EMPTY_FIELD(),
  }
}
