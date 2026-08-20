import { Router } from "express";
import { prisma } from "../db.js";
import type { AuthedUser } from "../auth.js";

export const gamesRouter = Router();

gamesRouter.get("/history", async (req, res) => {
  const user = (req as typeof req & { user?: AuthedUser | null }).user;
  if (!user) {
    res.json({ games: [] });
    return;
  }
  const games = await prisma.game.findMany({
    where: { OR: [{ whiteId: user.id }, { blackId: user.id }], status: "over" },
    orderBy: { endedAt: "desc" },
    take: 50,
  });
  res.json({ games });
});

gamesRouter.get("/:id", async (req, res) => {
  const game = await prisma.game.findUnique({
    where: { id: req.params.id },
    include: { moves: { orderBy: { ply: "asc" } } },
  });
  if (!game) {
    res.status(404).json({ error: "Game not found." });
    return;
  }
  res.json({ game });
});

gamesRouter.post("/offline", async (req, res) => {
  const user = (req as typeof req & { user?: AuthedUser | null }).user;
  const body = req.body as {
    mode?: string;
    pgn?: string;
    fen?: string;
    result?: string;
    reason?: string;
    whiteName?: string;
    blackName?: string;
    minutes?: number;
    increment?: number;
    aiLevel?: string;
  };
  const game = await prisma.game.create({
    data: {
      mode: body.mode || "local",
      rated: false,
      timePreset: body.minutes ? String(body.minutes) : "none",
      minutes: Number(body.minutes || 0),
      increment: Number(body.increment || 0),
      whiteId: user?.id,
      blackId: null,
      whiteName: body.whiteName || "White",
      blackName: body.blackName || "Black",
      pgn: body.pgn || "",
      fen: body.fen || "",
      result: body.result || "*",
      reason: body.reason,
      status: "over",
      endedAt: new Date(),
    },
  });
  res.json({ game });
});
