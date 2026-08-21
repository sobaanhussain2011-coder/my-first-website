type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

const PATHS: Record<PieceType, string> = {
  p: "M22 10c0-4 3.2-7 8-7s8 3 8 7c0 2.2-1 4.1-2.6 5.4 3.4 1.2 5.6 3.4 5.6 6.1 0 2.2-1.5 4-4 5.1V32h12v4H13v-4h12v-5.4c-2.5-1.1-4-2.9-4-5.1 0-2.7 2.2-4.9 5.6-6.1C23 14.1 22 12.2 22 10z",
  n: "M14 36h32v-4h-7.2c1.4-4.2 3-9.6 3.2-14.2.2-5.6-2.4-9.6-7.2-11.4 1.8-2.6 1.6-5.2-.4-6.8-2.2-1.8-5.4-.8-7.2 1.6-3.2-1.6-7.2-.4-9.4 2.6-2.6 3.4-2.2 8.2.8 11.4-2.2 1.6-3.8 4-3.8 6.8 0 3.6 2.2 6.2 5.2 8H14v4zm12.4-22.8c1.8-2.2 5-2.4 6.6-.4 1.4 1.8.6 4.4-1.4 5.6l-5.2-5.2z",
  b: "M30 6c3.6 0 6.4 3.6 5.2 7.2 2.8 1.8 4.8 5 4.8 8.6 0 4.4-2.6 7.6-6.4 9.2l1.2 2.2h8.2V36H17v-2.8h8.2l1.2-2.2C22.6 29.4 20 26.2 20 21.8c0-3.6 2-6.8 4.8-8.6C23.6 9.6 26.4 6 30 6zm0 6.2c-1.4 1.8-2.4 4-2.4 6.2 0 3.2 1.8 5.4 4.6 6.6l.8-4.8-3-7.8v-.2z",
  r: "M12 8h8v6h4V8h8v6h4V8h8v10h-3.2L39 36H21L18.2 18H15V8zm5.4 32h25.2V36H17.4v4z",
  q: "M12 14l5.2-8 5.4 7.2L30 6l7.4 7.2L42.8 6 48 14c-2.4 1.4-4 4-4 7 0 5.2-3.8 8.8-9.2 10.2L36 36H24l1.2-4.8C19.8 29.8 16 26.2 16 21c0-3 1.6-5.6 4-7zm4.6 26h26.8V36H16.6v4z",
  k: "M28 4h4v5h5v4h-5v4.4c6.6 1.2 11 5.8 11 11.6 0 4.4-2.6 7.8-6.8 9.6L38 36H22l1.8-2.4C19.6 31.8 17 28.4 17 24c0-5.8 4.4-10.4 11-11.6V13h-5V9h5V4zm2 13.2C24.8 18 22 20.6 22 24c0 3.6 2.6 6 6.6 6.8L30 24l1.4 6.8c4-0.8 6.6-3.2 6.6-6.8 0-3.4-2.8-6-8-6.8z",
};

export function Piece({ color, type }: { color: "w" | "b"; type: PieceType | string }) {
  const path = PATHS[(type as PieceType) || "p"] || PATHS.p;
  const white = color === "w";
  const gid = `g-${color}-${type}`;
  return (
    <svg viewBox="0 0 60 44" className="piece-svg w-[78%] h-[78%] drop-shadow-lg" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          {white ? (
            <>
              <stop offset="0%" stopColor="#fff8e6" />
              <stop offset="55%" stopColor="#f0d7a2" />
              <stop offset="100%" stopColor="#c9a056" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#4a4258" />
              <stop offset="50%" stopColor="#1c1824" />
              <stop offset="100%" stopColor="#0a0810" />
            </>
          )}
        </linearGradient>
      </defs>
      <path
        d={path}
        fill={`url(#${gid})`}
        stroke={white ? "#8a6a28" : "#e0b257"}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
