import ExcelJS from 'exceljs'
import type { PassportFields } from '@/types/passport'
import { sanitizeFileName } from '@/lib/privacy'

/**
 * Build a professionally formatted .xlsx workbook with an embedded passport photograph.
 */
export async function generatePassportExcel(
  fields: PassportFields,
  photographDataUrl: string | null,
): Promise<{ blob: Blob; fileName: string }> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Passport Scanner'
  workbook.created = new Date()
  // Avoid embedding raw PII in workbook custom properties beyond the sheet itself.

  const sheet = workbook.addWorksheet('Passport Information', {
    properties: { defaultRowHeight: 22 },
    views: [{ showGridLines: false }],
  })

  sheet.columns = [
    { key: 'label', width: 28 },
    { key: 'value', width: 48 },
    { key: 'photo', width: 28 },
  ]

  // Title
  sheet.mergeCells('A1:B1')
  const title = sheet.getCell('A1')
  title.value = 'PASSPORT INFORMATION'
  title.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FF0B1F33' } }
  title.alignment = { vertical: 'middle', horizontal: 'left' }
  sheet.getRow(1).height = 32

  sheet.getCell('A2').value = `Generated: ${new Date().toLocaleString()}`
  sheet.getCell('A2').font = { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } }

  // Photograph column header / image
  sheet.getCell('C1').value = 'Passport Photograph'
  sheet.getCell('C1').font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF334155' } }
  sheet.getCell('C1').alignment = { horizontal: 'center' }

  if (photographDataUrl) {
    const base64 = photographDataUrl.split(',')[1]
    if (base64) {
      const imageId = workbook.addImage({
        base64,
        extension: 'jpeg',
      })
      // Embed the actual image bytes into the spreadsheet (not a file path).
      sheet.addImage(imageId, {
        tl: { col: 2.1, row: 2.2 },
        ext: { width: 160, height: 200 },
      })
    }
  } else {
    sheet.getCell('C3').value = 'No photograph detected'
    sheet.getCell('C3').font = { italic: true, color: { argb: 'FF94A3B8' } }
  }

  const rows: { label: string; value: string }[] = [
    { label: 'Full Name', value: fields.fullName.value },
    { label: 'Given Names', value: fields.givenNames.value },
    { label: 'Surname', value: fields.surname.value },
    { label: 'Date of Birth', value: fields.dateOfBirth.value },
    { label: 'Place of Birth', value: fields.placeOfBirth.value },
    { label: 'Sex', value: fields.sex.value },
    { label: 'Nationality', value: fields.nationality.value },
    { label: 'Passport Number', value: fields.passportNumber.value },
    { label: 'Issuing Country', value: fields.issuingCountry.value },
    { label: 'Issuing Authority', value: fields.issuingAuthority.value },
    { label: 'Date of Issue', value: fields.dateOfIssue.value },
    { label: 'Date of Expiry', value: fields.dateOfExpiry.value },
    { label: 'Personal/Identity Number', value: fields.personalNumber.value },
    { label: 'Document Type', value: fields.documentType.value },
    { label: 'MRZ', value: fields.mrz.value },
  ]

  let rowIndex = 4
  // Header row for the field table
  const headerRow = sheet.getRow(rowIndex)
  headerRow.values = ['Field', 'Value']
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 11 }
  headerRow.eachCell({ includeEmpty: false }, (cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' },
    }
    cell.border = thinBorder()
    cell.alignment = { vertical: 'middle' }
  })
  rowIndex++

  for (const row of rows) {
    const excelRow = sheet.getRow(rowIndex)
    excelRow.values = [row.label, row.value || '']
    excelRow.getCell(1).font = { bold: true, name: 'Calibri', color: { argb: 'FF334155' } }
    excelRow.getCell(2).font = { name: 'Calibri', color: { argb: 'FF0F172A' } }
    if (row.label === 'MRZ') {
      excelRow.height = 48
      excelRow.getCell(2).alignment = { wrapText: true, vertical: 'top' }
      excelRow.getCell(2).font = { name: 'Consolas', size: 9, color: { argb: 'FF0F172A' } }
    }
    excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber <= 2) {
        cell.border = thinBorder()
        cell.alignment = cell.alignment ?? { vertical: 'middle' }
      }
    })
    // Alternating row shading
    if (rowIndex % 2 === 0) {
      excelRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0FDFA' },
      }
      excelRow.getCell(2).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0FDFA' },
      }
    }
    rowIndex++
  }

  sheet.getCell(`A${rowIndex + 1}`).value =
    'Review note: Values were extracted by local OCR/MRZ and may require manual verification.'
  sheet.getCell(`A${rowIndex + 1}`).font = {
    name: 'Calibri',
    size: 9,
    italic: true,
    color: { argb: 'FF64748B' },
  }
  sheet.mergeCells(`A${rowIndex + 1}:B${rowIndex + 1}`)

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const namePart = sanitizeFileName(
    fields.fullName.value || fields.surname.value || 'passport',
    'passport',
  )
  const fileName = `${namePart}_passport.xlsx`

  return { blob, fileName }
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const edge: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FFCBD5E1' } }
  return { top: edge, left: edge, bottom: edge, right: edge }
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke after the download starts — do not put passport data into the address bar.
  setTimeout(() => URL.revokeObjectURL(url), 2_000)
}
