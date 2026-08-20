import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

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
    return <button className="btn btn-brass px-4 py-2" onClick={() => becomeGuest()}>Guest seat first</button>;
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl text-brassb">Achievements</h1>
      <div className="grid sm:grid-cols-2 gap-3">
        {catalog.map((a) => (
          <div key={a.key} className={`panel-card p-4 ${have.has(a.key) ? "ring-1 ring-brass" : "opacity-60"}`}>
            <div className="font-display text-lg">{a.title}</div>
            <div className="text-sm text-inkdim">{a.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
