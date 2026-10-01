import * as pdfjs from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configure PDF.js to use its worker locally (no remote document upload).
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

/**
 * Render the first page of a PDF to a canvas / data URL for OCR.
 */
export async function pdfFirstPageToDataUrl(
  file: File,
  onProgress?: (p: number) => void,
): Promise<{ dataUrl: string; width: number; height: number }> {
  onProgress?.(10)
  const buffer = await file.arrayBuffer()
  let pdf
  try {
    pdf = await pdfjs.getDocument({ data: buffer }).promise
  } catch {
    throw new Error('Could not open this PDF. The file may be corrupted or password-protected.')
  }

  if (pdf.numPages < 1) {
    throw new Error('This PDF has no pages to scan.')
  }

  onProgress?.(40)
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 2 })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not prepare the PDF for scanning.')

  onProgress?.(70)
  await page.render({ canvasContext: ctx, viewport, canvas }).promise
  onProgress?.(100)

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    width: canvas.width,
    height: canvas.height,
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the selected file.'))
    reader.readAsDataURL(file)
  })
}

export function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load the passport image. It may be corrupted.'))
    img.src = dataUrl
  })
}

/** Estimate blur via Laplacian variance — low values suggest a blurry scan. */
export function estimateSharpness(img: HTMLImageElement): number {
  const canvas = document.createElement('canvas')
  const w = Math.min(img.naturalWidth, 400)
  const h = Math.round((img.naturalHeight / img.naturalWidth) * w)
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return 100
  ctx.drawImage(img, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)

  let sum = 0
  let sumSq = 0
  let count = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      const iUp = ((y - 1) * w + x) * 4
      const iDown = ((y + 1) * w + x) * 4
      const iLeft = (y * w + x - 1) * 4
      const iRight = (y * w + x + 1) * 4
      const up = 0.299 * data[iUp] + 0.587 * data[iUp + 1] + 0.114 * data[iUp + 2]
      const down = 0.299 * data[iDown] + 0.587 * data[iDown + 1] + 0.114 * data[iDown + 2]
      const left = 0.299 * data[iLeft] + 0.587 * data[iLeft + 1] + 0.114 * data[iLeft + 2]
      const right = 0.299 * data[iRight] + 0.587 * data[iRight + 1] + 0.114 * data[iRight + 2]
      const lap = Math.abs(4 * gray - up - down - left - right)
      sum += lap
      sumSq += lap * lap
      count++
    }
  }
  const mean = sum / count
  return sumSq / count - mean * mean
}
