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
      <div className="space-y-6 border border-neon-green/30 bg-neon-surface p-6 sm:p-8 sm:space-y-7 neon-glow-green">
        <div>
          <label className="mb-3 block text-sm font-bold text-neon-muted sm:text-base">
            Paste a GitHub repo URL to get roasted
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/your-regrettable-repo"
            disabled={disabled || isLoading}
            className="w-full border border-neon-green/30 bg-neon-bg px-4 py-3 text-lg font-medium text-neon-ink placeholder:text-neon-muted/50 focus:outline-none focus:ring-2 focus:ring-neon-cyan/35 disabled:opacity-50"
          />
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowPat(!showPat)}
            className="flex items-center gap-2 text-sm font-semibold text-neon-muted transition-colors hover:text-neon-ink"
          >
            <span className="font-mono text-neon-cyan">{showPat ? "[−]" : "[+]"}</span>
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
                className="w-full border border-neon-green/30 bg-neon-bg px-4 py-2 text-sm font-medium text-neon-ink placeholder:text-neon-muted/50 focus:outline-none focus:ring-2 focus:ring-neon-cyan/35 disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-neon-muted">
                Token never leaves the server. Only needs read access.
              </p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={disabled || isLoading || !url.trim()}
          className="hover-glow w-full cursor-pointer border border-neon-pink/50 bg-neon-pink py-4 text-lg font-black text-white transition-all hover:shadow-neon-pink disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-3">
              <span
                className="inline-block size-5 shrink-0 rounded-full border-2 border-neon-muted border-t-neon-cyan animate-spin"
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
