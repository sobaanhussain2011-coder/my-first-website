import { useId } from 'react'
import clsx from 'clsx'
import type { ConfidenceLevel } from '@/types/passport'

const labels: Record<ConfidenceLevel, string> = {
  high: 'High confidence',
  medium: 'Needs review',
  low: 'Low confidence',
  missing: 'Missing — enter manually',
}

export function ConfidenceIndicator({
  level,
  needsReview,
}: {
  level: ConfidenceLevel
  needsReview: boolean
}) {
  const id = useId()
  const show = needsReview || level === 'low' || level === 'missing' || level === 'medium'

  if (!show && level === 'high') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ok" title={labels.high}>
        <span className="h-1.5 w-1.5 rounded-full bg-ok" />
        Verified
      </span>
    )
  }

  return (
    <span
      id={id}
      className={clsx(
        'inline-flex items-center gap-1 text-[11px] font-medium',
        level === 'missing' && 'text-danger',
        level === 'low' && 'text-coral',
        level === 'medium' && 'text-warn',
        level === 'high' && 'text-ok',
      )}
      title={labels[level]}
    >
      <span
        className={clsx(
          'h-1.5 w-1.5 rounded-full',
          level === 'missing' && 'bg-danger',
          level === 'low' && 'bg-coral',
          level === 'medium' && 'bg-warn',
          level === 'high' && 'bg-ok',
        )}
      />
      {labels[level]}
    </span>
  )
}
