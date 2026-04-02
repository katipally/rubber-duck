import { useEffect, useState, useRef } from "react";

interface RoastDisplayProps {
  roastText: string | null;
  fileName: string | null;
  isAnimating: boolean;
}

export default function RoastDisplay({ roastText, fileName, isAnimating }: RoastDisplayProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevTextRef = useRef<string | null>(null);

  useEffect(() => {
    if (!roastText || roastText === prevTextRef.current) return;
    prevTextRef.current = roastText;

    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!isAnimating) {
      setDisplayedText(roastText);
      setIsTyping(false);
      return;
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
    };
  }, [roastText, isAnimating]);

  if (!roastText) return null;

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in-up">
      <div className="roast-card rounded-lg p-6 space-y-3">
        {/* File name header */}
        {fileName && (
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <span className="text-red-500 font-mono">📄</span>
            <span className="font-mono">{fileName}</span>
            <span className="text-neutral-600">— the verdict:</span>
          </div>
        )}

        {/* Roast text */}
        <div className="text-lg leading-relaxed text-neutral-200 font-serif italic">
          <span>"{displayedText}</span>
          {isTyping && <span className="typewriter-cursor" />}
          {!isTyping && <span>"</span>}
        </div>

        {/* Stamp */}
        <div className="flex justify-end">
          <span className="text-xs text-red-500/60 font-mono uppercase tracking-widest">
            — Rubber Duck Code Review™
          </span>
        </div>
      </div>
    </div>
  );
}
