import { Router } from "express";
import { createGuest, publicUser, signUser, type AuthedUser } from "../auth.js";
import { prisma } from "../db.js";

export const authRouter = Router();

authRouter.post("/guest", async (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username : undefined;
  const user = await createGuest(username);
  const payload: AuthedUser = { id: user.id, username: user.username, isGuest: true, elo: user.elo };
  const token = signUser(payload);
  res.cookie("wb", token, { httpOnly: true, sameSite: "lax", maxAge: 30 * 24 * 3600 * 1000 });
  res.json({ token, user: payload });
});

authRouter.get("/me", async (req, res) => {
  const user = (req as typeof req & { user?: AuthedUser | null }).user;
  if (!user) {
    res.json({ user: null });
    return;
  }
  const fresh = await publicUser(user.id);
  res.json({ user: fresh, token: signUser({
    id: user.id,
    username: fresh?.username || user.username,
    isGuest: fresh?.isGuest ?? user.isGuest,
    elo: fresh?.elo ?? user.elo,
  }) });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("wb");
  res.json({ ok: true });
});

authRouter.get("/google", (_req, res) => {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) {
    res.status(501).json({
      error: "Google sign-in is configured when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set.",
    });
    return;
  }
  const redirect = process.env.GOOGLE_CALLBACK || "http://localhost:4000/auth/google/callback";
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", id);
  url.searchParams.set("redirect_uri", redirect);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  res.redirect(url.toString());
});

authRouter.get("/google/callback", async (req, res) => {
  const code = String(req.query.code || "");
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  const redirect = process.env.GOOGLE_CALLBACK || "http://localhost:4000/auth/google/callback";
  const origin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  if (!id || !secret || !code) {
    res.redirect(`${origin}/?auth=google-unconfigured`);
    return;
  }
  const body = new URLSearchParams({
    code,
    client_id: id,
    client_secret: secret,
    redirect_uri: redirect,
    grant_type: "authorization_code",
  });
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body });
  const tokens = await tokenRes.json() as { access_token?: string };
  if (!tokens.access_token) {
    res.redirect(`${origin}/?auth=google-failed`);
    return;
  }
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = await profileRes.json() as { id?: string; email?: string; name?: string };
  if (!profile.id) {
    res.redirect(`${origin}/?auth=google-failed`);
    return;
  }
  const user = await prisma.user.upsert({
    where: { googleId: profile.id },
    update: { email: profile.email, isGuest: false, username: profile.name || "Player" },
    create: {
      googleId: profile.id,
      email: profile.email,
      username: (profile.name || "Player").slice(0, 24),
      isGuest: false,
    },
  });
  const token = signUser({ id: user.id, username: user.username, isGuest: false, elo: user.elo });
  res.cookie("wb", token, { httpOnly: true, sameSite: "lax", maxAge: 30 * 24 * 3600 * 1000 });
  res.redirect(`${origin}/?token=${encodeURIComponent(token)}`);
});
