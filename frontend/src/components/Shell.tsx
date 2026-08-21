import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

const links = [
  ["/", "Home"],
  ["/play", "Play"],
  ["/history", "History"],
  ["/achievements", "Marks"],
  ["/profile", "Profile"],
  ["/settings", "Settings"],
];

export function Shell() {
  const { user } = useAuth();
  return (
    <div className="felt-bg min-h-screen">
      <header className="px-4 py-4 flex items-center justify-between gap-4 border-b border-white/5">
        <div>
          <div className="font-display text-lg tracking-[0.22em] text-brassb">THE GOLD ROOM</div>
          <div className="gold-line mt-1 w-40" />
        </div>
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] uppercase tracking-[0.2em] font-mono text-inkdim">
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? "text-brassb" : "hover:text-ink")}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="font-mono text-[11px] text-brassb/80">
          {user ? `${user.username} · ${user.elo}` : "Guest table"}
        </div>
      </header>
      <main className="px-4 py-8 max-w-6xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
