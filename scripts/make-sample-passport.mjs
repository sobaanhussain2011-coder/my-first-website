import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'tmp-smoke')
mkdirSync(outDir, { recursive: true })

/**
 * Build a simple one-page PDF with passport-like labels + TD3 MRZ.
 * Used for end-to-end OCR/MRZ smoke testing in the browser.
 */
function buildPassportPdf() {
  const lines = [
    'PASSPORT',
    'Surname / Nom: ERIKSSON',
    'Given names / Prenoms: ANNA MARIA',
    'Nationality: UTOPIAN',
    'Date of birth: 12 AUG 1974',
    'Sex: F',
    'Passport No: L898902C3',
    'Date of issue: 16 APR 2007',
    'Date of expiry: 15 APR 2012',
    'Authority: CITIZENSHIP OFFICE',
    'Place of birth: STOCKHOLM',
    '',
    'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<',
    'L898902C36UTO7408122F1204159ZE184226B<<<<<10',
  ]

  const contentParts = ['BT', '/F1 11 Tf', '50 780 Td', '14 TL']
  lines.forEach((line, i) => {
    const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
    if (i === 0) {
      contentParts.push(`/F1 18 Tf (${escaped}) Tj`, 'T*', '/F1 11 Tf')
    } else if (i >= lines.length - 2) {
      contentParts.push(`/F1 9 Tf (${escaped}) Tj`, 'T*')
    } else {
      contentParts.push(`(${escaped}) Tj`, 'T*')
    }
  })
  contentParts.push('ET')
  const stream = contentParts.join('\n')

  const objects = []
  objects.push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n')
  objects.push('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n')
  objects.push(
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n',
  )
  objects.push(
    `4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream\nendobj\n`,
  )
  objects.push('5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>endobj\n')

  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += obj
  }
  const xrefPos = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`

  return Buffer.from(pdf, 'utf8')
}

const pdfPath = join(outDir, 'sample-passport.pdf')
writeFileSync(pdfPath, buildPassportPdf())
console.log('Wrote', pdfPath)
