import { useEffect, useState, useRef } from "react";

interface RoastDisplayProps {
  roastText: string | null;
  fileName: string | null;
  isAnimating: boolean;
  isSpeaking?: boolean;
  revealedCount?: number;
}

export default function RoastDisplay({ roastText, fileName, isAnimating, isSpeaking, revealedCount }: RoastDisplayProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [shaking, setShaking] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevTextRef = useRef<string | null>(null);
  const useTTSSync = isSpeaking && revealedCount != null;

  // TTS-synced reveal: override internal typewriter when TTS is driving
  useEffect(() => {
    if (!useTTSSync || !roastText) return;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setDisplayedText(roastText.slice(0, revealedCount));
    setIsTyping(revealedCount < roastText.length);
  }, [useTTSSync, revealedCount, roastText]);

  // Internal typewriter fallback
  useEffect(() => {
    if (useTTSSync) return;
    if (!roastText || roastText === prevTextRef.current) return;
    prevTextRef.current = roastText;

    // Trigger shake on new roast
    setShaking(true);
    const shakeTimer = setTimeout(() => setShaking(false), 400);

    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!isAnimating) {
      setDisplayedText(roastText);
      setIsTyping(false);
      return () => clearTimeout(shakeTimer);
    }

    setDisplayedText("");
    setIsTyping(true);

    let idx = 0;
    intervalRef.current = setInterval(() => {
      idx++;
      setDisplayedText(roastText.slice(0, idx));
      if (idx >= roastText.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsTyping(false);
      }
    }, 18);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearTimeout(shakeTimer);
    };
  }, [roastText, isAnimating, useTTSSync]);

  // Show full text when TTS finishes (isSpeaking goes false)
  useEffect(() => {
    if (!isSpeaking && roastText && prevTextRef.current === roastText) {
      setDisplayedText(roastText);
      setIsTyping(false);
    }
  }, [isSpeaking, roastText]);

  if (!roastText) return null;

  return (
    <div className="mx-auto w-full max-w-2xl animate-fade-in-up">
      <div className={`relative space-y-3 border border-neon-pink/30 bg-neon-surface p-6 neon-border-pink scanline-overlay overflow-hidden ${shaking ? "shake-it" : ""}`}>
        {fileName && (
          <div className="flex items-center gap-2 text-sm text-neon-muted">
            <span className="font-mono font-bold text-neon-cyan">FILE</span>
            <span className="font-mono text-neon-ink">{fileName}</span>
            <span className="text-neon-muted">— the verdict:</span>
          </div>
        )}

        <div className="text-lg italic leading-relaxed text-neon-ink">
          <span>&ldquo;{displayedText}</span>
          {isTyping && (
            <span
              className="ml-0.5 inline-block font-black text-neon-green animate-cursor-blink"
              aria-hidden
            >
              |
            </span>
          )}
          {!isTyping && <span>&rdquo;</span>}
        </div>

        <div className="flex justify-end">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-neon-green/80">
            — Rubber Duck Code Review
          </span>
        </div>
      </div>
    </div>
  );
}
