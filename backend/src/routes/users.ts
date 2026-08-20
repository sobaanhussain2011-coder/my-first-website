import { Router } from "express";
import { prisma } from "../db.js";
import { ACHIEVEMENTS } from "../catalog.js";
import type { AuthedUser } from "../auth.js";

export const usersRouter = Router();

usersRouter.get("/profile", async (req, res) => {
  const user = (req as typeof req & { user?: AuthedUser | null }).user;
  if (!user) {
    res.status(401).json({ error: "Sign in required." });
    return;
  }
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    include: { achievements: true },
  });
  res.json({
    user: row,
    catalog: ACHIEVEMENTS,
  });
});

usersRouter.post("/username", async (req, res) => {
  const user = (req as typeof req & { user?: AuthedUser | null }).user;
  if (!user) {
    res.status(401).json({ error: "Sign in required." });
    return;
  }
  const username = String(req.body?.username || "").trim().slice(0, 24);
  if (username.length < 2) {
    res.status(400).json({ error: "Name is too short." });
    return;
  }
  const row = await prisma.user.update({
    where: { id: user.id },
    data: { username },
  });
  res.json({ user: row });
});
