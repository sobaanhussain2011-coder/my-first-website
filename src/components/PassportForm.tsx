import type { PassportFields, FieldValue } from '@/types/passport'
import { ConfidenceIndicator } from '@/components/ConfidenceIndicator'
import clsx from 'clsx'

const FIELD_CONFIG: {
  key: keyof PassportFields
  label: string
  type?: string
  mono?: boolean
  rows?: number
}[] = [
  { key: 'fullName', label: 'Full Name' },
  { key: 'givenNames', label: 'Given Names' },
  { key: 'surname', label: 'Surname' },
  { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
  { key: 'placeOfBirth', label: 'Place of Birth' },
  { key: 'sex', label: 'Sex' },
  { key: 'nationality', label: 'Nationality' },
  { key: 'passportNumber', label: 'Passport Number' },
  { key: 'issuingCountry', label: 'Issuing Country' },
  { key: 'issuingAuthority', label: 'Issuing Authority' },
  { key: 'dateOfIssue', label: 'Date of Issue', type: 'date' },
  { key: 'dateOfExpiry', label: 'Date of Expiry', type: 'date' },
  { key: 'personalNumber', label: 'Personal/Identity Number' },
  { key: 'documentType', label: 'Document Type' },
  { key: 'mrz', label: 'MRZ', mono: true, rows: 3 },
]

interface Props {
  fields: PassportFields
  readOnly?: boolean
  onChange: (key: keyof PassportFields, value: string) => void
}

export function PassportForm({ fields, readOnly, onChange }: Props) {
  return (
    <form className="animate-fade-up space-y-3" onSubmit={(e) => e.preventDefault()} method="post">
      <fieldset disabled={readOnly} className="space-y-3">
        <legend className="sr-only">Extracted passport information</legend>
        {FIELD_CONFIG.map(({ key, label, type, mono, rows }) => {
          const field = fields[key]
          return (
            <FieldRow
              key={key}
              id={`field-${key}`}
              name={key}
              label={label}
              field={field}
              type={type}
              mono={mono}
              rows={rows}
              onChange={(value) => onChange(key, value)}
            />
          )
        })}
      </fieldset>
    </form>
  )
}

function FieldRow({
  id,
  name,
  label,
  field,
  type = 'text',
  mono,
  rows,
  onChange,
}: {
  id: string
  name: string
  label: string
  field: FieldValue
  type?: string
  mono?: boolean
  rows?: number
  onChange: (value: string) => void
}) {
  const highlight = field.needsReview || field.confidence === 'low' || field.confidence === 'missing'
  const describedBy = `${id}-confidence`

  const shared = clsx(
    'w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-ink transition',
    highlight
      ? 'border-warn/50 ring-2 ring-amber-200/80'
      : 'border-ink/12 focus:border-teal',
    mono && 'font-mono text-xs',
  )

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        <span id={describedBy}>
          <ConfidenceIndicator level={field.confidence} needsReview={field.needsReview} />
        </span>
      </div>
      {rows ? (
        <textarea
          id={id}
          name={name}
          rows={rows}
          value={field.value}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
          className={shared}
          autoComplete="off"
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          value={field.value}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
          className={shared}
          autoComplete="off"
          spellCheck={false}
        />
      )}
    </div>
  )
}
