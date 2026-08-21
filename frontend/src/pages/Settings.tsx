import { useState } from "react";
import { Field, PageHero } from "../components/Luxury";
import { loadSettings, saveSettings, type BoardTheme } from "../lib/settings";
import { startMusic, stopMusic } from "../lib/audio";

const THEMES: { id: BoardTheme; label: string }[] = [
  { id: "obsidian", label: "Obsidian" },
  { id: "walnut", label: "Walnut" },
  { id: "emerald", label: "Emerald" },
  { id: "rosewood", label: "Rosewood" },
];

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
    <div className="max-w-xl">
      <PageHero kicker="The house" title="Preferences">
        Soft lights, a quiet board, and only the sounds you want.
      </PageHero>
      <div className="space-y-4">
        <label className="flex items-center justify-between panel-card p-5 rounded-2xl">
          <span className="font-display tracking-wide">Salon music</span>
          <input type="checkbox" checked={s.music} onChange={(e) => update({ music: e.target.checked })} />
        </label>
        <label className="flex items-center justify-between panel-card p-5 rounded-2xl">
          <span className="font-display tracking-wide">Table sounds</span>
          <input type="checkbox" checked={s.sfx} onChange={(e) => update({ sfx: e.target.checked })} />
        </label>
        <div className="panel-card p-5 rounded-2xl space-y-3">
          <div className="font-display text-brassb">Cloth &amp; stone</div>
          <div className="grid grid-cols-2 gap-2">
            {THEMES.map((t) => (
              <button key={t.id} className={`btn py-3 ${s.theme === t.id ? "btn-brass" : ""}`} onClick={() => update({ theme: t.id })}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="panel-card p-5 rounded-2xl">
          <Field label="Default clock">
            <input type="number" className="lux-input" value={s.defaultMinutes} onChange={(e) => update({ defaultMinutes: Number(e.target.value) })} />
          </Field>
        </div>
      </div>
    </div>
  );
}
