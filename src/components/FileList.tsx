interface FileListProps {
  files: Array<{ path: string; reason: string }> | null;
  onRoastFile: (path: string) => void;
  onClearFileRoast?: (path: string) => void;
  onShowCachedRoast?: (path: string) => void;
  currentlyRoasting: string | null;
  roastCache?: Record<string, { roastText: string }>;
  currentFileName?: string | null;
}

export default function FileList({
  files,
  onRoastFile,
  onClearFileRoast,
  onShowCachedRoast,
  currentlyRoasting,
  roastCache,
  currentFileName,
}: FileListProps) {
  if (!files || files.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-2xl animate-fade-in-up">
      <div className="border-[3px] border-neo-ink bg-neo-surface p-4 shadow-neo">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-neo-ink">
          <span className="h-2 w-2 bg-neo-red" aria-hidden />
          Roast-worthy files
        </h3>

        <div className="space-y-2">
          {files.map((file) => {
            const isRoasting = currentlyRoasting === file.path;
            const cached = roastCache?.[file.path];
            const isActive = currentFileName === file.path;

            return (
              <div
                key={file.path}
                className={`hover-glow group flex items-start gap-3 border-[2px] p-3 transition-colors cursor-pointer ${
                  isActive
                    ? "border-neo-blue bg-neo-blue/10"
                    : isRoasting
                      ? "border-neo-red bg-neo-red/5"
                      : cached
                        ? "border-neo-ink/40 bg-neutral-50"
                        : "border-neo-ink/20 hover:border-neo-ink"
                }`}
                onClick={() => {
                  if (cached && !isRoasting) {
                    onShowCachedRoast?.(file.path);
                  } else if (!isRoasting) {
                    onRoastFile(file.path);
                  }
                }}
              >
                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                  {isRoasting ? (
                    <span
                      className="inline-block size-4 rounded-full border-[3px] border-neo-ink border-t-neo-blue animate-spin"
                      aria-hidden
                    />
                  ) : cached ? (
                    <span className="text-sm font-black text-neo-blue" aria-hidden>
                      ✓
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-neutral-400" aria-hidden>
                      ·
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-sm font-bold text-neo-ink">{file.path}</div>
                  <div className="mt-1 text-xs text-neutral-500">{file.reason}</div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {cached && !isRoasting && onClearFileRoast && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearFileRoast(file.path);
                      }}
                      className="hidden cursor-pointer border-[2px] border-neo-ink bg-neo-surface px-2 py-1 text-xs font-bold text-neutral-500 hover:bg-neutral-100 group-hover:inline-block"
                      title="Clear roast"
                    >
                      ×
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRoastFile(file.path);
                    }}
                    disabled={isRoasting}
                    className="shrink-0 cursor-pointer border-[3px] border-neo-ink bg-neo-red px-3 py-1.5 text-xs font-black text-white shadow-neo-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_#0a0a0a] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isRoasting ? "Roasting…" : cached ? "Re-roast" : "Roast this"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
