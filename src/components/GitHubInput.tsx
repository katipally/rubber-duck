import { useState, type FormEvent } from "react";

interface GitHubInputProps {
  onSubmit: (url: string, pat?: string) => void;
  isLoading: boolean;
  disabled: boolean;
}

export default function GitHubInput({ onSubmit, isLoading, disabled }: GitHubInputProps) {
  const [url, setUrl] = useState("");
  const [showPat, setShowPat] = useState(false);
  const [pat, setPat] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    onSubmit(url.trim(), pat.trim() || undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl animate-fade-in-up">
      <div className="space-y-6 border-[3px] border-neo-ink bg-neo-surface p-6 shadow-neo sm:p-8 sm:space-y-7">
        <div>
          <label className="mb-3 block text-sm font-bold text-neutral-700 sm:text-base">
            Paste a GitHub repo URL to get roasted
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/your-regrettable-repo"
            disabled={disabled || isLoading}
            className="w-full border-[3px] border-neo-ink bg-neo-surface px-4 py-3 text-lg font-medium text-neo-ink placeholder:text-neutral-400 focus:outline-none focus:ring-4 focus:ring-neo-blue/35 disabled:opacity-50"
          />
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowPat(!showPat)}
            className="flex items-center gap-2 text-sm font-semibold text-neutral-600 transition-colors hover:text-neo-ink"
          >
            <span className="font-mono text-neo-blue">{showPat ? "[−]" : "[+]"}</span>
            Private repo? Add a PAT
          </button>

          {showPat && (
            <div className="mt-2 animate-fade-in">
              <input
                type="password"
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                placeholder="ghp_your_personal_access_token"
                disabled={disabled || isLoading}
                className="w-full border-[3px] border-neo-ink bg-neo-surface px-4 py-2 text-sm font-medium text-neo-ink placeholder:text-neutral-400 focus:outline-none focus:ring-4 focus:ring-neo-blue/35 disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Token never leaves the server. Only needs read access.
              </p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={disabled || isLoading || !url.trim()}
          className="w-full cursor-pointer border-[3px] border-neo-ink bg-neo-red py-4 text-lg font-black text-white shadow-neo-sm transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_#0a0a0a] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-3">
              <span
                className="inline-block size-5 shrink-0 rounded-full border-[3px] border-neo-ink border-t-neo-blue animate-spin"
                aria-hidden
              />
              Analyzing your sins...
            </span>
          ) : (
            "Roast this repo"
          )}
        </button>
      </div>
    </form>
  );
}
