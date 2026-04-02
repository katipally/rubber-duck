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

  // Sync from agent state
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
      {/* Gear button */}
      <button
        onClick={onToggle}
        className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#333]
                   flex items-center justify-center hover:border-amber-500 transition-smooth cursor-pointer"
        title="Settings"
      >
        <span className={`text-lg transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`}>
          ⚙️
        </span>
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed top-16 right-4 z-40 w-80 glass-panel rounded-xl p-4 space-y-4 animate-slide-in-right">
          <h3 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider">
            Settings
          </h3>

          {/* Model selector */}
          <div>
            <label className="block text-xs text-neutral-500 mb-1">LLM Model</label>
            <select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full px-3 py-2 bg-[#111] border border-[#333] rounded-lg text-sm text-white
                         focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.description}
                </option>
              ))}
            </select>
          </div>

          {/* Voice selector */}
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Voice</label>
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
              {voices.slice(0, 20).map((v) => (
                <div
                  key={v.voiceId}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-smooth text-sm
                              ${selectedVoice === v.voiceId ? "bg-amber-500/10 border border-amber-500/30" : "hover:bg-white/5"}`}
                  onClick={() => handleVoiceChange(v.voiceId)}
                >
                  <span className="flex-1 truncate text-neutral-300">{v.name}</span>
                  {v.previewUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playPreview(v.previewUrl, v.voiceId);
                      }}
                      className="text-xs px-2 py-1 rounded bg-[#222] hover:bg-[#333] text-neutral-400 transition-smooth cursor-pointer"
                    >
                      {playingVoiceId === v.voiceId ? "⏹" : "▶"}
                    </button>
                  )}
                </div>
              ))}
              {voices.length === 0 && (
                <div className="text-xs text-neutral-600 py-2">Loading voices...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
