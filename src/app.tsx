import { useState, useCallback } from "react";
import { useAgent } from "agents/react";
import type { RoastAgentState } from "./agents/roast-agent";

import Duck from "./components/Duck";
import type { DuckStatus } from "./components/Duck";
import GitHubInput from "./components/GitHubInput";
import RoastDisplay from "./components/RoastDisplay";
import ShameDashboard from "./components/ShameDashboard";
import SettingsPanel from "./components/SettingsPanel";
import FileList from "./components/FileList";
import ParticleBackground from "./components/ParticleBackground";
import { useStreamingTTS } from "./hooks/useStreamingTTS";

type Phase = "input" | "loaded" | "roasting";

export default function App() {
  const [connected, setConnected] = useState(false);
  const [phase, setPhase] = useState<Phase>("input");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Roast state
  const [repoOverview, setRepoOverview] = useState<string | null>(null);
  const [currentRoast, setCurrentRoast] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [isTypewriting, setIsTypewriting] = useState(false);
  const [currentlyRoasting, setCurrentlyRoasting] = useState<string | null>(null);
  const [pat, setPat] = useState<string | undefined>(undefined);

  const agent = useAgent<any, RoastAgentState>({
    agent: "RoastAgent",
    onOpen: () => setConnected(true),
    onClose: () => setConnected(false),
  });

  const { speak, isSpeaking, ttsError, stop: stopSpeaking } = useStreamingTTS({ agent });

  // Derive duck status
  const getDuckStatus = (): DuckStatus => {
    if (agent.state?.isProcessing) return "processing";
    if (isSpeaking) return "speaking";
    if ((agent.state?.shameLevelIndex ?? 0) >= 4) return "meltdown";
    return "idle";
  };

  // ── Load repo ────────────────────────────────────────────
  const handleLoadRepo = useCallback(
    async (url: string, patToken?: string) => {
      setError(null);
      setPat(patToken);
      try {
        const result = await agent.call("loadRepo", [url, patToken]) as {
          success: boolean;
          overview?: string;
          files?: Array<{ path: string; reason: string }>;
          error?: string;
        };

        if (!result.success) {
          setError(result.error ?? "Something went wrong. Even the error handler is confused.");
          return;
        }

        setRepoOverview(result.overview ?? null);
        setPhase("loaded");

        // Auto-speak the overview
        if (result.overview) {
          const shortOverview = result.overview.length > 500
            ? result.overview.slice(0, 500) + "..."
            : result.overview;
          speak(shortOverview).catch(() => {});
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Connection lost. Even the WebSocket gave up on you.");
      }
    },
    [agent, speak]
  );

  // ── Roast file ───────────────────────────────────────────
  const handleRoastFile = useCallback(
    async (filePath: string) => {
      setError(null);
      setCurrentlyRoasting(filePath);
      setPhase("roasting");
      stopSpeaking();

      try {
        const result = await agent.call("roastFile", [filePath, pat]) as
          | { roastText: string; fileName: string }
          | { error: string };

        if ("error" in result) {
          setError(result.error);
          setCurrentlyRoasting(null);
          return;
        }

        setCurrentRoast(result.roastText);
        setCurrentFileName(result.fileName);
        setIsTypewriting(true);
        setCurrentlyRoasting(null);

        // Auto-speak the roast
        const shortRoast = result.roastText.length > 600
          ? result.roastText.slice(0, 600) + "..."
          : result.roastText;
        speak(shortRoast).catch(() => {});
      } catch (err) {
        setError(err instanceof Error ? err.message : "Roast failed. Your code broke the roast engine.");
        setCurrentlyRoasting(null);
      }
    },
    [agent, pat, speak, stopSpeaking]
  );

  // ── Reset ────────────────────────────────────────────────
  const handleReset = useCallback(async () => {
    stopSpeaking();
    await agent.call("resetSession");
    setPhase("input");
    setRepoOverview(null);
    setCurrentRoast(null);
    setCurrentFileName(null);
    setError(null);
    setCurrentlyRoasting(null);
  }, [agent, stopSpeaking]);

  const shameLevelIndex = agent.state?.shameLevelIndex ?? 0;

  return (
    <div className="relative min-h-screen">
      {/* Particle background */}
      <ParticleBackground shameLevel={shameLevelIndex} />

      {/* Settings */}
      <SettingsPanel agent={agent} isOpen={settingsOpen} onToggle={() => setSettingsOpen(!settingsOpen)} />

      {/* Connection indicator */}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
          style={{ boxShadow: connected ? "0 0 6px #22c55e" : "0 0 6px #ef4444" }}
        />
        <span className="text-xs text-neutral-600">
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center min-h-screen px-4 py-8">
        {/* Title */}
        <div className="text-center mb-2 animate-fade-in">
          <h1 className="text-4xl font-black tracking-tight">
            <span className="text-amber-400">🦆</span> Rubber Duck
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            The Senior Dev That Roasts Your Code
          </p>
        </div>

        {/* Duck */}
        <div className="my-4">
          <Duck status={getDuckStatus()} shameLevel={shameLevelIndex} />
        </div>

        {/* Status message */}
        {agent.state?.statusMessage && (
          <div className="text-sm text-amber-400/80 mb-4 animate-fade-in text-center">
            {agent.state.statusMessage}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="w-full max-w-2xl mx-auto mb-4 animate-fade-in">
            <div className="roast-card rounded-lg p-4 border-red-600">
              <p className="text-red-400 text-sm">💀 {error}</p>
            </div>
          </div>
        )}

        {/* TTS error — subtle, not blocking */}
        {ttsError && !error && (
          <div className="w-full max-w-2xl mx-auto mb-2 animate-fade-in">
            <p className="text-amber-500/70 text-xs text-center">{ttsError}</p>
          </div>
        )}

        {/* Phase: Input */}
        {phase === "input" && (
          <GitHubInput
            onSubmit={handleLoadRepo}
            isLoading={agent.state?.isProcessing ?? false}
            disabled={!connected}
          />
        )}

        {/* Phase: Loaded / Roasting — overview */}
        {(phase === "loaded" || phase === "roasting") && repoOverview && !currentRoast && (
          <RoastDisplay roastText={repoOverview} fileName="Repository Overview" isAnimating={true} />
        )}

        {/* Phase: Roasting — current roast */}
        {phase === "roasting" && currentRoast && (
          <RoastDisplay
            roastText={currentRoast}
            fileName={currentFileName}
            isAnimating={isTypewriting}
          />
        )}

        {/* File list */}
        {(phase === "loaded" || phase === "roasting") && (
          <div className="mt-6 w-full flex justify-center">
            <FileList
              files={agent.state?.repoFiles ?? null}
              onRoastFile={handleRoastFile}
              currentlyRoasting={currentlyRoasting}
            />
          </div>
        )}

        {/* Reset button */}
        {phase !== "input" && (
          <button
            onClick={handleReset}
            className="mt-8 px-6 py-3 text-sm text-neutral-500 hover:text-white
                       border border-neutral-800 hover:border-red-500 rounded-lg
                       transition-smooth cursor-pointer"
          >
            🧹 Wipe My Shame and Start Over
          </button>
        )}

        {/* Spacer so dashboard doesn't overlap content */}
        <div className="h-20" />
      </div>

      {/* Shame dashboard — fixed bottom-right */}
      {(phase === "loaded" || phase === "roasting") && agent.state && (
        <div className="fixed bottom-4 right-4 z-30">
          <ShameDashboard state={agent.state} />
        </div>
      )}
    </div>
  );
}
