import { Link } from "react-router-dom";
import { Chess } from "chess.js";
import { Board } from "../components/Board";
import { useAuth } from "../lib/AuthContext";

const preview = new Chess();

export function Home() {
  const { user, becomeGuest } = useAuth();
  return (
    <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
      <div className="space-y-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-brass">Midnight table · live rules</p>
        <h1 className="font-display hero-title text-6xl sm:text-7xl leading-[0.95] font-black">
          Walnut
          <br />
          &amp; Brass
        </h1>
        <p className="text-inkdim text-lg leading-relaxed max-w-xl">
          A private chess room in the dark: ivory and obsidian squares, gold-cut pieces,
          and real international rules. Play here, against the machine, or across the wire.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link className="btn btn-brass px-6 py-3.5" to="/play">Enter the table</Link>
          <Link className="btn px-6 py-3.5" to="/play?mode=ai">Challenge the engine</Link>
          <Link className="btn px-6 py-3.5" to="/play?mode=online">Quick match</Link>
        </div>
        {!user && (
          <button className="btn px-4 py-2" onClick={() => becomeGuest()}>Take a guest seat</button>
        )}
      </div>
      <div className="relative">
        <div className="absolute -inset-6 rounded-[32px] bg-[#e0b25722] blur-3xl" />
        <Board
          chess={preview}
          selected={null}
          legal={new Set()}
          captures={new Set()}
          last={{ from: "e2", to: "e4" }}
          onSquare={() => undefined}
          disabled
        />
      </div>
    </div>
  );
}
