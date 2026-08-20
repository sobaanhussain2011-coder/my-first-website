# Walnut & Brass

Production-shaped online chess: local play, vs computer, and real Socket.IO multiplayer.

## Layout

- `frontend/` — Vite + React + TypeScript + Tailwind (Walnut & Brass design)
- `backend/` — Express + Socket.IO + Prisma (SQLite locally; swap to Postgres in production)
- `shared/` — ELO, achievement catalog, shared types

Postgres + Redis are the intended production stores. This environment has neither, so the MVP uses SQLite and an in-memory matchmaking queue. The socket protocol and server-side `chess.js` validation stay the same.

## Run

```bash
cd backend
cp .env.example .env   # already present in this repo for local demo
npx prisma migrate dev --name init
npm run dev

cd ../frontend
npm install
npm run dev
```

Open http://localhost:5173

## Socket events

`matchmaking:join` / `leave` / `found` · `room:create` / `join` · `game:move` (server validates) · `game:resign` · `game:draw-offer` · `game:draw-response` · `game:chat` · `game:rematch` · `game:state` · `game:over`

Disconnects get a 30s reconnect window before forfeit.

## Auth

Guest sessions work immediately. Google OAuth is implemented and activates when `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are set.
