import { useEffect, useState, useRef } from "react";

interface Model {
  id: string;
  name: string;
  description: string;
}
interface Voice {
  voiceId: string;
  name: string;
  previewUrl: string | null;
  labels: Record<string, string>;
}

interface SettingsPanelProps {
  agent: any;
  isOpen: boolean;
  onToggle: () => void;
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      aria-hidden
    >
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default function SettingsPanel({ agent, isOpen, onToggle }: SettingsPanelProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("");
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (!agent || fetched.current) return;
    fetched.current = true;

    agent.call("listModels").then((m: Model[]) => {
      setModels(m);
      if (agent.state?.selectedModel) setSelectedModel(agent.state.selectedModel);
      else if (m.length > 0) setSelectedModel(m[0].id);
    }).catch((err: unknown) => console.error("Failed to load models:", err));

    agent.call("listVoices").then((v: Voice[]) => {
      setVoices(v);
      if (agent.state?.selectedVoiceId) setSelectedVoice(agent.state.selectedVoiceId);
      else if (v.length > 0) setSelectedVoice(v[0].voiceId);
    }).catch((err: unknown) => console.error("Failed to load voices:", err));
  }, [agent]);

  useEffect(() => {
    if (agent?.state?.selectedModel && agent.state.selectedModel !== selectedModel) {
      setSelectedModel(agent.state.selectedModel);
    }
    if (agent?.state?.selectedVoiceId && agent.state.selectedVoiceId !== selectedVoice) {
      setSelectedVoice(agent.state.selectedVoiceId);
    }
  }, [agent?.state?.selectedModel, agent?.state?.selectedVoiceId]);

  const handleModelChange = async (id: string) => {
    setSelectedModel(id);
    await agent.call("setModel", [id]);
  };

  const handleVoiceChange = async (id: string) => {
    setSelectedVoice(id);
    await agent.call("setVoice", [id]);
  };

  const playPreview = (url: string | null, voiceId: string) => {
    if (!url) return;
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.currentTime = 0;
    }
    if (playingVoiceId === voiceId) {
      setPlayingVoiceId(null);
      return;
    }
    const audio = new Audio(url);
    audio.onended = () => setPlayingVoiceId(null);
    audio.play();
    setPreviewAudio(audio);
    setPlayingVoiceId(voiceId);
  };

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="fixed right-3 top-3 z-50 flex h-10 w-10 cursor-pointer items-center justify-center border-[3px] border-neo-ink bg-neo-surface text-neo-ink shadow-neo-sm transition-all hover:bg-neo-blue hover:text-white"
        title="Settings"
      >
        <GearIcon className={isOpen ? "rotate-90 transition-transform duration-300" : ""} />
      </button>

      {isOpen && (
        <div className="fixed right-3 top-[3.75rem] z-40 w-80 space-y-4 border-[3px] border-neo-ink bg-neo-surface p-4 shadow-neo animate-slide-in-right">
          <h3 className="text-sm font-black uppercase tracking-wider text-neo-ink">Settings</h3>

          <div>
            <label className="mb-1 block text-xs font-bold text-neutral-600">LLM model</label>
            <select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full cursor-pointer border-[3px] border-neo-ink bg-neo-surface px-3 py-2 text-sm font-medium text-neo-ink focus:outline-none focus:ring-4 focus:ring-neo-blue/35"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-neutral-600">Voice</label>
            <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
              {voices.slice(0, 20).map((v) => (
                <div
                  key={v.voiceId}
                  className={`flex cursor-pointer items-center gap-2 border-2 p-2 text-sm transition-colors ${
                    selectedVoice === v.voiceId
                      ? "border-neo-blue bg-blue-50"
                      : "border-transparent hover:border-neutral-300 hover:bg-neutral-100"
                  }`}
                  onClick={() => handleVoiceChange(v.voiceId)}
                  onKeyDown={(e) => e.key === "Enter" && handleVoiceChange(v.voiceId)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-neo-ink">{v.name}</span>
                  {v.previewUrl && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playPreview(v.previewUrl, v.voiceId);
                      }}
                      className="shrink-0 cursor-pointer border-2 border-neo-ink bg-neutral-100 px-2 py-1 text-xs font-bold text-neo-ink hover:bg-neo-blue hover:text-white"
                    >
                      {playingVoiceId === v.voiceId ? "Stop" : "Play"}
                    </button>
                  )}
                </div>
              ))}
              {voices.length === 0 && (
                <div className="py-2 text-xs text-neutral-500">Loading voices…</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
