import type { ReactNode } from "react";

export function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-hidden>
      <span className="h-px flex-1 gold-line" />
      <span className="text-brass text-[10px] tracking-[0.4em]">◆</span>
      <span className="h-px flex-1 gold-line" />
    </div>
  );
}

export function PageHero({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 max-w-2xl">
      <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-brass">{kicker}</p>
      <h1 className="font-display text-4xl sm:text-5xl mt-2 mb-3 text-ink">{title}</h1>
      <Ornament className="max-w-xs mb-4" />
      {children && <p className="text-inkdim leading-relaxed">{children}</p>}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-[11px] uppercase tracking-[0.2em] font-mono text-inkdim">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}
