import { useState, useEffect, useRef } from "react";
import type { RoastAgentState } from "../agents/roast-agent";

interface ShameDashboardProps {
  state: RoastAgentState;
  onShameLevelUp?: (level: string) => void;
}

const SHAME_TAILWIND: Record<
  string,
  { text: string; bg: string; track: string }
> = {
  "Novice Shame": {
    text: "text-shame-novice",
    bg: "bg-shame-novice",
    track: "bg-shame-novice/20",
  },
  "Intermediate Shame": {
    text: "text-shame-intermediate",
    bg: "bg-shame-intermediate",
    track: "bg-shame-intermediate/20",
  },
  "Senior Shame": {
    text: "text-shame-senior",
    bg: "bg-shame-senior",
    track: "bg-shame-senior/20",
  },
  "Staff-Level Shame": {
    text: "text-shame-staff",
    bg: "bg-shame-staff",
    track: "bg-shame-staff/20",
  },
  "Architect-Level Shame": {
    text: "text-shame-architect",
    bg: "bg-shame-architect",
    track: "bg-shame-architect/20",
  },
};

export default function ShameDashboard({ state, onShameLevelUp }: ShameDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [glitching, setGlitching] = useState(false);
  const prevShameRef = useRef<string>(state.shameLevel);

  const tw = SHAME_TAILWIND[state.shameLevel] ?? SHAME_TAILWIND["Novice Shame"];
  const totalRoasts = state.roastHistory.length;

  // Detect shame level change and trigger glitch
  useEffect(() => {
    if (state.shameLevel !== prevShameRef.current) {
      const prevLevel = prevShameRef.current;
      prevShameRef.current = state.shameLevel;

      if (prevLevel !== state.shameLevel) {
        setGlitching(true);
        onShameLevelUp?.(state.shameLevel);
        const timer = setTimeout(() => setGlitching(false), 300);
        return () => clearTimeout(timer);
      }
    }
  }, [state.shameLevel, onShameLevelUp]);

  return (
    <div className="w-80 overflow-hidden border-[3px] border-neo-ink bg-neo-surface shadow-neo animate-slide-in-right">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-neutral-100"
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 bg-neo-blue ring-2 ring-neo-ink" aria-hidden />
          <span className="text-sm font-bold uppercase tracking-wide text-neo-ink">
            Shame Dashboard
          </span>
        </div>
        <span className="text-xs font-bold text-neutral-500">{isExpanded ? "Hide" : "Show"}</span>
      </button>

      {isExpanded && (
        <div className="space-y-4 border-t-[3px] border-neo-ink px-4 pb-4 pt-3">
          <div className="text-center">
            <div className="font-display text-4xl tabular-nums text-neo-ink">{totalRoasts}</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Files Roasted
            </div>
          </div>

          <div className="text-center">
            <div className={`text-lg font-black ${tw.text} ${glitching ? "glitch-it" : ""}`}>{state.shameLevel}</div>
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs font-semibold text-neutral-600">
              <span>Progress to next level</span>
              <span>{state.progressToNext}%</span>
            </div>
            <div className={`h-2 overflow-hidden border-[2px] border-neo-ink ${tw.track}`}>
              <div
                className={`h-full transition-all duration-500 ${tw.bg}`}
                style={{ width: `${state.progressToNext}%` }}
              />
            </div>
          </div>

          {state.roastHistory.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Roast History
              </div>
              <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1">
                {[...state.roastHistory].reverse().map((entry, i) => (
                  <div
                    key={`${entry.timestamp}-${i}`}
                    className="border-[2px] border-neo-ink bg-neo-bg p-2 text-xs"
                  >
                    <div className="truncate font-mono text-xs font-semibold text-neo-blue">
                      {entry.fileName}
                    </div>
                    <div className="mt-1 line-clamp-2 text-neutral-600">
                      {entry.roastText.slice(0, 120)}…
                    </div>
                    <div className="mt-0.5 text-neutral-400">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
