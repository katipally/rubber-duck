import { useState, useCallback, useEffect, useRef } from "react";
import { useAgent } from "agents/react";
import type { RoastAgentState } from "./agents/roast-agent";

import GitHubInput from "./components/GitHubInput";
import RoastDisplay from "./components/RoastDisplay";
import ShameDashboard from "./components/ShameDashboard";
import SettingsPanel from "./components/SettingsPanel";
import FileList from "./components/FileList";
import ParticleBackground from "./components/ParticleBackground";
import { useStreamingTTS } from "./hooks/useStreamingTTS";
import { DEFAULT_VOICE_ID, MAX_SPEAK_CHARS } from "./lib/constants";

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

  const voiceId = agent.state?.selectedVoiceId || DEFAULT_VOICE_ID;
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
            result.overview.length > MAX_SPEAK_CHARS ? result.overview.slice(0, MAX_SPEAK_CHARS) + "..." : result.overview;
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
          result.roastText.length > MAX_SPEAK_CHARS ? result.roastText.slice(0, MAX_SPEAK_CHARS) + "..." : result.roastText;
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
      const short = result.roastText.length > MAX_SPEAK_CHARS ? result.roastText.slice(0, MAX_SPEAK_CHARS) + "..." : result.roastText;
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

  const handleShowCachedRoast = useCallback((filePath: string) => {
    const cached = agent.state?.roastCache?.[filePath];
    if (cached) {
      setCurrentRoast(cached.roastText);
      setCurrentFileName(filePath);
      setIsTypewriting(false);
      setPhase("roasting");
    }
  }, [agent.state?.roastCache]);

  const shameLevelIndex = agent.state?.shameLevelIndex ?? 0;

  return (
    <div className="relative min-h-screen">
      <ParticleBackground shameLevel={shameLevelIndex} />

      {/* Shame level-up toast */}
      {shameToast && (
        <div
          key={shameToast}
          className="shame-toast fixed left-1/2 top-4 z-[60] border-[3px] border-neo-ink bg-neo-surface px-5 py-3 text-sm font-black uppercase tracking-wider text-neo-red shadow-neo-sm"
        >
          🔥 SHAME LEVEL UP: {shameToast}
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

      {/* Connection indicator */}
      <div className="fixed left-3 top-3 z-50 flex items-center gap-2 border-[3px] border-neo-ink bg-neo-surface px-3 py-2 shadow-neo-sm">
        <div
          className={`h-2.5 w-2.5 shrink-0 ${connected ? "bg-neo-blue" : "bg-neo-red"}`}
          aria-hidden
        />
        <span className="text-xs font-bold uppercase tracking-wide text-neutral-600">
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div className="relative z-10 min-h-[100dvh]">
        {phase === "input" ? (
          /* ─── Input phase: centered ─── */
          <div className="flex min-h-[100dvh] flex-col items-center px-6 pb-16 pt-14 sm:px-10 sm:pb-20">
            <div className="flex w-full max-w-2xl shrink-0 flex-col items-center gap-1 px-2 sm:gap-2">
              <header className="-mt-1 animate-fade-in text-center">
                <h1 className="font-display text-4xl tracking-tight text-neo-ink">
                  <span
                    className="mr-2 inline-block h-3 w-3 bg-neo-blue align-middle"
                    aria-hidden
                  />
                  Rubber Duck
                </h1>
                <p className="mt-1 text-sm font-semibold text-neutral-500">
                  The senior dev that roasts your code
                </p>
              </header>

              {agent.state?.statusMessage && (
                <div className="animate-fade-in text-center text-sm font-semibold text-neo-blue">
                  {agent.state.statusMessage}
                </div>
              )}

              {error && (
                <div className="w-full animate-fade-in">
                  <div className="border-[3px] border-neo-ink bg-neo-red/10 p-5 sm:p-6">
                    <p className="text-sm font-bold text-neo-red sm:text-base">Error: {error}</p>
                  </div>
                </div>
              )}

              {ttsError && !error && (
                <p className="px-2 text-center text-sm font-semibold text-neutral-500 sm:text-base">
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
          /* ─── Loaded/Roasting phase: centered card layout ─── */
          <div className="flex min-h-[100dvh] flex-col items-center gap-6 px-6 pb-16 pt-16 sm:px-10">
            {/* Header */}
            <header className="animate-fade-in text-center">
              <h1 className="font-display text-3xl tracking-tight text-neo-ink">
                <span className="mr-2 inline-block h-3 w-3 bg-neo-blue align-middle" aria-hidden />
                Rubber Duck
              </h1>
              <div className="mt-1 truncate font-mono text-sm text-neo-blue">
                {agent.state?.currentRepo?.replace("https://github.com/", "") ?? ""}
              </div>
            </header>

            {/* Action bar */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleFullRepoRoast}
                disabled={agent.state?.isProcessing}
                className="hover-glow cursor-pointer border-[3px] border-neo-ink bg-neo-red px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-neo-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_#0a0a0a] disabled:opacity-40"
              >
                🔥 Roast Entire Repo
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="hover-glow cursor-pointer border-[3px] border-neo-ink bg-neo-surface px-5 py-2.5 text-xs font-black uppercase tracking-wider text-neo-ink shadow-neo-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_#0a0a0a]"
              >
                Reset Session
              </button>
            </div>

            {/* Status / error */}
            {agent.state?.statusMessage && (
              <div className="text-center text-sm font-semibold text-neo-blue animate-pulse">
                {agent.state.statusMessage}
              </div>
            )}

            {error && (
              <div className="w-full max-w-2xl animate-fade-in border-[3px] border-neo-ink bg-neo-red/10 p-4">
                <p className="text-sm font-bold text-neo-red">{error}</p>
              </div>
            )}

            {ttsError && !error && (
              <p className="text-center text-sm text-neutral-500">{ttsError}</p>
            )}

            {/* Thinking indicator */}
            {(agent.state?.isProcessing || currentlyRoasting) && !currentRoast && (
              <div className="flex items-center justify-center gap-3 animate-fade-in">
                <span className="thinking-bob text-3xl">🦆</span>
                <span className="text-sm font-bold uppercase tracking-wider text-neo-blue animate-pulse">
                  Duck is judging your code...
                </span>
                <span className="thinking-bob text-3xl" style={{ animationDelay: "0.3s" }}>🦆</span>
              </div>
            )}

            {/* File list */}
            <FileList
              files={agent.state?.repoFiles ?? null}
              onRoastFile={handleRoastFile}
              onClearFileRoast={handleClearFileRoast}
              onShowCachedRoast={handleShowCachedRoast}
              currentlyRoasting={currentlyRoasting}
              roastCache={agent.state?.roastCache}
              currentFileName={currentFileName}
            />

            {/* Roast display with pulse ring when speaking */}
            <div className={isSpeaking ? "pulse-ring w-full max-w-2xl" : "w-full max-w-2xl"}>
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

            {/* Shame Dashboard */}
            {agent.state && (
              <ShameDashboard state={agent.state} onShameLevelUp={handleShameLevelUp} />
            )}

            {/* Empty state */}
            {!currentRoast && !repoOverview && !agent.state?.isProcessing && (
              <div className="flex h-32 items-center justify-center text-neutral-400">
                <p className="text-center text-sm">Pick a file above to begin the roasting…</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
