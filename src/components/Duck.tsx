import { useMemo } from "react";

export type DuckStatus =
  | "idle"
  | "listening"
  | "speaking"
  | "processing"
  | "meltdown";

interface DuckProps {
  status: DuckStatus;
  shameLevel?: number; // 0-4
}

const SHAME_COLORS = [
  "#22c55e", // Novice — green
  "#eab308", // Intermediate — yellow
  "#f97316", // Senior — orange
  "#ef4444", // Staff — red
  "#991b1b", // Architect — dark red
];

export default function Duck({ status, shameLevel = 0 }: DuckProps) {
  const auraColor = SHAME_COLORS[Math.min(shameLevel, 4)];

  const animClass = useMemo(() => {
    switch (status) {
      case "speaking":
        return "duck-speaking";
      case "listening":
        return "duck-listening";
      case "processing":
        return "duck-processing";
      case "meltdown":
        return "duck-meltdown";
      default:
        return "duck-idle";
    }
  }, [status]);

  const showPulseRing = status === "listening" || status === "speaking" || status === "meltdown";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 250, height: 250 }}>
      {/* Aura / pulse ring */}
      {showPulseRing && (
        <>
          <div
            className="absolute rounded-full pulse-ring"
            style={{
              width: 220,
              height: 220,
              border: `3px solid ${auraColor}`,
              opacity: 0.5,
            }}
          />
          <div
            className="absolute rounded-full pulse-ring"
            style={{
              width: 220,
              height: 220,
              border: `3px solid ${auraColor}`,
              opacity: 0.3,
              animationDelay: "0.5s",
            }}
          />
        </>
      )}

      {/* Processing spinner ring */}
      {status === "processing" && (
        <div
          className="absolute rounded-full"
          style={{
            width: 230,
            height: 230,
            border: "3px solid transparent",
            borderTopColor: auraColor,
            borderRightColor: auraColor,
            animation: "spin 1s linear infinite",
          }}
        />
      )}

      {/* Duck SVG */}
      <div className={animClass}>
        <svg
          width="200"
          height="200"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            filter:
              status === "meltdown"
                ? `drop-shadow(0 0 25px ${auraColor})`
                : status === "speaking"
                  ? `drop-shadow(0 0 15px ${auraColor})`
                  : `drop-shadow(0 0 6px rgba(234,179,8,0.3))`,
          }}
        >
          {/* Body */}
          <ellipse cx="100" cy="135" rx="70" ry="50" fill="#FFD700" />
          <ellipse cx="100" cy="130" rx="65" ry="45" fill="#FFEB3B" />

          {/* Belly highlight */}
          <ellipse cx="100" cy="145" rx="40" ry="25" fill="#FFF176" opacity="0.6" />

          {/* Head */}
          <circle cx="100" cy="75" r="38" fill="#FFD700" />
          <circle cx="100" cy="72" r="35" fill="#FFEB3B" />

          {/* Head highlight */}
          <circle cx="90" cy="62" r="12" fill="#FFF9C4" opacity="0.4" />

          {/* Eye left */}
          <circle cx="86" cy="68" r="7" fill="white" />
          <circle cx="88" cy="67" r="4" fill="#1a1a1a" />
          <circle cx="89" cy="65" r="1.5" fill="white" />

          {/* Eye right */}
          <circle cx="114" cy="68" r="7" fill="white" />
          <circle cx="116" cy="67" r="4" fill="#1a1a1a" />
          <circle cx="117" cy="65" r="1.5" fill="white" />

          {/* Eyebrows — judgmental */}
          <line
            x1="78"
            y1="57"
            x2="93"
            y2="59"
            stroke="#B8860B"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            x1="107"
            y1="59"
            x2="122"
            y2="57"
            stroke="#B8860B"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Beak */}
          <ellipse cx="100" cy="84" rx="14" ry="7" fill="#FF8F00" />
          <ellipse cx="100" cy="82" rx="12" ry="5" fill="#FFA726" />

          {/* Smirk line */}
          <path
            d="M93 86 Q100 90 107 86"
            stroke="#E65100"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />

          {/* Wing left */}
          <ellipse
            cx="45"
            cy="125"
            rx="22"
            ry="35"
            fill="#FFC107"
            transform="rotate(-15 45 125)"
          />
          <ellipse
            cx="47"
            cy="123"
            rx="18"
            ry="30"
            fill="#FFD54F"
            transform="rotate(-15 47 123)"
          />

          {/* Wing right */}
          <ellipse
            cx="155"
            cy="125"
            rx="22"
            ry="35"
            fill="#FFC107"
            transform="rotate(15 155 125)"
          />
          <ellipse
            cx="153"
            cy="123"
            rx="18"
            ry="30"
            fill="#FFD54F"
            transform="rotate(15 153 123)"
          />

          {/* Tail */}
          <path d="M155 120 Q175 105 165 90 Q160 110 145 115" fill="#FFC107" />

          {/* Crown/tuft on head */}
          <path d="M95 40 Q100 30 105 40" fill="#FFD700" stroke="#FFC107" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}
