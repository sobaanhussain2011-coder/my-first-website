import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

const links = [
  ["/", "Home"],
  ["/play", "Play"],
  ["/history", "History"],
  ["/achievements", "Honours"],
  ["/profile", "Profile"],
  ["/settings", "Settings"],
];

export function Shell() {
  const { user } = useAuth();
  return (
    <div className="felt-bg min-h-screen">
      <header className="topbar px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <div className="font-display text-xl tracking-[0.28em] text-brass">IVORY COURT</div>
          <div className="text-[10px] font-mono tracking-[0.35em] text-inkdim mt-0.5">CREAM MARBLE · NEW LOOK</div>
        </div>
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-[11px] uppercase tracking-[0.22em] font-mono text-inkdim">
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (isActive ? "text-brass" : "hover:text-ink")}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="font-mono text-[11px] text-brass">
          {user ? `${user.username} · ${user.elo}` : "Guest"}
        </div>
      </header>
      <main className="px-5 py-10 max-w-6xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
