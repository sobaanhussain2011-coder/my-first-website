# Walnut & Brass

Production-shaped online chess: local play, vs computer, and real Socket.IO multiplayer.

## Layout

- `frontend/` — Vite + React + TypeScript + Tailwind (Walnut & Brass design)
- `backend/` — Express + Socket.IO + Prisma (SQLite locally; swap to Postgres in production)
- `shared/` — ELO, achievement catalog, shared types

Postgres + Redis are the intended production stores. This environment has neither, so the MVP uses SQLite and an in-memory matchmaking queue. The socket protocol and server-side `chess.js` validation stay the same.

## Chrome mein kaise khole

Woh 2 commands **khud nahi chalti**. Aapke computer ki Terminal mein aapko unhe chalana hota hai.

1. Computer pe [Node.js](https://nodejs.org) install karo (LTS).
2. Ye project folder kholo.
3. Terminal mein **ek** command likho:

```bash
chmod +x start-chess.sh
./start-chess.sh
```

4. Chrome kholo.
5. Address bar mein yeh paste karke Enter:

`http://localhost:5173/play`

Jab tak Terminal band nahi karte, game Chrome mein khula rahega. Terminal band kiya to game band.

## Socket events

`matchmaking:join` / `leave` / `found` · `room:create` / `join` · `game:move` (server validates) · `game:resign` · `game:draw-offer` · `game:draw-response` · `game:chat` · `game:rematch` · `game:state` · `game:over`

Disconnects get a 30s reconnect window before forfeit.

## Auth

Guest sessions work immediately. Google OAuth is implemented and activates when `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are set.
