import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Chess } from "chess.js";
import { api } from "../lib/api";
import { Board } from "../components/Board";

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
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="font-display text-3xl text-brassb">Replay</h1>
      <p className="font-mono text-sm text-inkdim">{meta}</p>
      <Board chess={chess} selected={null} legal={new Set()} captures={new Set()} last={null} onSquare={() => undefined} disabled />
      <div className="flex gap-2">
        <button className="btn flex-1 py-2" onClick={() => setI(0)}>Start</button>
        <button className="btn flex-1 py-2" onClick={() => setI((n) => Math.max(0, n - 1))}>Back</button>
        <button className="btn flex-1 py-2" onClick={() => setI((n) => Math.min(sans.length, n + 1))}>Next</button>
        <button className="btn flex-1 py-2" onClick={() => setI(sans.length)}>End</button>
      </div>
    </div>
  );
}
