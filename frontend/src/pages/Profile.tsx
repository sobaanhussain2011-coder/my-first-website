import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

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
      <div className="space-y-4">
        <h1 className="font-display text-4xl">Profile</h1>
        <p className="text-inkdim">Take a guest seat, or sign in with Google when it is configured.</p>
        <button className="btn btn-brass px-4 py-2" onClick={() => becomeGuest()}>Guest seat</button>
        <a className="btn px-4 py-2 inline-block" href="/auth/google">Google sign-in</a>
      </div>
    );
  }

  const p = (profile || user) as { wins?: number; losses?: number; draws?: number; elo?: number; username?: string; isGuest?: boolean };

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="font-display text-4xl text-brassb">{p.username}</h1>
      <div className="grid grid-cols-4 gap-2 text-center">
        {[["ELO", p.elo], ["W", p.wins], ["L", p.losses], ["D", p.draws]].map(([k, v]) => (
          <div key={String(k)} className="panel-card p-3">
            <div className="font-mono text-xs text-inkdim">{k}</div>
            <div className="font-display text-2xl">{v ?? 0}</div>
          </div>
        ))}
      </div>
      <div className="panel-card p-4 space-y-2">
        <label className="text-sm text-inkdim">Display name</label>
        <div className="flex gap-2">
          <input className="flex-1 bg-panel2 border border-brass/30 p-2" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn px-3" onClick={async () => { await api.username(name); await refresh(); }}>Save</button>
        </div>
      </div>
      {p.isGuest && <a className="btn px-4 py-2 inline-block" href="/auth/google">Link Google</a>}
      <button className="btn px-4 py-2" onClick={() => logout()}>Leave table</button>
    </div>
  );
}
