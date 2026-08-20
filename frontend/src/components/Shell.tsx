import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

const links = [
  ["/", "Home"],
  ["/play", "Play"],
  ["/history", "History"],
  ["/achievements", "Achievements"],
  ["/profile", "Profile"],
  ["/settings", "Settings"],
];

export function Shell() {
  const { user } = useAuth();
  return (
    <div className="felt-bg min-h-screen">
      <header className="border-b border-brass/20 px-4 py-3 flex items-center justify-between gap-4">
        <div className="font-display text-xl text-brassb tracking-wide">Walnut & Brass</div>
        <nav className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] font-mono text-inkdim">
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
        <div className="font-mono text-xs text-inkdim">
          {user ? `${user.username} · ${user.elo}` : "Guest"}
        </div>
      </header>
      <main className="px-4 py-6 max-w-6xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
