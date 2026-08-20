import { useState } from "react";
import { loadSettings, saveSettings, type BoardTheme } from "../lib/settings";
import { startMusic, stopMusic } from "../lib/audio";

export function Settings() {
  const [s, setS] = useState(loadSettings());
  function update(next: Partial<typeof s>) {
    const merged = { ...s, ...next };
    setS(merged);
    saveSettings(merged);
    if (merged.music) startMusic();
    else stopMusic();
  }
  return (
    <div className="max-w-xl space-y-5">
      <h1 className="font-display text-4xl text-brassb">Settings</h1>
      <label className="flex items-center justify-between panel-card p-4">
        <span>Music</span>
        <input type="checkbox" checked={s.music} onChange={(e) => update({ music: e.target.checked })} />
      </label>
      <label className="flex items-center justify-between panel-card p-4">
        <span>Sound effects</span>
        <input type="checkbox" checked={s.sfx} onChange={(e) => update({ sfx: e.target.checked })} />
      </label>
      <div className="panel-card p-4 space-y-2">
        <div className="font-display text-brassb">Board theme</div>
        <div className="grid grid-cols-2 gap-2">
          {(["walnut", "slate", "emerald", "rosewood"] as BoardTheme[]).map((t) => (
            <button key={t} className={`btn py-3 ${s.theme === t ? "btn-brass" : ""}`} onClick={() => update({ theme: t })}>{t}</button>
          ))}
        </div>
      </div>
      <label className="block panel-card p-4">
        Default clock (minutes)
        <input type="number" className="mt-2 w-full bg-panel2 border border-brass/30 p-2" value={s.defaultMinutes} onChange={(e) => update({ defaultMinutes: Number(e.target.value) })} />
      </label>
    </div>
  );
}
