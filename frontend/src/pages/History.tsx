import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { PageHero } from "../components/Luxury";

type Game = {
  id: string;
  whiteName: string;
  blackName: string;
  result: string;
  reason: string | null;
  mode: string;
  endedAt: string | null;
};

export function History() {
  const { user, becomeGuest } = useAuth();
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    if (!user) return;
    api.history().then((d) => setGames(d.games || [])).catch(() => undefined);
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-xl">
        <PageHero kicker="The ledger" title="Past tables">
          Sit as a guest first, then every finished game is kept.
        </PageHero>
        <button className="btn btn-brass px-5 py-3" onClick={() => becomeGuest()}>Guest seat</button>
      </div>
    );
  }

  return (
    <div>
      <PageHero kicker="The ledger" title="Past tables">
        Reopen any finished game, move by move, as it was played.
      </PageHero>
      {!games.length && <p className="text-inkdim">The book is still blank.</p>}
      <ul className="space-y-3">
        {games.map((g) => (
          <li key={g.id} className="panel-card rounded-2xl p-5 flex justify-between items-center gap-4">
            <div>
              <div className="font-display text-lg text-ink">{g.whiteName} <span className="text-brass">vs</span> {g.blackName}</div>
              <div className="font-mono text-[11px] text-inkdim mt-1 uppercase tracking-wider">{g.mode} · {g.result} · {g.reason || "closed"}</div>
            </div>
            <Link className="btn btn-brass px-4 py-2" to={`/replay/${g.id}`}>Replay</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
