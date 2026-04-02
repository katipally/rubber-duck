import { useState, useRef, useCallback, useEffect } from "react";
import { ELEVENLABS_TTS_MODEL } from "../lib/constants";

interface CharacterAlignment {
  characters: string[];
  characterStartTimesSeconds: number[];
  characterEndTimesSeconds: number[];
}

interface UseStreamingTTSOptions {
  voiceId: string;
  apiKey: string;
}

interface UseStreamingTTSReturn {
  speak: (text: string) => Promise<void>;
  isSpeaking: boolean;
  ttsError: string | null;
  stop: () => void;
  revealedCount: number;
  alignment: CharacterAlignment | null;
}

export function useStreamingTTS({ voiceId, apiKey }: UseStreamingTTSOptions): UseStreamingTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [revealedCount, setRevealedCount] = useState(0);
  const [alignment, setAlignment] = useState<CharacterAlignment | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const startTimesRef = useRef<number[]>([]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    if (mountedRef.current) {
      setIsSpeaking(false);
    }
  }, []);

  const syncLoop = useCallback(() => {
    if (!audioRef.current || !mountedRef.current) return;
    const currentTime = audioRef.current.currentTime;
    const startTimes = startTimesRef.current;

    let count = 0;
    for (let i = 0; i < startTimes.length; i++) {
      if (currentTime >= startTimes[i]) {
        count = i + 1;
      } else {
        break;
      }
    }
    setRevealedCount(count);

    if (!audioRef.current.paused && !audioRef.current.ended) {
      rafRef.current = requestAnimationFrame(syncLoop);
    }
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!apiKey || !voiceId) return;

      stop();
      setRevealedCount(0);
      setAlignment(null);
      startTimesRef.current = [];

      try {
        setIsSpeaking(true);
        setTtsError(null);

        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
          {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text,
              model_id: ELEVENLABS_TTS_MODEL,
            }),
          }
        );

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Status ${response.status}: ${errorBody}`);
        }

        if (!mountedRef.current) return;

        const data = await response.json();

        // Extract alignment data (prefer normalized_alignment)
        const align = data.normalized_alignment || data.alignment;
        if (align) {
          const charAlign: CharacterAlignment = {
            characters: align.characters || [],
            characterStartTimesSeconds: align.character_start_times_seconds || [],
            characterEndTimesSeconds: align.character_end_times_seconds || [],
          };
          setAlignment(charAlign);
          startTimesRef.current = charAlign.characterStartTimesSeconds;
        } else {
          setRevealedCount(text.length);
        }

        // Decode base64 audio
        const audioBase64 = data.audio_base64;
        if (!audioBase64) {
          setRevealedCount(text.length);
          setIsSpeaking(false);
          return;
        }

        const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
        const blob = new Blob([audioBytes], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onplay = () => {
          rafRef.current = requestAnimationFrame(syncLoop);
        };

        audio.onended = () => {
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          if (mountedRef.current) {
            setRevealedCount(startTimesRef.current.length || text.length);
            setIsSpeaking(false);
            audioRef.current = null;
          }
          URL.revokeObjectURL(url);
          blobUrlRef.current = null;
        };

        audio.onerror = () => {
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          if (mountedRef.current) {
            setRevealedCount(text.length);
            setIsSpeaking(false);
            audioRef.current = null;
          }
          URL.revokeObjectURL(url);
          blobUrlRef.current = null;
        };

        await audio.play();
      } catch (err) {
        console.error("TTS with-timestamps failed:", err);
        if (mountedRef.current) {
          const errMsg = err instanceof Error ? err.message : String(err);
          if (errMsg.includes("401") || errMsg.includes("unusual_activity")) {
            setTtsError("ElevenLabs API key issue — voice is unavailable.");
          } else {
            setTtsError("Voice playback failed. Text-only mode.");
          }
          setRevealedCount(text.length);
          setIsSpeaking(false);
          audioRef.current = null;
        }
      }
    },
    [apiKey, voiceId, stop, syncLoop]
  );

  return { speak, isSpeaking, ttsError, stop, revealedCount, alignment };
}
