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
        <div className={`font-mono text-xl ${active ? "text-brassb" : "text-inkdim"}`}>{clock}</div>
      )}
    </div>
  );
}

export function formatMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
