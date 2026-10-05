import { Search } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'Search documents…' }: Props) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink/35" />
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-ink/12 bg-white py-2.5 pr-3 pl-10 text-sm text-ink placeholder:text-ink/35"
        autoComplete="off"
        enterKeyHint="search"
        aria-label="Search documents"
      />
    </div>
  )
}
