import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { Field, PageHero } from "../components/Luxury";

export function Profile() {
  const { user, becomeGuest, logout, refresh } = useAuth();
  const [name, setName] = useState(user?.username || "");
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!user) return;
    api.profile().then((d) => setProfile(d.user)).catch(() => undefined);
    setName(user.username);
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-xl">
        <PageHero kicker="Membership" title="Your name at the table">
          Take a guest seat tonight, or arrive with Google when the house has it set.
        </PageHero>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-brass px-5 py-3" onClick={() => becomeGuest()}>Guest seat</button>
          <a className="btn px-5 py-3 inline-block" href="/auth/google">Google</a>
        </div>
      </div>
    );
  }

  const p = (profile || user) as { wins?: number; losses?: number; draws?: number; elo?: number; username?: string; isGuest?: boolean };

  return (
    <div className="max-w-xl">
      <PageHero kicker="Membership" title={p.username || "Player"} />
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[["ELO", p.elo], ["Wins", p.wins], ["Losses", p.losses], ["Draws", p.draws]].map(([k, v]) => (
          <div key={String(k)} className="stat-tile rounded-2xl p-4 text-center">
            <div className="font-mono text-[10px] tracking-[0.2em] text-inkdim uppercase">{k}</div>
            <div className="font-display text-2xl text-brassb mt-1">{v ?? 0}</div>
          </div>
        ))}
      </div>
      <div className="panel-card p-5 rounded-2xl space-y-4">
        <Field label="How the room should announce you">
          <div className="flex gap-2">
            <input className="lux-input" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn btn-brass px-4" onClick={async () => { await api.username(name); await refresh(); }}>Save</button>
          </div>
        </Field>
        {p.isGuest && <a className="btn px-4 py-2 inline-block" href="/auth/google">Link Google</a>}
        <button className="btn px-4 py-2" onClick={() => logout()}>Leave the salon</button>
      </div>
    </div>
  );
}
