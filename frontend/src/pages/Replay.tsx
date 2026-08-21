import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Chess } from "chess.js";
import { api } from "../lib/api";
import { Board } from "../components/Board";
import { PageHero } from "../components/Luxury";

export function Replay() {
  const { id } = useParams();
  const [sans, setSans] = useState<string[]>([]);
  const [i, setI] = useState(0);
  const [meta, setMeta] = useState("");

  useEffect(() => {
    if (!id) return;
    api.game(id).then((d) => {
      setSans((d.game.moves || []).map((m: { san: string }) => m.san));
      setMeta(`${d.game.whiteName} vs ${d.game.blackName} · ${d.game.result}`);
      setI(0);
    }).catch(() => undefined);
  }, [id]);

  const chess = new Chess();
  for (let n = 0; n < i; n++) chess.move(sans[n]);

  return (
    <div className="max-w-xl mx-auto">
      <PageHero kicker="The book" title="Replay">
        {meta || "Turning the pages of a finished game."}
      </PageHero>
      <div className="salon-table mb-6">
        <Board chess={chess} selected={null} legal={new Set()} captures={new Set()} last={null} onSquare={() => undefined} disabled />
      </div>
      <div className="grid grid-cols-4 gap-2">
        <button className="btn py-3" onClick={() => setI(0)}>Start</button>
        <button className="btn py-3" onClick={() => setI((n) => Math.max(0, n - 1))}>Back</button>
        <button className="btn btn-brass py-3" onClick={() => setI((n) => Math.min(sans.length, n + 1))}>Next</button>
        <button className="btn py-3" onClick={() => setI(sans.length)}>End</button>
      </div>
    </div>
  );
}
