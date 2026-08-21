type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

const FILES: Record<"w" | "b", Record<PieceType, string>> = {
  w: {
    k: "/pieces/wK.svg",
    q: "/pieces/wQ.svg",
    r: "/pieces/wR.svg",
    b: "/pieces/wB.svg",
    n: "/pieces/wN.svg",
    p: "/pieces/wP.svg",
  },
  b: {
    k: "/pieces/bK.svg",
    q: "/pieces/bQ.svg",
    r: "/pieces/bR.svg",
    b: "/pieces/bB.svg",
    n: "/pieces/bN.svg",
    p: "/pieces/bP.svg",
  },
};

export function Piece({ color, type }: { color: "w" | "b"; type: PieceType | string }) {
  const key = (["p", "n", "b", "r", "q", "k"].includes(type) ? type : "p") as PieceType;
  const src = FILES[color === "b" ? "b" : "w"][key];
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className="w-[92%] h-[92%] object-contain select-none pointer-events-none drop-shadow-[0_3px_4px_rgba(40,24,8,0.35)]"
    />
  );
}
