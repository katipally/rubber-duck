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
    <div className="mx-auto w-full max-w-2xl animate-fade-in-up">
      <div className="-rotate-1 space-y-3 border-[3px] border-neo-ink bg-neo-surface p-6 shadow-[6px_6px_0_#dc2626] transition-transform duration-200 hover:rotate-0">
        {fileName && (
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <span className="font-mono font-bold text-neo-red">FILE</span>
            <span className="font-mono text-neo-ink">{fileName}</span>
            <span className="text-neutral-500">— the verdict:</span>
          </div>
        )}

        <div className="text-lg italic leading-relaxed text-neo-ink">
          <span>&ldquo;{displayedText}</span>
          {isTyping && (
            <span
              className="ml-0.5 inline-block font-black text-neo-red animate-cursor-blink"
              aria-hidden
            >
              |
            </span>
          )}
          {!isTyping && <span>&rdquo;</span>}
        </div>

        <div className="flex justify-end">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-neo-red/80">
            — Rubber Duck Code Review
          </span>
        </div>
      </div>
    </div>
  );
}
