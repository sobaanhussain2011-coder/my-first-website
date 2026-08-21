import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Square } from "chess.js";
import { Chess } from "chess.js";
import { Board } from "../components/Board";
import { PlayerRow, formatMs } from "../components/PlayerRow";
import { hintMove, pickAiMove, type AiLevel } from "../lib/ai";
import { connectSocket } from "../lib/socket";
import { api } from "../lib/api";
import { sfx, startMusic, stopMusic, unlockAudio } from "../lib/audio";
import { useAuth } from "../lib/AuthContext";
import { createGame, gameOverReason, resultOf, statusText } from "../lib/engine";
import { Field } from "../components/Luxury";
import { loadSettings, saveSettings } from "../lib/settings";
import { Piece } from "../components/Piece";

type Mode = "local" | "ai" | "online" | "friend";
type Promo = { from: Square; to: Square };

function clockEnabled(minutes: number) {
  return minutes > 0;
}

export function Play() {
  const { user, becomeGuest } = useAuth();
  const [params] = useSearchParams();
  const settings = loadSettings();
  const [mode, setMode] = useState<Mode>((params.get("mode") as Mode) || "local");
  const [aiLevel, setAiLevel] = useState<AiLevel>("medium");
  const [minutes, setMinutes] = useState(settings.defaultMinutes);
  const [increment, setIncrement] = useState(settings.defaultIncrement);
  const [humanColor, setHumanColor] = useState<"w" | "b">("w");
  const [started, setStarted] = useState(false);
  const [chess, setChess] = useState(() => createGame());
  const [selected, setSelected] = useState<Square | null>(null);
  const [last, setLast] = useState<{ from: string; to: string } | null>(null);
  const [undo, setUndo] = useState<string[]>([]);
  const [redo, setRedo] = useState<string[]>([]);
  const [promo, setPromo] = useState<Promo | null>(null);
  const [whiteMs, setWhiteMs] = useState(0);
  const [blackMs, setBlackMs] = useState(0);
  const [status, setStatus] = useState("Choose a table.");
  const [room, setRoom] = useState<Record<string, unknown> | null>(null);
  const [code, setCode] = useState("");
  const [chat, setChat] = useState("");
  const [drawOffer, setDrawOffer] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<"w" | "b" | null>(null);
  const [musicOn, setMusicOn] = useState(settings.music);
  const [sfxOn, setSfxOn] = useState(settings.sfx);
  const saved = useRef(false);
  const turnRef = useRef<"w" | "b">("w");
  const overRef = useRef(false);
  const clocksArmed = useRef(false);
  const theme = settings.theme;
  turnRef.current = chess.turn();
  overRef.current = chess.isGameOver() || Boolean(flagged);

  const legal = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set(chess.moves({ square: selected, verbose: true }).map((m) => m.to));
  }, [chess, selected]);
  const captures = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set(chess.moves({ square: selected, verbose: true }).filter((m) => m.captured).map((m) => m.to));
  }, [chess, selected]);

  const roomStatus = (room as { status?: string } | null)?.status;
  const clockLive =
    started &&
    clockEnabled(minutes) &&
    (mode === "local" || mode === "ai" || roomStatus === "active");

  useEffect(() => {
    if (!clockLive) return;
    const id = window.setInterval(() => {
      if (overRef.current) return;
      if (turnRef.current === "w") {
        setWhiteMs((ms) => Math.max(0, ms - 100));
      } else {
        setBlackMs((ms) => Math.max(0, ms - 100));
      }
    }, 100);
    return () => clearInterval(id);
  }, [clockLive]);

  useEffect(() => {
    if (whiteMs > 0 || blackMs > 0) clocksArmed.current = true;
    if (!started || !clockEnabled(minutes) || flagged || chess.isGameOver() || !clocksArmed.current) return;
    if (whiteMs === 0) {
      setFlagged("w");
      setStatus("White flagged — Black wins.");
      if (sfxOn) sfx.over();
    } else if (blackMs === 0) {
      setFlagged("b");
      setStatus("Black flagged — White wins.");
      if (sfxOn) sfx.over();
    }
  }, [whiteMs, blackMs, minutes, started, flagged, chess, sfxOn]);

  function playSfx(kind: "move" | "capture" | "check" | "over") {
    if (!sfxOn) return;
    void unlockAudio();
    sfx[kind]();
  }

  function startLocal() {
    const game = createGame();
    setChess(game);
    setUndo([]);
    setRedo([]);
    setLast(null);
    setStarted(true);
    setFlagged(null);
    clocksArmed.current = minutes > 0;
    saved.current = false;
    setWhiteMs(minutes * 60_000);
    setBlackMs(minutes * 60_000);
    setStatus(statusText(game));
    void unlockAudio();
    if (musicOn) void startMusic();
  }

  function applyLocal(from: Square, to: Square, promotion?: "q" | "r" | "b" | "n") {
    const next = new Chess(chess.fen());
    const move = next.move({ from, to, promotion });
    if (!move) return;
    setUndo((u) => [...u, chess.fen()]);
    setRedo([]);
    setChess(next);
    setLast({ from, to });
    setSelected(null);
    setPromo(null);
    if (next.isGameOver()) playSfx("over");
    else if (next.isCheck()) playSfx("check");
    else if (move.captured) playSfx("capture");
    else playSfx("move");
    setStatus(statusText(next));
    if (clockEnabled(minutes)) {
      if (move.color === "w") setWhiteMs((ms) => ms + increment * 1000);
      else setBlackMs((ms) => ms + increment * 1000);
    }
  }

  useEffect(() => {
    if (mode !== "ai" || !started || chess.isGameOver()) return;
    if (chess.turn() === humanColor) return;
    const t = window.setTimeout(() => {
      const mv = pickAiMove(chess.fen(), aiLevel);
      if (!mv) return;
      applyLocal(mv.from as Square, mv.to as Square, mv.promotion as "q" | undefined);
    }, 350);
    return () => clearTimeout(t);
  }, [chess, mode, started, humanColor, aiLevel]);

  useEffect(() => {
    if (!started || !chess.isGameOver() || saved.current || !user) return;
    saved.current = true;
    void api.saveOffline({
      mode,
      pgn: chess.pgn(),
      fen: chess.fen(),
      result: resultOf(chess),
      reason: gameOverReason(chess),
      whiteName: mode === "ai" && humanColor === "b" ? `CPU ${aiLevel}` : user.username,
      blackName: mode === "ai" && humanColor === "w" ? `CPU ${aiLevel}` : user.username,
      minutes,
      increment,
    }).catch(() => undefined);
    if (mode === "ai" && resultOf(chess) === (humanColor === "w" ? "1-0" : "0-1") && (aiLevel === "hard" || aiLevel === "expert")) {
      /* achievement is server-side for online; local AI win is stored in history */
    }
  }, [chess, started, user, mode, humanColor, aiLevel, minutes, increment]);

  function onSquare(sq: Square) {
    if (!started || chess.isGameOver() || flagged) return;
    if (mode === "ai" && chess.turn() !== humanColor) return;
    if (mode === "online" || mode === "friend") {
      onlineMove(sq);
      return;
    }
    const piece = chess.get(sq);
    if (selected) {
      const needsPromo = chess.get(selected)?.type === "p" && (sq[1] === "8" || sq[1] === "1") && legal.has(sq);
      if (needsPromo) {
        setPromo({ from: selected, to: sq });
        return;
      }
      if (legal.has(sq)) {
        applyLocal(selected, sq);
        return;
      }
    }
    if (piece && piece.color === chess.turn()) setSelected(sq);
    else setSelected(null);
  }

  function onlineMove(sq: Square) {
    const socket = connectSocket();
    const myColor = (room as { white?: { userId: string } } | null)?.white?.userId === user?.id ? "w" : "b";
    if (chess.turn() !== myColor) {
      const piece = chess.get(sq);
      if (piece && piece.color === myColor) setSelected(sq);
      return;
    }
    if (selected && legal.has(sq)) {
      const needsPromo = chess.get(selected)?.type === "p" && (sq[1] === "8" || sq[1] === "1");
      socket.emit("game:move", { from: selected, to: sq, promotion: needsPromo ? "q" : undefined }, (res: { ok?: boolean; error?: string }) => {
        if (!res?.ok) setStatus(res?.error || "Illegal move.");
      });
      setSelected(null);
      return;
    }
    const piece = chess.get(sq);
    if (piece && piece.color === myColor) setSelected(sq);
    else setSelected(null);
  }

  async function ensureUser() {
    if (!user) await becomeGuest();
  }

  function startOnline(kind: "quick" | "create" | "join") {
    void (async () => {
      await ensureUser();
      const socket = connectSocket();
      socket.off("game:state");
      socket.off("game:clock");
      socket.off("matchmaking:found");
      socket.off("game:over");
      socket.off("game:rematch");
      void unlockAudio();
      if (musicOn) void startMusic();
      socket.on("game:state", (state: { fen: string; drawOffer?: string | null; whiteMs?: number; blackMs?: number; ply?: number }) => {
        setRoom(state);
        setChess(createGame(state.fen));
        setDrawOffer(state.drawOffer || null);
        if (state.whiteMs != null) setWhiteMs(state.whiteMs);
        if (state.blackMs != null) setBlackMs(state.blackMs);
        setStarted(true);
        setFlagged(null);
        setStatus(statusText(createGame(state.fen)));
      });
      socket.on("game:clock", (clocks: { whiteMs?: number; blackMs?: number }) => {
        if (clocks.whiteMs != null) setWhiteMs(clocks.whiteMs);
        if (clocks.blackMs != null) setBlackMs(clocks.blackMs);
      });
      socket.on("game:over", (payload: { result: string; reason: string }) => {
        setStatus(`${payload.result} · ${payload.reason}`);
        playSfx("over");
      });
      socket.on("matchmaking:found", (payload: { roomId: string }) => {
        socket.emit("room:join", { roomId: payload.roomId });
      });
      socket.on("game:rematch", (payload: { roomId: string }) => {
        socket.emit("room:join", { roomId: payload.roomId });
      });
      if (kind === "quick") {
        setStatus("Finding a table…");
        socket.emit("matchmaking:join", { minutes, increment });
      } else if (kind === "create") {
        socket.emit("room:create", { minutes, increment, rated: false }, (res: { room?: { code?: string } }) => {
          setRoom(res.room || null);
          setStarted(true);
          setStatus(res.room?.code ? `Room ${res.room.code}` : "Room ready.");
        });
      } else {
        socket.emit("room:join", { code }, (res: { ok?: boolean; error?: string; room?: unknown }) => {
          if (!res.ok) setStatus(res.error || "Could not join.");
          else {
            setRoom(res.room as Record<string, unknown>);
            setStarted(true);
          }
        });
      }
    })();
  }

  const flipped = mode === "ai" ? humanColor === "b" : Boolean(room && (room as { black?: { userId: string } }).black?.userId === user?.id);
  const whiteName = (room as { white?: { username: string } } | null)?.white?.username || (mode === "ai" && humanColor === "b" ? `CPU (${aiLevel})` : user?.username || "White");
  const blackName = (room as { black?: { username: string } } | null)?.black?.username || (mode === "ai" && humanColor === "w" ? `CPU (${aiLevel})` : mode === "local" ? "Black" : user?.username || "Black");

  return (
    <div className={`grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] ${theme !== "obsidian" ? `theme-${theme}` : ""}`}>
      <section className="space-y-3">
        {!started && (
          <div className="salon-table space-y-5">
            <p className="font-mono text-[10px] tracking-[0.4em] text-brass">THE FLOOR</p>
            <h1 className="font-display text-4xl text-ink">Choose your table</h1>
            <div className="flex flex-wrap gap-2">
              {(["local", "ai", "online", "friend"] as Mode[]).map((m) => (
                <button key={m} className={`btn px-3 py-2 ${mode === m ? "btn-brass" : ""}`} onClick={() => setMode(m)}>{m}</button>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Clock">
                <select className="lux-input" value={[0, 1, 3, 5, 10, 15].includes(minutes) ? minutes : "custom"} onChange={(e) => {
                  const v = e.target.value;
                  if (v === "custom") setMinutes(8);
                  else setMinutes(Number(v));
                }}>
                  <option value={0}>No timer</option>
                  {[1, 3, 5, 10, 15].map((n) => <option key={n} value={n}>{n} min</option>)}
                  <option value="custom">Custom minutes</option>
                </select>
              </Field>
              {![0, 1, 3, 5, 10, 15].includes(minutes) && (
                <Field label="Custom minutes">
                  <input type="number" min={1} max={180} className="lux-input" value={minutes} onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))} />
                </Field>
              )}
              <Field label="Increment (seconds)">
                <input type="number" min={0} className="lux-input" value={increment} onChange={(e) => setIncrement(Number(e.target.value))} />
              </Field>
              {mode === "ai" && (
                <>
                  <Field label="House strength">
                    <select className="lux-input" value={aiLevel} onChange={(e) => setAiLevel(e.target.value as AiLevel)}>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                      <option value="expert">Expert</option>
                    </select>
                  </Field>
                  <Field label="Your colour">
                    <select className="lux-input" value={humanColor} onChange={(e) => setHumanColor(e.target.value as "w" | "b")}>
                      <option value="w">Ivory</option>
                      <option value="b">Obsidian</option>
                    </select>
                  </Field>
                </>
              )}
            </div>
            {mode === "local" || mode === "ai" ? (
              <button className="btn btn-brass w-full py-3" onClick={startLocal}>Begin</button>
            ) : mode === "online" ? (
              <button className="btn btn-brass w-full py-3" onClick={() => startOnline("quick")}>Quick match</button>
            ) : (
              <div className="space-y-2">
                <button className="btn btn-brass w-full py-3" onClick={() => startOnline("create")}>Open a private room</button>
                <div className="flex gap-2">
                  <input className="lux-input font-mono uppercase" placeholder="ROOM CODE" value={code} onChange={(e) => setCode(e.target.value)} />
                  <button className="btn px-4" onClick={() => startOnline("join")}>Join</button>
                </div>
              </div>
            )}
          </div>
        )}

        {started && (
          <>
            <PlayerRow name={flipped ? whiteName : blackName} tag={flipped ? "White" : "Black"} clock={clockEnabled(minutes) ? formatMs(flipped ? whiteMs : blackMs) : undefined} active={(flipped ? chess.turn() === "w" : chess.turn() === "b")} />
            <Board
              chess={chess}
              flipped={flipped}
              selected={selected}
              legal={legal}
              captures={captures}
              last={last}
              onSquare={onSquare}
            />
            <PlayerRow name={flipped ? blackName : whiteName} tag={flipped ? "Black" : "White"} clock={clockEnabled(minutes) ? formatMs(flipped ? blackMs : whiteMs) : undefined} active={(flipped ? chess.turn() === "b" : chess.turn() === "w")} />
            <div className="flex items-center justify-between text-sm text-inkdim font-mono">
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-brass" />{status}</span>
              <span>Move {Math.floor(chess.history().length / 2) + 1}</span>
            </div>
          </>
        )}
      </section>

      <aside className="space-y-3">
        <div className="panel-card rounded-2xl p-4 grid grid-cols-2 gap-2">
          <button
            className={`btn py-2 ${musicOn ? "btn-brass" : ""}`}
            onClick={() => {
              const next = !musicOn;
              setMusicOn(next);
              saveSettings({ ...loadSettings(), music: next });
              if (next) void startMusic();
              else stopMusic();
            }}
          >
            {musicOn ? "Music on" : "Music off"}
          </button>
          <button
            className={`btn py-2 ${sfxOn ? "btn-brass" : ""}`}
            onClick={() => {
              const next = !sfxOn;
              setSfxOn(next);
              saveSettings({ ...loadSettings(), sfx: next });
              if (next) {
                void unlockAudio();
                sfx.move();
              }
            }}
          >
            {sfxOn ? "Sounds on" : "Sounds off"}
          </button>
          <button className="btn py-2" disabled={mode === "online" || mode === "friend" || undo.length === 0} onClick={() => {
            const fen = undo[undo.length - 1];
            setRedo((r) => [chess.fen(), ...r]);
            setUndo((u) => u.slice(0, -1));
            setChess(createGame(fen));
          }}>Undo</button>
          <button className="btn py-2" disabled={redo.length === 0} onClick={() => {
            const fen = redo[0];
            setUndo((u) => [...u, chess.fen()]);
            setRedo((r) => r.slice(1));
            setChess(createGame(fen));
          }}>Redo</button>
          <button className="btn py-2" onClick={() => {
            const mv = hintMove(chess.fen());
            if (mv) setStatus(`Hint: ${mv.san}`);
          }}>Hint</button>
          <button className="btn py-2" onClick={() => {
            if (mode === "online" || mode === "friend") connectSocket().emit("game:resign");
            else setStatus("Resigned.");
          }}>Resign</button>
          <button className="btn py-2 col-span-2" onClick={() => {
            if (mode === "online" || mode === "friend") connectSocket().emit("game:draw-offer");
            else setStatus("Draw offered — agree on this device.");
          }}>Offer draw</button>
          {drawOffer && (mode === "online" || mode === "friend") && (
            <div className="col-span-2 flex gap-2">
              <button className="btn btn-brass flex-1 py-2" onClick={() => connectSocket().emit("game:draw-response", { accept: true })}>Accept</button>
              <button className="btn flex-1 py-2" onClick={() => connectSocket().emit("game:draw-response", { accept: false })}>Decline</button>
            </div>
          )}
          {chess.isGameOver() && (mode === "online" || mode === "friend") && (
            <button className="btn btn-brass col-span-2 py-2" onClick={() => connectSocket().emit("game:rematch")}>Rematch</button>
          )}
        </div>
        <div className="panel-card rounded-2xl p-4">
          <div className="font-display text-brassb mb-3 tracking-wide">The score</div>
          <ol className="font-mono text-xs text-inkdim max-h-48 overflow-auto space-y-1">
            {pairMoves(chess.history()).map((pair, i) => (
              <li key={i}>{i + 1}. {pair}</li>
            ))}
          </ol>
        </div>
        {(mode === "online" || mode === "friend") && (
          <div className="panel-card rounded-2xl p-4 space-y-2">
            <div className="font-display text-brassb tracking-wide">Table talk</div>
            <div className="h-28 overflow-auto font-mono text-xs text-inkdim space-y-1">
              {((room as { chat?: { id: string; username: string; text: string }[] } | null)?.chat || []).map((m) => (
                <div key={m.id}><span className="text-brass">{m.username}:</span> {m.text}</div>
              ))}
            </div>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); connectSocket().emit("game:chat", { text: chat }); setChat(""); }}>
              <input className="lux-input flex-1" value={chat} onChange={(e) => setChat(e.target.value)} />
              <button className="btn px-3">Send</button>
            </form>
            {(room as { code?: string } | null)?.code && (
              <div className="font-mono text-xs text-brass">Code {(room as { code?: string }).code}</div>
            )}
          </div>
        )}
      </aside>

      {promo && (
        <div className="fixed inset-0 bg-black/70 grid place-items-center z-20">
          <div className="panel-card rounded-2xl p-6 grid grid-cols-4 gap-3">
            {(["q", "r", "b", "n"] as const).map((p) => (
              <button key={p} className="btn py-3 grid place-items-center h-20" onClick={() => applyLocal(promo.from, promo.to, p)}>
                <Piece color={chess.turn()} type={p} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function pairMoves(sans: string[]) {
  const out: string[] = [];
  for (let i = 0; i < sans.length; i += 2) out.push(`${sans[i]} ${sans[i + 1] || ""}`.trim());
  return out;
}
