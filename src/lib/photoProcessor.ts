/**
 * Detect and crop the passport photograph region.
 * Passports typically place the portrait on the left side of the biodata page.
 * We score skin-tone density across candidate left-side regions and crop the best match.
 * If detection is uncertain, returns null rather than a bad crop.
 */

export async function detectPassportPhotograph(
  source: HTMLImageElement | HTMLCanvasElement,
): Promise<string | null> {
  const canvas = document.createElement('canvas')
  const w = 'naturalWidth' in source ? source.naturalWidth : source.width
  const h = 'naturalHeight' in source ? source.naturalHeight : source.height
  if (w < 80 || h < 80) return null

  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(source, 0, 0)

  const candidates = buildCandidates(w, h)
  let best: { score: number; box: Box } | null = null

  for (const box of candidates) {
    const score = scorePortraitRegion(ctx, box)
    if (!best || score > best.score) best = { score, box }
  }

  // Require a minimum skin-tone density so we don't crop random left-side content.
  if (!best || best.score < 0.08) return null

  const { box } = best
  const out = document.createElement('canvas')
  // Keep portrait quality reasonable for Excel embedding without huge files.
  const targetW = Math.min(320, box.w)
  const targetH = Math.round((box.h / box.w) * targetW)
  out.width = targetW
  out.height = targetH
  const octx = out.getContext('2d')
  if (!octx) return null
  octx.drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, targetW, targetH)
  return out.toDataURL('image/jpeg', 0.85)
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

function buildCandidates(w: number, h: number): Box[] {
  const boxes: Box[] = []
  // Typical ICAO portrait placement: left portion, upper/mid vertical band.
  const widths = [0.22, 0.28, 0.34]
  const lefts = [0.03, 0.05, 0.08]
  const tops = [0.12, 0.18, 0.22]
  const heights = [0.42, 0.48, 0.55]

  for (const lw of widths) {
    for (const lx of lefts) {
      for (const ty of tops) {
        for (const hh of heights) {
          boxes.push({
            x: Math.round(w * lx),
            y: Math.round(h * ty),
            w: Math.round(w * lw),
            h: Math.round(h * hh),
          })
        }
      }
    }
  }
  return boxes
}

function scorePortraitRegion(
  ctx: CanvasRenderingContext2D,
  box: Box,
): number {
  const sample = ctx.getImageData(box.x, box.y, box.w, box.h)
  const data = sample.data
  let skin = 0
  let total = 0
  // Sample every 4th pixel for speed.
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    total++
    if (isSkinTone(r, g, b)) skin++
  }
  if (total === 0) return 0
  const density = skin / total

  // Prefer portrait aspect ratios (~3:4).
  const aspect = box.h / box.w
  const aspectScore = 1 - Math.min(1, Math.abs(aspect - 1.3) / 1.3)
  return density * (0.6 + 0.4 * aspectScore)
}

function isSkinTone(r: number, g: number, b: number): boolean {
  // Simple RGB skin heuristic covering a range of complexions.
  const rgbCond =
    r > 60 &&
    g > 30 &&
    b > 15 &&
    r > g &&
    r > b &&
    Math.abs(r - g) > 10 &&
    r - b > 15
  return rgbCond
}
