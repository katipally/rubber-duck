import { useState, useCallback, useEffect, useRef } from "react";
import { useAgent } from "agents/react";
import type { RoastAgentState } from "./agents/roast-agent";

import GitHubInput from "./components/GitHubInput";
import RoastDisplay from "./components/RoastDisplay";
import ShameDashboard from "./components/ShameDashboard";
import SettingsPanel from "./components/SettingsPanel";
import ParticleBackground from "./components/ParticleBackground";
import { useStreamingTTS } from "./hooks/useStreamingTTS";

type Phase = "input" | "loaded" | "roasting";

const DUCK_EMOJIS = ["🦆", "🔥", "💀", "😤", "🤮", "💅"];

export default function App() {
  const [connected, setConnected] = useState(false);
  const [phase, setPhase] = useState<Phase>("input");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [repoOverview, setRepoOverview] = useState<string | null>(null);
  const [currentRoast, setCurrentRoast] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  const [isTypewriting, setIsTypewriting] = useState(false);
  const [currentlyRoasting, setCurrentlyRoasting] = useState<string | null>(null);
  const [pat, setPat] = useState<string | undefined>(undefined);

  // Fun effects state
  const [duckReaction, setDuckReaction] = useState<{ emoji: string; key: number } | null>(null);
  const [shameToast, setShameToast] = useState<string | null>(null);
  const shameToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const duckReactionKey = useRef(0);

  const agent = useAgent<any, RoastAgentState>({
    agent: "RoastAgent",
    onOpen: () => setConnected(true),
    onClose: () => setConnected(false),
  });

  const voiceId = agent.state?.selectedVoiceId || "JBFqnCBsd6RMkjVDRZzb";
  const ttsApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY ?? "";
  const { speak, isSpeaking, ttsError, stop: stopSpeaking, revealedCount } = useStreamingTTS({ voiceId, apiKey: ttsApiKey });

  const triggerDuckReaction = useCallback(() => {
    const emoji = DUCK_EMOJIS[Math.floor(Math.random() * DUCK_EMOJIS.length)];
    duckReactionKey.current += 1;
    setDuckReaction({ emoji, key: duckReactionKey.current });
    setTimeout(() => setDuckReaction(null), 1500);
  }, []);

  const handleShameLevelUp = useCallback((level: string) => {
    if (shameToastTimer.current) clearTimeout(shameToastTimer.current);
    setShameToast(level);
    shameToastTimer.current = setTimeout(() => setShameToast(null), 3000);
  }, []);

  const handleLoadRepo = useCallback(
    async (url: string, patToken?: string) => {
      setError(null);
      setPat(patToken);
      try {
        const result = (await agent.call("loadRepo", [url, patToken])) as {
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

        if (result.overview) {
          const shortOverview =
            result.overview.length > 500 ? result.overview.slice(0, 500) + "..." : result.overview;
          speak(shortOverview).catch(() => {});
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Connection lost. Even the WebSocket gave up on you."
        );
      }
    },
    [agent, speak]
  );

  const handleRoastFile = useCallback(
    async (filePath: string) => {
      setError(null);
      setCurrentlyRoasting(filePath);
      setPhase("roasting");
      stopSpeaking();

      try {
        const result = (await agent.call("roastFile", [filePath, pat])) as
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
        triggerDuckReaction();

        const shortRoast =
          result.roastText.length > 600 ? result.roastText.slice(0, 600) + "..." : result.roastText;
        speak(shortRoast).catch(() => {});
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Roast failed. Your code broke the roast engine."
        );
        setCurrentlyRoasting(null);
      }
    },
    [agent, pat, speak, stopSpeaking, triggerDuckReaction]
  );

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

  const handleFullRepoRoast = useCallback(async () => {
    setError(null);
    stopSpeaking();
    try {
      const result = (await agent.call("roastFullRepo", [pat])) as
        | { roastText: string }
        | { error: string };
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setCurrentRoast(result.roastText);
      setCurrentFileName("Full Repository Verdict");
      setIsTypewriting(true);
      triggerDuckReaction();
      const short = result.roastText.length > 600 ? result.roastText.slice(0, 600) + "..." : result.roastText;
      speak(short).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Full repo roast failed.");
    }
  }, [agent, pat, speak, stopSpeaking, triggerDuckReaction]);

  const handleClearFileRoast = useCallback(async (filePath: string) => {
    await agent.call("clearFileRoast", [filePath]);
    if (currentFileName === filePath) {
      setCurrentRoast(null);
      setCurrentFileName(null);
    }
  }, [agent, currentFileName]);

  const shameLevelIndex = agent.state?.shameLevelIndex ?? 0;

  return (
    <div className="relative min-h-screen">
      <ParticleBackground shameLevel={shameLevelIndex} />

      {/* CRT scanline overlay */}
      <div className="crt-overlay" aria-hidden />

      {/* Shame level-up toast */}
      {shameToast && (
        <div
          key={shameToast}
          className="shame-toast fixed left-1/2 top-4 z-[60] border border-neon-purple/50 bg-neon-surface px-5 py-3 text-sm font-black uppercase tracking-wider text-neon-purple neon-border-purple"
        >
          ⚡ SHAME LEVEL UP: {shameToast}
        </div>
      )}

      {/* Duck emoji reaction */}
      {duckReaction && (
        <div
          key={duckReaction.key}
          className="duck-reaction fixed left-1/2 top-1/3 z-[55] -translate-x-1/2 text-6xl"
        >
          {duckReaction.emoji}
        </div>
      )}

      <SettingsPanel agent={agent} isOpen={settingsOpen} onToggle={() => setSettingsOpen(!settingsOpen)} />

      <div className="fixed left-3 top-3 z-50 flex items-center gap-2 border border-neon-green/30 bg-neon-surface px-3 py-2">
        <div
          className={`h-2.5 w-2.5 shrink-0 ${connected ? "bg-neon-green" : "bg-neon-red"}`}
          aria-hidden
        />
        <span className="text-xs font-bold uppercase tracking-wide text-neon-muted">
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div className="relative z-10 min-h-[100dvh]">
        {phase === "input" ? (
          <div className="flex min-h-[100dvh] flex-col items-center px-6 pb-16 pt-14 sm:px-10 sm:pb-20">
            <div className="flex w-full max-w-2xl shrink-0 flex-col items-center gap-1 px-2 sm:gap-2">
              <header className="-mt-1 animate-fade-in text-center">
                <h1 className="font-display text-4xl tracking-tight text-neon-ink">
                  <span
                    className="mr-2 inline-block h-3 w-3 bg-neon-green align-middle"
                    aria-hidden
                  />
                  Rubber Duck
                </h1>
                <p className="mt-1 text-sm font-semibold text-neon-muted">
                  The senior dev that roasts your code
                </p>
              </header>

              {agent.state?.statusMessage && (
                <div className="animate-fade-in text-center text-sm font-semibold text-neon-cyan">
                  {agent.state.statusMessage}
                </div>
              )}

              {error && (
                <div className="w-full animate-fade-in">
                  <div className="border border-neon-red/30 bg-neon-red/5 p-5 sm:p-6">
                    <p className="text-sm font-bold text-neon-red sm:text-base">Error: {error}</p>
                  </div>
                </div>
              )}

              {ttsError && !error && (
                <p className="px-2 text-center text-sm font-semibold text-neon-muted sm:text-base">
                  {ttsError}
                </p>
              )}
            </div>

            <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center px-2 pb-8 pt-6">
              <GitHubInput
                onSubmit={handleLoadRepo}
                isLoading={agent.state?.isProcessing ?? false}
                disabled={!connected}
              />
            </div>
          </div>
        ) : (
          /* After repo is loaded, show sidebar layout */
          <div className="flex min-h-[calc(100dvh-3.5rem)] pt-14">
            {/* Left Sidebar */}
            <aside className="w-72 shrink-0 border-r border-neon-green/20 bg-neon-surface p-4 overflow-y-auto">
              {/* Repo info */}
              <div className="mb-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neon-muted">
                  <span className="h-1.5 w-1.5 bg-neon-green" aria-hidden />
                  Repository
                </div>
                <div className="mt-1 truncate font-mono text-sm text-neon-green">
                  {agent.state?.currentRepo?.replace("https://github.com/", "") ?? ""}
                </div>
              </div>

              {/* Full Repo Roast button */}
              <button
                type="button"
                onClick={handleFullRepoRoast}
                disabled={agent.state?.isProcessing}
                className="hover-glow mb-4 w-full cursor-pointer border border-neon-pink/50 bg-neon-pink/10 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-neon-pink transition-all hover:bg-neon-pink/20 hover:shadow-neon-pink disabled:opacity-40"
              >
                ⚡ Roast Entire Repo
              </button>

              {/* File list */}
              <div className="mb-4">
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-neon-muted">
                  Roast-worthy files
                </div>
                <div className="space-y-1">
                  {(agent.state?.repoFiles ?? []).map((file) => {
                    const isRoasting = currentlyRoasting === file.path;
                    const cached = agent.state?.roastCache?.[file.path];
                    const isActive = currentFileName === file.path;

                    return (
                      <div
                        key={file.path}
                        className={`hover-glow group flex items-center gap-2 border px-2.5 py-2 text-xs cursor-pointer transition-all ${
                          isActive
                            ? "border-neon-green/50 bg-neon-green/10"
                            : cached
                              ? "border-neon-purple/30 bg-neon-purple/5 hover:border-neon-purple/50"
                              : "border-neon-ink/10 hover:border-neon-cyan/30 hover:bg-neon-cyan/5"
                        }`}
                        onClick={() => {
                          if (cached && !isRoasting) {
                            setCurrentRoast(cached.roastText);
                            setCurrentFileName(file.path);
                            setPhase("roasting");
                          } else if (!isRoasting) {
                            handleRoastFile(file.path);
                          }
                        }}
                      >
                        {/* Status indicator */}
                        <span className={`h-1.5 w-1.5 shrink-0 ${
                          isRoasting ? "animate-pulse bg-neon-pink" :
                          cached ? "bg-neon-purple" : "bg-neon-muted/30"
                        }`} />

                        {/* File path */}
                        <span className={`min-w-0 flex-1 truncate font-mono ${
                          isActive ? "text-neon-green" : cached ? "text-neon-purple" : "text-neon-ink/70"
                        }`}>
                          {file.path.split("/").pop()}
                        </span>

                        {/* Action buttons */}
                        {cached && !isRoasting && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearFileRoast(file.path);
                            }}
                            className="hidden shrink-0 text-neon-muted hover:text-neon-red group-hover:inline-block"
                            title="Clear roast"
                          >
                            ×
                          </button>
                        )}

                        {!cached && !isRoasting && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRoastFile(file.path);
                            }}
                            className="hidden shrink-0 text-neon-pink hover:text-neon-pink group-hover:inline-block"
                            title="Roast this"
                          >
                            🔥
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shame Dashboard inline */}
              <ShameDashboard state={agent.state!} onShameLevelUp={handleShameLevelUp} />

              {/* Reset button */}
              <button
                type="button"
                onClick={handleReset}
                className="hover-glow mt-4 w-full cursor-pointer border border-neon-red/30 bg-neon-red/5 px-3 py-2 text-xs font-bold uppercase tracking-wider text-neon-red/70 transition-all hover:bg-neon-red/10 hover:text-neon-red"
              >
                Reset Session
              </button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto px-8 py-6">
              {agent.state?.statusMessage && (
                <div className="mb-6 text-center text-sm font-semibold text-neon-cyan animate-pulse">
                  {agent.state.statusMessage}
                </div>
              )}

              {error && (
                <div className="mb-6 animate-fade-in border border-neon-red/30 bg-neon-red/5 p-4">
                  <p className="text-sm font-bold text-neon-red">{error}</p>
                </div>
              )}

              {ttsError && !error && (
                <p className="mb-6 text-center text-sm text-neon-muted">{ttsError}</p>
              )}

              {/* Thinking indicator while processing */}
              {(agent.state?.isProcessing || currentlyRoasting) && !currentRoast && (
                <div className="mb-6 flex items-center justify-center gap-3 animate-fade-in">
                  <span className="thinking-bob text-3xl">🦆</span>
                  <span className="text-sm font-bold uppercase tracking-wider text-neon-cyan animate-pulse">
                    Duck is judging your code...
                  </span>
                  <span className="thinking-bob text-3xl" style={{ animationDelay: "0.3s" }}>🦆</span>
                </div>
              )}

              {/* Show overview or file roast — neon pulse ring when speaking */}
              <div className={isSpeaking ? "neon-pulse-ring rounded" : ""}>
                {!currentRoast && repoOverview && (
                  <RoastDisplay
                    roastText={repoOverview}
                    fileName="Repository Overview"
                    isAnimating={true}
                    isSpeaking={isSpeaking}
                    revealedCount={revealedCount}
                  />
                )}
                {currentRoast && (
                  <RoastDisplay
                    roastText={currentRoast}
                    fileName={currentFileName}
                    isAnimating={isTypewriting}
                    isSpeaking={isSpeaking}
                    revealedCount={revealedCount}
                  />
                )}
              </div>

              {/* Empty state */}
              {!currentRoast && !repoOverview && !agent.state?.isProcessing && (
                <div className="flex h-64 items-center justify-center text-neon-muted">
                  <p className="text-center font-mono text-sm">Select a file from the sidebar to begin the roasting...</p>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
