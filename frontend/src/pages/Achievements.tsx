import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { PageHero } from "../components/Luxury";

type Def = { key: string; title: string; description: string };

export function Achievements() {
  const { user, becomeGuest } = useAuth();
  const [catalog, setCatalog] = useState<Def[]>([]);
  const [have, setHave] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    api.profile().then((d) => {
      setCatalog(d.catalog || []);
      setHave(new Set((d.user?.achievements || []).map((a: { achievementKey: string }) => a.achievementKey)));
    }).catch(() => undefined);
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-xl">
        <PageHero kicker="Honours" title="Marks of play" />
        <button className="btn btn-brass px-5 py-3" onClick={() => becomeGuest()}>Guest seat</button>
      </div>
    );
  }

  return (
    <div>
      <PageHero kicker="Honours" title="Marks of play">
        Little medals for first blood, streaks, and a mate well delivered.
      </PageHero>
      <div className="grid sm:grid-cols-2 gap-4">
        {catalog.map((a) => (
          <div key={a.key} className={`panel-card rounded-2xl p-5 ${have.has(a.key) ? "ring-1 ring-brass shadow-[0_0_24px_#e0b25733]" : "opacity-50"}`}>
            <div className="font-mono text-[10px] tracking-[0.3em] text-brass mb-2">{have.has(a.key) ? "AWARDED" : "LOCKED"}</div>
            <div className="font-display text-xl text-ink">{a.title}</div>
            <div className="text-sm text-inkdim mt-1">{a.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
