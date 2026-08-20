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
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg panel-card ${active ? "ring-1 ring-brass" : "opacity-80"}`}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-woodmid grid place-items-center font-display text-brassb">
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div className="font-display text-ink leading-tight">{name}</div>
          <div className="font-mono text-[11px] text-inkdim uppercase">{tag}</div>
        </div>
      </div>
      {clock != null && (
        <div className={`font-mono text-lg ${active ? "text-brassb" : "text-inkdim"}`}>{clock}</div>
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
