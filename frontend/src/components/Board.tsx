import type { Chess, Square } from "chess.js";

const GLYPH: Record<string, string> = {
  wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕", wk: "♔",
  bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛", bk: "♚",
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

type Props = {
  chess: Chess;
  flipped?: boolean;
  selected: Square | null;
  legal: Set<string>;
  captures: Set<string>;
  last: { from: string; to: string } | null;
  onSquare: (sq: Square) => void;
  disabled?: boolean;
};

export function Board({ chess, flipped, selected, legal, captures, last, onSquare, disabled }: Props) {
  const ranks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const files = flipped ? [...FILES].reverse() : FILES;
  return (
    <div className="relative mx-auto w-full max-w-[min(72vh,640px)]">
      <div className="rounded-[18px] p-3 bg-[#241610] shadow-brass" style={{ boxShadow: "inset 0 0 0 1px #c9a35a88, 0 16px 40px #0008" }}>
        <div className="relative rounded-[10px] overflow-hidden" style={{ boxShadow: "inset 0 0 0 1px #e8c88766" }}>
          <div className="grid grid-cols-8 aspect-square">
            {ranks.flatMap((rank) =>
              files.map((file) => {
                const sq = `${file}${rank}` as Square;
                const piece = chess.get(sq);
                const isLight = (file.charCodeAt(0) + rank) % 2 === 1;
                const isSel = selected === sq;
                const isLast = last && (last.from === sq || last.to === sq);
                const isLegal = legal.has(sq);
                const isCap = captures.has(sq);
                return (
                  <button
                    key={sq}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSquare(sq)}
                    className={`relative ${isLight ? "square-light" : "square-dark"} ${isSel ? "z-10" : ""}`}
                    style={isSel ? { boxShadow: "inset 0 0 0 3px #e8c887" } : isLast ? { boxShadow: "inset 0 0 0 2px #c9a35a99" } : undefined}
                  >
                    {piece && (
                      <span
                        className={`absolute inset-0 grid place-items-center text-[7vw] sm:text-5xl leading-none hover:scale-105 transition-transform ${piece.color === "w" ? "piece-white" : "piece-black"}`}
                      >
                        {GLYPH[`${piece.color}${piece.type}`]}
                      </span>
                    )}
                    {isLegal && !isCap && (
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-black/25" />
                    )}
                    {isCap && (
                      <span className="absolute inset-1 rounded-full border-2 border-[#3a120c]/50" />
                    )}
                    <span className={`absolute left-1 top-0.5 font-mono text-[10px] ${isLight ? "text-[#6a4524]" : "text-[#f0d8b0]"}`}>
                      {file === files[0] ? rank : ""}
                    </span>
                    <span className={`absolute right-1 bottom-0.5 font-mono text-[10px] ${isLight ? "text-[#6a4524]" : "text-[#f0d8b0]"}`}>
                      {rank === ranks[ranks.length - 1] ? file : ""}
                    </span>
                  </button>
                );
              }),
            )}
          </div>
        </div>
        <div className="flex justify-between px-1 pt-2 text-[10px] text-brass">
          <span>●</span><span>●</span>
        </div>
      </div>
    </div>
  );
}
