import { useState, useCallback } from "react";
import { useAgent } from "agents/react";
import type { RoastAgentState } from "./agents/roast-agent";

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

  const { speak, ttsError, stop: stopSpeaking } = useStreamingTTS({ agent });

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
    [agent, pat, speak, stopSpeaking]
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

  const shameLevelIndex = agent.state?.shameLevelIndex ?? 0;

  return (
    <div className="relative min-h-screen">
      <ParticleBackground shameLevel={shameLevelIndex} />

      <SettingsPanel agent={agent} isOpen={settingsOpen} onToggle={() => setSettingsOpen(!settingsOpen)} />

      <div className="fixed left-3 top-3 z-50 flex items-center gap-2 border-[3px] border-neo-ink bg-neo-surface px-3 py-2 shadow-neo-sm">
        <div
          className={`h-2.5 w-2.5 shrink-0 ring-2 ring-neo-ink ${connected ? "bg-green-600" : "bg-neo-red"}`}
          aria-hidden
        />
        <span className="text-xs font-bold uppercase tracking-wide text-neutral-700">
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div className="relative z-10 min-h-[100dvh] px-6 pb-16 pt-14 sm:px-10 sm:pb-20">
        {phase === "input" ? (
          <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col items-center">
            <div className="flex w-full max-w-2xl shrink-0 flex-col items-center gap-1 px-2 sm:gap-2">
              <header className="-mt-1 animate-fade-in text-center">
                <h1 className="font-display text-4xl tracking-tight text-neo-ink">
                  <span
                    className="mr-2 inline-block h-3 w-3 bg-neo-blue align-middle ring-2 ring-neo-ink"
                    aria-hidden
                  />
                  Rubber Duck
                </h1>
                <p className="mt-1 text-sm font-semibold text-neutral-600">
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
                  <div className="border-[3px] border-neo-red bg-red-50 p-5 shadow-neo-sm sm:p-6">
                    <p className="text-sm font-bold text-neo-red sm:text-base">Error: {error}</p>
                  </div>
                </div>
              )}

              {ttsError && !error && (
                <p className="px-2 text-center text-sm font-semibold text-neutral-600 sm:text-base">
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
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-10 sm:gap-12">
            <header className="animate-fade-in px-2 text-center">
              <h1 className="font-display text-4xl tracking-tight text-neo-ink">
                <span
                  className="mr-2 inline-block h-3 w-3 bg-neo-blue align-middle ring-2 ring-neo-ink"
                  aria-hidden
                />
                Rubber Duck
              </h1>
              <p className="mt-1 text-sm font-semibold text-neutral-600">
                The senior dev that roasts your code
              </p>
            </header>

            {agent.state?.statusMessage && (
              <div className="text-center text-sm font-semibold text-neo-blue">
                {agent.state.statusMessage}
              </div>
            )}

            {error && (
              <div className="w-full animate-fade-in">
                <div className="border-[3px] border-neo-red bg-red-50 p-5 shadow-neo-sm">
                  <p className="text-sm font-bold text-neo-red sm:text-base">Error: {error}</p>
                </div>
              </div>
            )}

            {ttsError && !error && (
              <p className="text-center text-sm font-semibold text-neutral-600 sm:text-base">{ttsError}</p>
            )}

            {(phase === "loaded" || phase === "roasting") && repoOverview && !currentRoast && (
              <RoastDisplay roastText={repoOverview} fileName="Repository Overview" isAnimating={true} />
            )}

            {phase === "roasting" && currentRoast && (
              <RoastDisplay
                roastText={currentRoast}
                fileName={currentFileName}
                isAnimating={isTypewriting}
              />
            )}

            <div className="flex w-full justify-center">
              <FileList
                files={agent.state?.repoFiles ?? null}
                onRoastFile={handleRoastFile}
                currentlyRoasting={currentlyRoasting}
              />
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="mt-2 cursor-pointer border-[3px] border-neo-ink bg-neo-surface px-8 py-3.5 text-sm font-black uppercase tracking-wide text-neo-ink shadow-neo-sm transition-all hover:bg-neo-red hover:text-white"
            >
              Wipe shame and start over
            </button>

            <div className="h-12 sm:h-16" aria-hidden />
          </div>
        )}
      </div>

      {(phase === "loaded" || phase === "roasting") && agent.state && (
        <div className="fixed bottom-6 right-6 z-30">
          <ShameDashboard state={agent.state} />
        </div>
      )}
    </div>
  );
}
