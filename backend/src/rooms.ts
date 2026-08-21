import { randomBytes } from "node:crypto";
import type { Server, Socket } from "socket.io";
import { prisma } from "./db.js";
import { applyMove, newChess, outcome, type ServerMove } from "./chessRules.js";
import { finishRated, recordUnrated } from "./ratings.js";
import type { AuthedUser } from "./auth.js";

export type Seat = {
  userId: string;
  username: string;
  elo: number;
  socketId: string | null;
  connected: boolean;
  color: "w" | "b";
};

export type LiveRoom = {
  id: string;
  code: string | null;
  mode: "online" | "friend";
  rated: boolean;
  fen: string;
  pgn: string;
  ply: number;
  white: Seat | null;
  black: Seat | null;
  drawOffer: "w" | "b" | null;
  chat: { id: string; userId: string; username: string; text: string; at: number }[];
  minutes: number;
  increment: number;
  whiteMs: number;
  blackMs: number;
  lastTick: number | null;
  status: "waiting" | "active" | "over";
  result: string;
  reason: string | null;
  disconnectDeadline: { color: "w" | "b"; at: number } | null;
  dbId: string | null;
};

const rooms = new Map<string, LiveRoom>();
const bySocket = new Map<string, string>();

export function getRoom(id: string) {
  return rooms.get(id);
}

export function allRooms() {
  return [...rooms.values()];
}

export function roomForSocket(socketId: string) {
  const id = bySocket.get(socketId);
  return id ? rooms.get(id) : undefined;
}

function code() {
  return randomBytes(3).toString("hex").toUpperCase();
}

export function createFriendRoom(user: AuthedUser, time: { minutes: number; increment: number; rated: boolean }) {
  const id = randomBytes(8).toString("hex");
  const room: LiveRoom = {
    id,
    code: code(),
    mode: "friend",
    rated: time.rated,
    fen: newChess().fen(),
    pgn: "",
    ply: 0,
    white: seat(user, "w"),
    black: null,
    drawOffer: null,
    chat: [],
    minutes: time.minutes,
    increment: time.increment,
    whiteMs: time.minutes > 0 ? time.minutes * 60_000 : 0,
    blackMs: time.minutes > 0 ? time.minutes * 60_000 : 0,
    lastTick: null,
    status: "waiting",
    result: "*",
    reason: null,
    disconnectDeadline: null,
    dbId: null,
  };
  rooms.set(id, room);
  return room;
}

export function createMatchedRoom(a: AuthedUser, b: AuthedUser, time: { minutes: number; increment: number }) {
  const id = randomBytes(8).toString("hex");
  const whiteFirst = Math.random() < 0.5;
  const room: LiveRoom = {
    id,
    code: null,
    mode: "online",
    rated: true,
    fen: newChess().fen(),
    pgn: "",
    ply: 0,
    white: seat(whiteFirst ? a : b, "w"),
    black: seat(whiteFirst ? b : a, "b"),
    drawOffer: null,
    chat: [],
    minutes: time.minutes,
    increment: time.increment,
    whiteMs: time.minutes > 0 ? time.minutes * 60_000 : 0,
    blackMs: time.minutes > 0 ? time.minutes * 60_000 : 0,
    lastTick: Date.now(),
    status: "active",
    result: "*",
    reason: null,
    disconnectDeadline: null,
    dbId: null,
  };
  rooms.set(id, room);
  return room;
}

function seat(user: AuthedUser, color: "w" | "b"): Seat {
  return {
    userId: user.id,
    username: user.username,
    elo: user.elo,
    socketId: null,
    connected: false,
    color,
  };
}

export function joinByCode(user: AuthedUser, joinCode: string) {
  const room = [...rooms.values()].find((r) => r.code === joinCode.toUpperCase() && r.status !== "over");
  if (!room) throw new Error("Room not found.");
  if (room.white?.userId === user.id || room.black?.userId === user.id) return room;
  if (room.black) throw new Error("Room is full.");
  room.black = seat(user, "b");
  room.status = "active";
  room.lastTick = Date.now();
  return room;
}

export function bindSocket(room: LiveRoom, user: AuthedUser, socket: Socket) {
  const side = room.white?.userId === user.id ? room.white : room.black?.userId === user.id ? room.black : null;
  if (!side) throw new Error("You are not seated in this room.");
  if (side.socketId) bySocket.delete(side.socketId);
  side.socketId = socket.id;
  side.connected = true;
  bySocket.set(socket.id, room.id);
  if (room.disconnectDeadline?.color === side.color) room.disconnectDeadline = null;
  socket.join(room.id);
}

export function publicState(room: LiveRoom) {
  tickClocks(room);
  return {
    id: room.id,
    code: room.code,
    mode: room.mode,
    rated: room.rated,
    fen: room.fen,
    pgn: room.pgn,
    ply: room.ply,
    status: room.status,
    result: room.result,
    reason: room.reason,
    drawOffer: room.drawOffer,
    minutes: room.minutes,
    increment: room.increment,
    whiteMs: room.whiteMs,
    blackMs: room.blackMs,
    white: room.white && { userId: room.white.userId, username: room.white.username, elo: room.white.elo, connected: room.white.connected },
    black: room.black && { userId: room.black.userId, username: room.black.username, elo: room.black.elo, connected: room.black.connected },
    chat: room.chat,
    reconnecting: room.disconnectDeadline,
  };
}

function tickClocks(room: LiveRoom) {
  if (room.status !== "active" || room.minutes <= 0 || !room.lastTick) return;
  const now = Date.now();
  const delta = now - room.lastTick;
  room.lastTick = now;
  const chess = newChess(room.fen);
  if (chess.turn() === "w") room.whiteMs = Math.max(0, room.whiteMs - delta);
  else room.blackMs = Math.max(0, room.blackMs - delta);
  if (room.whiteMs <= 0) void endGame(room, "0-1", "timeout");
  if (room.blackMs <= 0) void endGame(room, "1-0", "timeout");
}

export function playMove(room: LiveRoom, user: AuthedUser, move: ServerMove) {
  if (room.status !== "active") throw new Error("Game is not active.");
  tickClocks(room);
  const chess = newChess(room.fen);
  const side = chess.turn();
  const player = side === "w" ? room.white : room.black;
  if (!player || player.userId !== user.id) throw new Error("Not your turn.");
  const applied = applyMove(room.fen, move);
  if (room.minutes > 0) {
    if (side === "w") room.whiteMs += room.increment * 1000;
    else room.blackMs += room.increment * 1000;
  }
  room.fen = applied.chess.fen();
  room.pgn = applied.chess.pgn();
  room.ply += 1;
  room.drawOffer = null;
  const end = outcome(applied.chess);
  if (end.over) void endGame(room, end.result, end.reason);
  return { san: applied.san, captured: applied.captured, check: applied.chess.isCheck(), ...end };
}

export async function endGame(room: LiveRoom, result: string, reason: string | null) {
  if (room.status === "over") return;
  room.status = "over";
  room.result = result;
  room.reason = reason;
  room.lastTick = null;
  const game = await prisma.game.create({
    data: {
      mode: room.mode,
      rated: room.rated,
      timePreset: room.minutes ? String(room.minutes) : "none",
      minutes: room.minutes,
      increment: room.increment,
      whiteId: room.white?.userId,
      blackId: room.black?.userId,
      whiteName: room.white?.username || "White",
      blackName: room.black?.username || "Black",
      pgn: room.pgn,
      fen: room.fen,
      result,
      reason,
      status: "over",
      endedAt: new Date(),
    },
  });
  room.dbId = game.id;
  const chess = newChess();
  try {
    chess.loadPgn(room.pgn);
  } catch {
    /* pgn may be empty */
  }
  const history = chess.history({ verbose: true });
  let ply = 0;
  const walk = newChess();
  for (const m of history) {
    walk.move(m);
    ply += 1;
    await prisma.move.create({
      data: { gameId: game.id, ply, san: m.san, fen: walk.fen(), from: m.from, to: m.to },
    });
  }
  if (room.rated) {
    await finishRated(room.white?.userId || null, room.black?.userId || null, result, reason);
  } else {
    const whiteScore = result === "1-0" ? 1 : result === "0-1" ? 0 : 0.5;
    await recordUnrated(room.white?.userId || null, whiteScore, reason);
    await recordUnrated(room.black?.userId || null, 1 - whiteScore, reason);
  }
}

export function resign(room: LiveRoom, user: AuthedUser) {
  const color = room.white?.userId === user.id ? "w" : room.black?.userId === user.id ? "b" : null;
  if (!color) throw new Error("Not in this game.");
  void endGame(room, color === "w" ? "0-1" : "1-0", "resignation");
}

export function offerDraw(room: LiveRoom, user: AuthedUser) {
  const color = room.white?.userId === user.id ? "w" : room.black?.userId === user.id ? "b" : null;
  if (!color) throw new Error("Not in this game.");
  room.drawOffer = color;
}

export function answerDraw(room: LiveRoom, user: AuthedUser, accept: boolean) {
  const color = room.white?.userId === user.id ? "w" : room.black?.userId === user.id ? "b" : null;
  if (!color || !room.drawOffer || room.drawOffer === color) throw new Error("No draw to answer.");
  if (accept) void endGame(room, "1/2-1/2", "agreement");
  else room.drawOffer = null;
}

export function addChat(room: LiveRoom, user: AuthedUser, text: string) {
  const clean = text.trim().slice(0, 240);
  if (!clean) return;
  room.chat.push({
    id: randomBytes(4).toString("hex"),
    userId: user.id,
    username: user.username,
    text: clean,
    at: Date.now(),
  });
  if (room.chat.length > 80) room.chat.shift();
}

export function handleDisconnect(io: Server, socket: Socket) {
  const room = roomForSocket(socket.id);
  if (!room) return;
  const side = room.white?.socketId === socket.id ? room.white : room.black?.socketId === socket.id ? room.black : null;
  if (!side) return;
  side.connected = false;
  side.socketId = null;
  bySocket.delete(socket.id);
  if (room.status === "active") {
    room.disconnectDeadline = { color: side.color, at: Date.now() + 30_000 };
    io.to(room.id).emit("game:state", publicState(room));
    setTimeout(() => {
      if (room.status !== "active" || !room.disconnectDeadline) return;
      if (room.disconnectDeadline.color !== side.color) return;
      if (side.connected) return;
      void endGame(room, side.color === "w" ? "0-1" : "1-0", "abandon");
      io.to(room.id).emit("game:state", publicState(room));
      io.to(room.id).emit("game:over", { result: room.result, reason: room.reason });
    }, 30_000);
  }
}

export function rematch(room: LiveRoom) {
  if (room.status !== "over" || !room.white || !room.black) throw new Error("Rematch not available.");
  const next = createMatchedRoom(
    { id: room.black.userId, username: room.black.username, elo: room.black.elo, isGuest: false },
    { id: room.white.userId, username: room.white.username, elo: room.white.elo, isGuest: false },
    { minutes: room.minutes, increment: room.increment },
  );
  next.mode = room.mode;
  next.rated = room.rated;
  next.code = room.mode === "friend" ? code() : null;
  return next;
}

