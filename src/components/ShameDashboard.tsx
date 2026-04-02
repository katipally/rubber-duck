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

      // Only fire on escalation (not first render with default)
      if (prevLevel !== state.shameLevel) {
        setGlitching(true);
        onShameLevelUp?.(state.shameLevel);
        const timer = setTimeout(() => setGlitching(false), 300);
        return () => clearTimeout(timer);
      }
    }
  }, [state.shameLevel, onShameLevelUp]);

  return (
    <div className="w-full overflow-hidden border border-neon-green/20 bg-neon-surface">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full cursor-pointer items-center justify-between px-3 py-2.5 transition-colors hover:bg-neon-surface-light"
      >
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 bg-neon-green" aria-hidden />
          <span className="text-xs font-bold uppercase tracking-wide text-neon-muted">
            Shame Dashboard
          </span>
        </div>
        <span className="text-xs font-bold text-neon-muted">{isExpanded ? "▾" : "▸"}</span>
      </button>

      {isExpanded && (
        <div className="space-y-3 border-t border-neon-green/10 px-3 pb-3 pt-2">
          <div className="text-center">
            <div className="font-display text-3xl tabular-nums text-neon-ink">{totalRoasts}</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-neon-muted">
              Files Roasted
            </div>
          </div>

          <div className="text-center">
            <div className={`text-sm font-black ${tw.text} ${glitching ? "glitch-it" : ""}`}>{state.shameLevel}</div>
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs font-semibold text-neon-muted">
              <span>Next level</span>
              <span>{state.progressToNext}%</span>
            </div>
            <div className={`h-2 overflow-hidden border border-neon-ink/20 ${tw.track}`}>
              <div
                className={`h-full transition-all duration-500 ${tw.bg}`}
                style={{ width: `${state.progressToNext}%` }}
              />
            </div>
          </div>

          {state.roastHistory.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-neon-muted">
                Roast History
              </div>
              <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1">
                {[...state.roastHistory].reverse().map((entry, i) => (
                  <div
                    key={`${entry.timestamp}-${i}`}
                    className="border border-neon-ink/10 bg-neon-bg p-2 text-xs"
                  >
                    <div className="truncate font-mono text-xs font-semibold text-neon-cyan">
                      {entry.fileName}
                    </div>
                    <div className="mt-1 line-clamp-2 text-neon-muted">
                      {entry.roastText.slice(0, 120)}…
                    </div>
                    <div className="mt-0.5 text-neon-muted/50">
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
