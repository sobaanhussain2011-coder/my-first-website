import type { Chess, Square } from "chess.js";
import { Piece } from "./Piece";

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
    <div className="relative mx-auto w-full max-w-[min(74vh,680px)]">
      <div className="board-frame">
        <div className="relative overflow-hidden rounded-[12px]">
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
                    style={
                      isSel
                        ? { boxShadow: "inset 0 0 0 3px #f6d98a, inset 0 0 24px #e0b25788" }
                        : isLast
                          ? { boxShadow: "inset 0 0 0 2px #e0b25799, inset 0 0 18px #e0b25733" }
                          : undefined
                    }
                  >
                    {piece && (
                      <span className="absolute inset-0 grid place-items-center transition-transform duration-150 hover:scale-110">
                        <Piece color={piece.color} type={piece.type} />
                      </span>
                    )}
                    {isLegal && !isCap && (
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#e0b257]/50 shadow-[0_0_12px_#e0b257]" />
                    )}
                    {isCap && (
                      <span className="absolute inset-1.5 rounded-full border-2 border-[#f6d98a]/80" />
                    )}
                    <span className={`absolute left-1 top-0.5 font-mono text-[10px] ${isLight ? "text-[#6a4a22]" : "text-[#f6d98a99]"}`}>
                      {file === files[0] ? rank : ""}
                    </span>
                    <span className={`absolute right-1 bottom-0.5 font-mono text-[10px] ${isLight ? "text-[#6a4a22]" : "text-[#f6d98a99]"}`}>
                      {rank === ranks[ranks.length - 1] ? file : ""}
                    </span>
                  </button>
                );
              }),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
