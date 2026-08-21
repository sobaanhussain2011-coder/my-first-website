import { Link } from "react-router-dom";
import { Chess } from "chess.js";
import { Board } from "../components/Board";
import { Ornament } from "../components/Luxury";
import { useAuth } from "../lib/AuthContext";

const preview = new Chess();

export function Home() {
  const { user, becomeGuest } = useAuth();
  return (
    <div className="grid lg:grid-cols-[1fr_1.05fr] gap-12 items-center">
      <div className="space-y-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-brass">New look · cream marble palace</p>
        <h1 className="font-display hero-title text-6xl sm:text-8xl leading-[0.88] font-semibold">
          Not the old
          <br />
          brown table.
        </h1>
        <Ornament className="max-w-sm" />
        <p className="text-inkdim text-lg leading-relaxed max-w-xl">
          Cream walls. Black-marble squares. Champagne gold. The old brown table is gone.
          This is the house look — every page, not just the board.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link className="btn btn-brass px-6 py-3.5" to="/play">Sit at the table</Link>
          <Link className="btn px-6 py-3.5" to="/play?mode=ai">Play the house</Link>
          <Link className="btn px-6 py-3.5" to="/play?mode=online">Invite a guest</Link>
        </div>
        {!user && (
          <button className="btn px-4 py-2" onClick={() => becomeGuest()}>Enter as guest</button>
        )}
      </div>
      <div className="salon-table relative">
        <p className="text-center font-mono text-[10px] tracking-[0.45em] text-brass mb-4">TABLE I · MARBLE & INK</p>
        <Board
          chess={preview}
          salon
          selected={null}
          legal={new Set()}
          captures={new Set()}
          last={{ from: "e2", to: "e4" }}
          onSquare={() => undefined}
          disabled
        />
        <p className="text-center font-display text-2xl mt-5">Ivory Court</p>
      </div>
    </div>
  );
}
