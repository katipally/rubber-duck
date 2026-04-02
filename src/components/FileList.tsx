import { useState } from "react";

interface FileListProps {
  files: Array<{ path: string; reason: string }> | null;
  onRoastFile: (path: string) => void;
  currentlyRoasting: string | null;
}

export default function FileList({ files, onRoastFile, currentlyRoasting }: FileListProps) {
  const [roastedFiles, setRoastedFiles] = useState<Set<string>>(new Set());

  if (!files || files.length === 0) return null;

  const handleRoast = (path: string) => {
    onRoastFile(path);
    setRoastedFiles((prev) => new Set(prev).add(path));
  };

  return (
    <div className="mx-auto w-full max-w-2xl animate-fade-in-up">
      <div className="border border-neon-green/30 bg-neon-surface p-4 neon-glow-green">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-neon-ink">
          <span className="h-2 w-2 bg-neon-pink" aria-hidden />
          Roast-worthy files
        </h3>

        <div className="space-y-2">
          {files.map((file) => {
            const isRoasting = currentlyRoasting === file.path;
            const wasRoasted = roastedFiles.has(file.path);

            return (
              <div
                key={file.path}
                className={`flex items-start gap-3 border p-3 transition-colors ${
                  isRoasting
                    ? "border-neon-pink/50 bg-neon-pink/10"
                    : wasRoasted
                      ? "border-neon-green/30 bg-neon-green/5"
                      : "border-neon-ink/10 hover:border-neon-cyan/30"
                }`}
              >
                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                  {isRoasting ? (
                    <span
                      className="inline-block size-4 rounded-full border-2 border-neon-muted border-t-neon-pink animate-spin"
                      aria-hidden
                    />
                  ) : wasRoasted ? (
                    <span className="text-sm font-black text-neon-green" aria-hidden>
                      OK
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-neon-muted" aria-hidden>
                      ·
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-sm font-bold text-neon-cyan">{file.path}</div>
                  <div className="mt-1 text-xs text-neon-muted">{file.reason}</div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRoast(file.path)}
                  disabled={isRoasting}
                  className="shrink-0 cursor-pointer border border-neon-pink/50 bg-neon-pink px-3 py-1.5 text-xs font-black text-white transition-all hover:shadow-neon-pink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isRoasting ? "Roasting…" : wasRoasted ? "Roast again" : "Roast this"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
