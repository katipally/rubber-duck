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
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto animate-fade-in-up">
      <div className="glass-panel rounded-xl p-6 space-y-4">
        {/* URL input */}
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-2">
            Paste a GitHub repo URL to get roasted
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/your-regrettable-repo"
            disabled={disabled || isLoading}
            className="w-full px-4 py-3 bg-[#111] border border-[#333] rounded-lg
                       text-white placeholder-neutral-600 text-lg
                       focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50
                       disabled:opacity-50 transition-smooth"
          />
        </div>

        {/* Private repo toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowPat(!showPat)}
            className="text-sm text-neutral-500 hover:text-neutral-300 transition-smooth flex items-center gap-1"
          >
            <span className="text-xs">{showPat ? "▼" : "▶"}</span>
            Private Repo? Add a PAT
          </button>

          {showPat && (
            <div className="mt-2 animate-fade-in">
              <input
                type="password"
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                placeholder="ghp_your_personal_access_token"
                disabled={disabled || isLoading}
                className="w-full px-4 py-2 bg-[#111] border border-[#333] rounded-lg
                           text-white placeholder-neutral-600 text-sm
                           focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50
                           disabled:opacity-50 transition-smooth"
              />
              <p className="mt-1 text-xs text-neutral-600">
                Token never leaves the server. Only needs read access.
              </p>
            </div>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={disabled || isLoading || !url.trim()}
          className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:bg-neutral-800
                     disabled:text-neutral-600 text-white font-bold text-lg rounded-lg
                     transition-smooth btn-glow disabled:animate-none
                     disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block" style={{ animation: "spin 1s linear infinite" }}>
                🦆
              </span>
              Analyzing your sins...
            </span>
          ) : (
            "🔥 Roast This Repo"
          )}
        </button>
      </div>
    </form>
  );
}
