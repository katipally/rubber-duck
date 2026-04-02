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
      <div className="border-[3px] border-neo-ink bg-neo-surface p-4 shadow-neo">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-neo-ink">
          <span className="h-2 w-2 bg-neo-red ring-2 ring-neo-ink" aria-hidden />
          Roast-worthy files
        </h3>

        <div className="space-y-2">
          {files.map((file) => {
            const isRoasting = currentlyRoasting === file.path;
            const wasRoasted = roastedFiles.has(file.path);

            return (
              <div
                key={file.path}
                className={`flex items-start gap-3 border-[3px] p-3 transition-colors ${
                  isRoasting
                    ? "border-neo-red bg-red-50"
                    : wasRoasted
                      ? "border-green-700 bg-green-50"
                      : "border-neutral-300 bg-neutral-50 hover:border-neo-ink"
                }`}
              >
                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                  {isRoasting ? (
                    <span
                      className="inline-block size-4 rounded-full border-2 border-neo-ink border-t-neo-red animate-spin"
                      aria-hidden
                    />
                  ) : wasRoasted ? (
                    <span className="text-sm font-black text-green-800" aria-hidden>
                      OK
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-neutral-400" aria-hidden>
                      ·
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-sm font-bold text-neo-blue">{file.path}</div>
                  <div className="mt-1 text-xs text-neutral-600">{file.reason}</div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRoast(file.path)}
                  disabled={isRoasting}
                  className="shrink-0 cursor-pointer border-2 border-neo-ink bg-neo-red px-3 py-1.5 text-xs font-black text-white shadow-neo-sm transition-all hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_#0a0a0a] disabled:cursor-not-allowed disabled:opacity-40"
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
