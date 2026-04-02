import { useState } from "react";
import type { RoastAgentState } from "../agents/roast-agent";

interface ShameDashboardProps {
  state: RoastAgentState;
}

const SHAME_CLASSES: Record<string, { text: string; bg: string; border: string }> = {
  "Novice Shame": { text: "shame-novice", bg: "shame-bg-novice", border: "shame-border-novice" },
  "Intermediate Shame": { text: "shame-intermediate", bg: "shame-bg-intermediate", border: "shame-border-intermediate" },
  "Senior Shame": { text: "shame-senior", bg: "shame-bg-senior", border: "shame-border-senior" },
  "Staff-Level Shame": { text: "shame-staff", bg: "shame-bg-staff", border: "shame-border-staff" },
  "Architect-Level Shame": { text: "shame-architect", bg: "shame-bg-architect", border: "shame-border-architect" },
};

export default function ShameDashboard({ state }: ShameDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const classes = SHAME_CLASSES[state.shameLevel] ?? SHAME_CLASSES["Novice Shame"];
  const totalRoasts = state.roastHistory.length;

  return (
    <div className="glass-panel rounded-xl overflow-hidden animate-slide-in-right" style={{ width: 320 }}>
      {/* Header — always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-smooth cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <span className="font-semibold text-sm text-neutral-300">Shame Dashboard</span>
        </div>
        <span className="text-neutral-500 text-xs">{isExpanded ? "▲" : "▼"}</span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Total roasts */}
          <div className="text-center">
            <div className="text-4xl font-black tabular-nums">{totalRoasts}</div>
            <div className="text-xs text-neutral-500 uppercase tracking-wider">Files Roasted</div>
          </div>

          {/* Shame level */}
          <div className="text-center">
            <div className={`text-lg font-bold ${classes.text}`}>{state.shameLevel}</div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-neutral-500 mb-1">
              <span>Progress to next level</span>
              <span>{state.progressToNext}%</span>
            </div>
            <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${classes.bg}`}
                style={{ width: `${state.progressToNext}%` }}
              />
            </div>
          </div>

          {/* Roast history */}
          {state.roastHistory.length > 0 && (
            <div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider mb-2">
                Roast History
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {[...state.roastHistory].reverse().map((entry, i) => (
                  <div
                    key={`${entry.timestamp}-${i}`}
                    className="p-2 bg-[#111] rounded border border-[#222] text-xs"
                  >
                    <div className="font-mono text-amber-400 truncate">{entry.fileName}</div>
                    <div className="text-neutral-500 mt-1 line-clamp-2">
                      {entry.roastText.slice(0, 120)}…
                    </div>
                    <div className="text-neutral-700 mt-1">
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
