import type { Server } from "socket.io";
import jwt from "jsonwebtoken";
import type { AuthedUser } from "./auth.js";
import { enqueue, leave, tryMatch } from "./matchmaking.js";
import {
  addChat,
  answerDraw,
  bindSocket,
  createFriendRoom,
  getRoom,
  handleDisconnect,
  joinByCode,
  offerDraw,
  playMove,
  publicState,
  rematch,
  resign,
} from "./rooms.js";
import { createMatchedRoom } from "./rooms.js";

const SECRET = process.env.JWT_SECRET || "walnut-brass-dev-secret-change-me";

function userFromHandshake(token?: string): AuthedUser | null {
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET) as AuthedUser;
  } catch {
    return null;
  }
}

export function attachSockets(io: Server) {
  io.use((socket, next) => {
    const token = String(socket.handshake.auth?.token || "");
    const user = userFromHandshake(token);
    if (!user) {
      next(new Error("auth"));
      return;
    }
    (socket.data as { user: AuthedUser }).user = user;
    next();
  });

  io.on("connection", (socket) => {
    const user = (socket.data as { user: AuthedUser }).user;

    socket.on("matchmaking:join", (payload: { minutes?: number; increment?: number }) => {
      enqueue(user, socket.id, Number(payload?.minutes || 5), Number(payload?.increment || 0));
      const pair = tryMatch();
      if (!pair) {
        socket.emit("matchmaking:waiting");
        return;
      }
      const room = createMatchedRoom(pair[0].user, pair[1].user, {
        minutes: pair[0].minutes,
        increment: pair[0].increment,
      });
      io.sockets.sockets.get(pair[0].socketId)?.emit("matchmaking:found", { roomId: room.id });
      io.sockets.sockets.get(pair[1].socketId)?.emit("matchmaking:found", { roomId: room.id });
    });

    socket.on("matchmaking:leave", () => leave(user.id));

    socket.on("room:create", (payload: { minutes?: number; increment?: number; rated?: boolean }, cb) => {
      const room = createFriendRoom(user, {
        minutes: Number(payload?.minutes || 0),
        increment: Number(payload?.increment || 0),
        rated: Boolean(payload?.rated),
      });
      bindSocket(room, user, socket);
      cb?.({ ok: true, room: publicState(room) });
      socket.emit("game:state", publicState(room));
    });

    socket.on("room:join", (payload: { code?: string; roomId?: string }, cb) => {
      try {
        const room = payload?.roomId ? getRoom(payload.roomId) : joinByCode(user, String(payload?.code || ""));
        if (!room) throw new Error("Room not found.");
        if (payload?.roomId && room.white?.userId !== user.id && room.black?.userId !== user.id) {
          throw new Error("Not seated in this room.");
        }
        if (payload?.code) {
          const joined = joinByCode(user, String(payload.code));
          bindSocket(joined, user, socket);
          io.to(joined.id).emit("game:state", publicState(joined));
          cb?.({ ok: true, room: publicState(joined) });
          return;
        }
        bindSocket(room, user, socket);
        io.to(room.id).emit("game:state", publicState(room));
        cb?.({ ok: true, room: publicState(room) });
      } catch (err) {
        cb?.({ ok: false, error: err instanceof Error ? err.message : "Join failed." });
      }
    });

    socket.on("game:move", (payload: { from: string; to: string; promotion?: "q" | "r" | "b" | "n" }, cb) => {
      const room = [...(socket.rooms)].map(getRoom).find(Boolean);
      const live = getRoom([...socket.rooms].find((id) => getRoom(id)) || "");
      try {
        if (!live) throw new Error("Not in a game.");
        const result = playMove(live, user, payload as { from: "a1"; to: "a2"; promotion?: "q" | "r" | "b" | "n" });
        io.to(live.id).emit("game:state", publicState(live));
        io.to(live.id).emit("game:move", result);
        if (result.over) io.to(live.id).emit("game:over", { result: live.result, reason: live.reason });
        cb?.({ ok: true });
      } catch (err) {
        cb?.({ ok: false, error: err instanceof Error ? err.message : "Illegal move." });
        void room;
      }
    });

    socket.on("game:resign", () => {
      const live = getRoom([...socket.rooms].find((id) => getRoom(id)) || "");
      if (!live) return;
      resign(live, user);
      io.to(live.id).emit("game:state", publicState(live));
      io.to(live.id).emit("game:over", { result: live.result, reason: live.reason });
    });

    socket.on("game:draw-offer", () => {
      const live = getRoom([...socket.rooms].find((id) => getRoom(id)) || "");
      if (!live) return;
      offerDraw(live, user);
      io.to(live.id).emit("game:state", publicState(live));
    });

    socket.on("game:draw-response", (payload: { accept: boolean }) => {
      const live = getRoom([...socket.rooms].find((id) => getRoom(id)) || "");
      if (!live) return;
      answerDraw(live, user, Boolean(payload?.accept));
      io.to(live.id).emit("game:state", publicState(live));
      if (live.status === "over") io.to(live.id).emit("game:over", { result: live.result, reason: live.reason });
    });

    socket.on("game:chat", (payload: { text: string }) => {
      const live = getRoom([...socket.rooms].find((id) => getRoom(id)) || "");
      if (!live) return;
      addChat(live, user, String(payload?.text || ""));
      io.to(live.id).emit("game:state", publicState(live));
    });

    socket.on("game:rematch", (cb) => {
      const live = getRoom([...socket.rooms].find((id) => getRoom(id)) || "");
      if (!live) return;
      try {
        const next = rematch(live);
        cb?.({ ok: true, roomId: next.id });
        io.to(live.id).emit("game:rematch", { roomId: next.id });
      } catch (err) {
        cb?.({ ok: false, error: err instanceof Error ? err.message : "Rematch failed." });
      }
    });

    socket.on("disconnect", () => {
      leave(user.id);
      handleDisconnect(io, socket);
    });
  });
}
