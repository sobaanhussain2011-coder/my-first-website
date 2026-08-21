export function PlayerRow({
  name,
  tag,
  clock,
  active,
}: {
  name: string;
  tag: string;
  clock?: string;
  active?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl panel-card ${active ? "ring-1 ring-brass shadow-[0_0_24px_#e0b25733]" : "opacity-75"}`}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full grid place-items-center font-display text-sm text-[#1a1208] bg-gradient-to-br from-[#ffe7a8] to-[#c9922e]">
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div className="font-display tracking-wide text-ink leading-tight">{name}</div>
          <div className="font-mono text-[11px] text-inkdim uppercase">{tag}</div>
        </div>
      </div>
      {clock != null && (
        <div className={`font-mono text-2xl tracking-wider tabular-nums ${active ? "text-brass" : "text-inkdim"}`}>{clock}</div>
      )}
    </div>
  );
}

export { formatMs } from "../lib/clock";
