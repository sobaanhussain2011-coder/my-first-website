import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

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
      <div>
        <h1 className="font-display text-4xl mb-3">History</h1>
        <button className="btn btn-brass px-4 py-2" onClick={() => becomeGuest()}>Guest seat first</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl text-brassb">Game history</h1>
      {!games.length && <p className="text-inkdim">No finished games yet.</p>}
      <ul className="space-y-2">
        {games.map((g) => (
          <li key={g.id} className="panel-card p-3 flex justify-between gap-3">
            <div>
              <div className="font-display">{g.whiteName} vs {g.blackName}</div>
              <div className="font-mono text-xs text-inkdim">{g.mode} · {g.result} · {g.reason || "—"}</div>
            </div>
            <Link className="btn px-3 py-1" to={`/replay/${g.id}`}>Replay</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
