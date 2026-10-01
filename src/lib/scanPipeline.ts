import type { PassportScanResult, PassportFields } from '@/types/passport'
import { createEmptyFields } from '@/types/passport'
import { runOcr, extractFieldsFromOcrText, type OcrProgressCallback } from '@/lib/ocrProcessor'
import { extractMrzLines, parseMrzToFields } from '@/lib/mrzProcessor'
import { detectPassportPhotograph } from '@/lib/photoProcessor'
import {
  pdfFirstPageToDataUrl,
  fileToDataUrl,
  loadImage,
  estimateSharpness,
} from '@/lib/pdfProcessor'
import { validateAndMergeFields } from '@/lib/validation'
import { validateUploadFile, safeLog } from '@/lib/privacy'

export type PipelineProgress = {
  step: 'uploading' | 'converting' | 'ocr' | 'mrz' | 'photo' | 'validating'
  progress: number
  message: string
}

/**
 * End-to-end local passport scan pipeline.
 * Images/PDFs never leave the browser; OCR runs via Tesseract.js in-worker.
 */
export async function processPassportFile(
  file: File,
  maxUploadMb: number,
  onProgress: (p: PipelineProgress) => void,
): Promise<PassportScanResult> {
  const validation = validateUploadFile(file, maxUploadMb)
  if (!validation.ok) {
    throw new Error(validation.message)
  }

  onProgress({ step: 'uploading', progress: 10, message: 'Preparing upload…' })

  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

  let sourceImageDataUrl: string
  if (isPdf) {
    onProgress({ step: 'converting', progress: 20, message: 'Converting PDF page…' })
    const rendered = await pdfFirstPageToDataUrl(file, (p) =>
      onProgress({ step: 'converting', progress: 20 + p * 0.15, message: 'Converting PDF page…' }),
    )
    sourceImageDataUrl = rendered.dataUrl
  } else {
    sourceImageDataUrl = await fileToDataUrl(file)
  }

  const img = await loadImage(sourceImageDataUrl)
  const sharpness = estimateSharpness(img)
  const warnings: string[] = []
  if (sharpness < 50) {
    warnings.push(
      'This image appears blurry. OCR accuracy may be low — please review all fields carefully or scan again with a clearer photo.',
    )
  }

  const ocrProgress: OcrProgressCallback = (progress, status) => {
    onProgress({ step: 'ocr', progress: 35 + progress * 0.4, message: status })
  }

  onProgress({ step: 'ocr', progress: 35, message: 'Running OCR…' })
  const { text, confidence } = await runOcr(img, ocrProgress)

  if (!text.trim()) {
    throw new Error(
      'No readable text was found. Please upload a clearer image of the passport biodata page.',
    )
  }

  onProgress({ step: 'mrz', progress: 78, message: 'Looking for MRZ…' })
  const mrzLines = extractMrzLines(text)
  let mrzFields: Partial<PassportFields> | null = null
  let mrzDetected = false

  if (mrzLines) {
    mrzFields = parseMrzToFields(mrzLines)
    mrzDetected = Boolean(mrzFields)
    if (!mrzFields) {
      warnings.push('An MRZ-like region was found but could not be parsed. Please enter details manually.')
    }
  } else {
    warnings.push(
      'Machine Readable Zone (MRZ) was not detected. Fields rely on OCR only and need careful review.',
    )
  }

  const ocrFields = extractFieldsFromOcrText(text, confidence)

  onProgress({ step: 'photo', progress: 88, message: 'Detecting passport photograph…' })
  let photographDataUrl: string | null = null
  try {
    photographDataUrl = await detectPassportPhotograph(img)
    if (!photographDataUrl) {
      warnings.push('Passport photograph could not be detected automatically.')
    }
  } catch {
    warnings.push('Passport photograph could not be cropped from this image.')
  }

  onProgress({ step: 'validating', progress: 94, message: 'Validating extracted fields…' })
  const { fields, warnings: mergeWarnings } = validateAndMergeFields(
    ocrFields,
    mrzFields ?? createEmptyFields(),
  )

  safeLog('Passport scan finished', {
    mrzDetected,
    warningCount: warnings.length + mergeWarnings.length,
    ocrConfidence: Math.round(confidence),
  })

  return {
    fields,
    photographDataUrl,
    sourceImageDataUrl,
    sourceFileName: file.name,
    sourceMimeType: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
    warnings: [...warnings, ...mergeWarnings],
    mrzDetected,
    ocrTextLength: text.length,
    processedAt: new Date().toISOString(),
  }
}
