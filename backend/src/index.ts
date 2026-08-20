import "dotenv/config";
import http from "node:http";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import { prisma, seedAchievements } from "./db.js";
import { optionalAuth } from "./auth.js";
import { authRouter } from "./routes/auth.js";
import { gamesRouter } from "./routes/games.js";
import { usersRouter } from "./routes/users.js";
import { attachSockets } from "./socket.js";

const app = express();
const origin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.use(cors({ origin, credentials: true }));
app.use(express.json({ limit: "200kb" }));
app.use(cookieParser());
app.use(optionalAuth);

app.get("/health", (_req, res) => res.json({ ok: true, name: "Walnut & Brass" }));
app.use("/auth", authRouter);
app.use("/games", gamesRouter);
app.use("/users", usersRouter);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin, credentials: true },
});
attachSockets(io);

const port = Number(process.env.PORT || 4000);

async function main() {
  await seedAchievements();
  server.listen(port, () => {
    console.log(`Walnut & Brass API on :${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  void prisma.$disconnect();
  process.exit(1);
});
