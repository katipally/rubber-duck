import { useState, useRef, useCallback, useEffect } from "react";

interface UseStreamingTTSOptions {
  agent: any;
}

interface UseStreamingTTSReturn {
  speak: (text: string) => Promise<void>;
  isSpeaking: boolean;
  ttsError: string | null;
  stop: () => void;
}

export function useStreamingTTS({ agent }: UseStreamingTTSOptions): UseStreamingTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (mountedRef.current) setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!agent) return;

      // Stop any current audio
      stop();

      try {
        setIsSpeaking(true);
        setTtsError(null);

        // Call backend to generate audio
        const dataUri: string = await agent.call("speak", [text]);

        if (!mountedRef.current) return;

        const audio = new Audio(dataUri);
        audioRef.current = audio;

        audio.onended = () => {
          if (mountedRef.current) {
            setIsSpeaking(false);
            audioRef.current = null;
          }
        };

        audio.onerror = () => {
          if (mountedRef.current) {
            setIsSpeaking(false);
            audioRef.current = null;
          }
        };

        await audio.play();
      } catch (err) {
        console.error("TTS playback failed:", err);
        if (mountedRef.current) {
          const errMsg = err instanceof Error ? err.message : String(err);
          if (errMsg.includes("401") || errMsg.includes("unusual_activity")) {
            setTtsError("ElevenLabs API key issue — roast text still works; voice is unavailable.");
          } else {
            setTtsError("Voice failed to load. Text-only mode.");
          }
          setIsSpeaking(false);
          audioRef.current = null;
        }
      }
    },
    [agent, stop]
  );

  return { speak, isSpeaking, ttsError, stop };
}
