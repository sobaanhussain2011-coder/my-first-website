/**
 * Node smoke tests for MRZ parsing + Excel generation (no DOM OCR).
 * Run: node --experimental-strip-types scripts/smoke-test.mjs
 * Or: node scripts/smoke-test.mjs after build helpers.
 */
import { createRequire } from 'node:module'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { parse } = require('mrz')
const ExcelJS = require('exceljs')

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'tmp-smoke')
mkdirSync(outDir, { recursive: true })

const mrz = [
  'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<',
  'L898902C36UTO7408122F1204159ZE184226B<<<<<10',
]

const result = parse(mrz)
if (!result.fields.lastName || !result.fields.documentNumber) {
  console.error('FAIL: MRZ parse missing required fields')
  process.exit(1)
}
console.log('OK: MRZ parse', {
  lastName: result.fields.lastName,
  firstName: result.fields.firstName,
  documentNumber: result.fields.documentNumber,
  valid: result.valid,
})

const workbook = new ExcelJS.Workbook()
const sheet = workbook.addWorksheet('Passport Information')
sheet.getCell('A1').value = 'PASSPORT INFORMATION'
sheet.getCell('A4').value = 'Full Name'
sheet.getCell('B4').value = `${result.fields.lastName}, ${result.fields.firstName}`
sheet.getCell('A5').value = 'Passport Number'
sheet.getCell('B5').value = result.fields.documentNumber
sheet.getCell('A6').value = 'MRZ'
sheet.getCell('B6').value = mrz.join('\n')

// Tiny 1x1 JPEG for embed test
const tinyJpeg = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z',
  'base64',
)
const imageId = workbook.addImage({ buffer: tinyJpeg, extension: 'jpeg' })
sheet.addImage(imageId, { tl: { col: 2, row: 2 }, ext: { width: 40, height: 40 } })

const outPath = join(outDir, 'smoke-passport.xlsx')
await workbook.xlsx.writeFile(outPath)
console.log('OK: Excel written to', outPath)
console.log('SMOKE PASS')
