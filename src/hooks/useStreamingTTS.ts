import { useState, useRef, useCallback, useEffect } from "react";

interface UseStreamingTTSOptions {
  voiceId: string;
  apiKey: string;
}

interface UseStreamingTTSReturn {
  speak: (text: string) => Promise<void>;
  isSpeaking: boolean;
  ttsError: string | null;
  stop: () => void;
}

/**
 * Calls ElevenLabs TTS directly from the browser.
 * This avoids Cloudflare Worker shared IPs being blocked by ElevenLabs' free-tier proxy detection.
 */
export function useStreamingTTS({ voiceId, apiKey }: UseStreamingTTSOptions): UseStreamingTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

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
    };
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    if (mountedRef.current) setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!apiKey || !voiceId) return;

      stop();

      try {
        setIsSpeaking(true);
        setTtsError(null);

        // Call ElevenLabs REST API directly from the browser
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128&optimize_streaming_latency=3`,
          {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text,
              model_id: "eleven_flash_v2_5",
            }),
          }
        );

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Status code: ${response.status}\nBody: ${errorBody}`);
        }

        if (!mountedRef.current) return;

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          if (mountedRef.current) {
            setIsSpeaking(false);
            audioRef.current = null;
          }
          URL.revokeObjectURL(url);
          blobUrlRef.current = null;
        };

        audio.onerror = () => {
          if (mountedRef.current) {
            setIsSpeaking(false);
            audioRef.current = null;
          }
          URL.revokeObjectURL(url);
          blobUrlRef.current = null;
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
    [apiKey, voiceId, stop]
  );

  return { speak, isSpeaking, ttsError, stop };
}
