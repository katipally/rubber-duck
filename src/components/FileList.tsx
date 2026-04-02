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
    <div className="w-full max-w-2xl mx-auto animate-fade-in-up">
      <div className="glass-panel rounded-xl p-4">
        <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>🎯</span> Roast-Worthy Files
        </h3>

        <div className="space-y-2">
          {files.map((file) => {
            const isRoasting = currentlyRoasting === file.path;
            const wasRoasted = roastedFiles.has(file.path);

            return (
              <div
                key={file.path}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-smooth
                  ${isRoasting
                    ? "border-red-500/50 bg-red-500/5"
                    : wasRoasted
                      ? "border-green-500/20 bg-green-500/5"
                      : "border-[#222] hover:border-[#444]"
                  }`}
              >
                {/* Status indicator */}
                <div className="mt-1 flex-shrink-0 text-sm">
                  {isRoasting ? (
                    <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>
                      🔥
                    </span>
                  ) : wasRoasted ? (
                    <span className="text-green-500">✓</span>
                  ) : (
                    <span className="text-neutral-600">○</span>
                  )}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-sm text-amber-400 truncate">{file.path}</div>
                  <div className="text-xs text-neutral-500 mt-1">{file.reason}</div>
                </div>

                {/* Roast button */}
                <button
                  onClick={() => handleRoast(file.path)}
                  disabled={isRoasting}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg
                             bg-red-600/80 hover:bg-red-500 text-white
                             disabled:bg-neutral-800 disabled:text-neutral-600
                             transition-smooth cursor-pointer disabled:cursor-not-allowed"
                >
                  {isRoasting ? "Roasting..." : wasRoasted ? "Roast Again" : "Roast This"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
