import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export function Home() {
  const { user, becomeGuest } = useAuth();
  return (
    <div className="max-w-3xl space-y-6">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-brass">Private study · members' table</p>
      <h1 className="font-display text-5xl text-ink">Walnut & Brass</h1>
      <p className="text-inkdim leading-relaxed">
        Standard international chess. Local pass-and-play, a computer opponent, and a live table
        against another person. No invented rules. The server is the authority for every online move.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link className="btn btn-brass px-5 py-3" to="/play">Sit down</Link>
        <Link className="btn px-5 py-3" to="/play?mode=ai">Vs computer</Link>
        <Link className="btn px-5 py-3" to="/play?mode=online">Quick match</Link>
      </div>
      {!user && (
        <button className="btn px-4 py-2" onClick={() => becomeGuest()}>Continue as guest</button>
      )}
      <p className="text-sm text-inkdim">
        Google sign-in is available when the host sets <span className="font-mono">GOOGLE_CLIENT_ID</span>.
        Guest play works now.
      </p>
    </div>
  );
}
