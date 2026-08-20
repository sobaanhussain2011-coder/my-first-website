import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/AuthContext";
import { Shell } from "./components/Shell";
import { Home } from "./pages/Home";
import { Play } from "./pages/Play";
import { Settings } from "./pages/Settings";
import { Profile } from "./pages/Profile";
import { History } from "./pages/History";
import { Achievements } from "./pages/Achievements";
import { Replay } from "./pages/Replay";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<Home />} />
          <Route path="/play" element={<Play />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/history" element={<History />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/replay/:id" element={<Replay />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
