import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "./db.js";

const SECRET = process.env.JWT_SECRET || "walnut-brass-dev-secret-change-me";

export type AuthedUser = {
  id: string;
  username: string;
  isGuest: boolean;
  elo: number;
};

export function signUser(user: AuthedUser) {
  return jwt.sign(user, SECRET, { expiresIn: "30d" });
}

export function readToken(req: Request): AuthedUser | null {
  const header = req.headers.authorization?.replace("Bearer ", "");
  const cookie = (req as Request & { cookies?: Record<string, string> }).cookies?.wb;
  const token = header || cookie;
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET) as AuthedUser;
  } catch {
    return null;
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  (req as Request & { user?: AuthedUser | null }).user = readToken(req);
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = readToken(req);
  if (!user) {
    res.status(401).json({ error: "Sign in required." });
    return;
  }
  (req as Request & { user?: AuthedUser }).user = user;
  next();
}

export async function createGuest(username?: string) {
  const name = (username || `Guest ${Math.floor(1000 + Math.random() * 9000)}`).slice(0, 24);
  return prisma.user.create({
    data: { username: name, isGuest: true },
  });
}

export async function publicUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      isGuest: true,
      elo: true,
      wins: true,
      losses: true,
      draws: true,
      checkmates: true,
      createdAt: true,
    },
  });
}
