// ── Voice & TTS ──────────────────────────────────────────────
export const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
export const ELEVENLABS_TTS_MODEL = "eleven_flash_v2_5";

// ── AI Models ────────────────────────────────────────────────
// Curated list of Cloudflare Workers AI text-generation models.
// Verified against the Workers AI model catalog:
// https://developers.cloudflare.com/workers-ai/models/

export interface WorkersAIModel {
  id: string;
  name: string;
  description: string;
  contextWindow: number;
  speed: "fast" | "medium" | "slow";
  quality: "standard" | "high" | "premium";
  specialty?: string;
}

export const WORKERS_AI_MODELS: WorkersAIModel[] = [
  {
    id: "@cf/qwen/qwen2.5-coder-32b-instruct",
    name: "Qwen 2.5 Coder 32B",
    description: "Code-specialized — ideal for code review & roasting",
    contextWindow: 32_768,
    speed: "medium",
    quality: "premium",
    specialty: "code",
  },
  {
    id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    name: "Llama 3.3 70B",
    description: "Best overall quality, devastating roasts (slower)",
    contextWindow: 8_192,
    speed: "slow",
    quality: "premium",
  },
  {
    id: "@cf/google/gemma-3-12b-it",
    name: "Gemma 3 12B",
    description: "Balanced speed and wit, solid middle ground",
    contextWindow: 8_192,
    speed: "medium",
    quality: "high",
  },
  {
    id: "@cf/meta/llama-3.1-8b-instruct",
    name: "Llama 3.1 8B",
    description: "Fast and reliable, good for quick roasts",
    contextWindow: 8_192,
    speed: "fast",
    quality: "standard",
  },
  {
    id: "@cf/meta/llama-4-scout-17b-16e-instruct",
    name: "Llama 4 Scout 17B",
    description: "Latest Llama architecture, strong reasoning",
    contextWindow: 8_192,
    speed: "medium",
    quality: "high",
  },
  {
    id: "@cf/moonshotai/kimi-k2.5",
    name: "Kimi K2.5",
    description: "256k context, excellent reasoning & analysis",
    contextWindow: 262_144,
    speed: "slow",
    quality: "premium",
  },
  {
    id: "@cf/mistralai/mistral-small-3.1-24b-instruct",
    name: "Mistral Small 3.1 24B",
    description: "Strong instruction-following, sharp critique",
    contextWindow: 8_192,
    speed: "medium",
    quality: "high",
  },
  {
    id: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
    name: "DeepSeek R1 Distill 32B",
    description: "Deep reasoning, methodical code destruction",
    contextWindow: 32_768,
    speed: "slow",
    quality: "premium",
    specialty: "reasoning",
  },
];

/** Code-specialized model — best default for a code roasting app */
export const DEFAULT_MODEL = "@cf/qwen/qwen2.5-coder-32b-instruct";

// ── GitHub ───────────────────────────────────────────────────
export const GITHUB_API_BASE = "https://api.github.com";
export const MAX_FILE_CHARS = 6000;
export const MAX_TREE_FILES = 200;

// ── Speech truncation ────────────────────────────────────────
export const MAX_SPEAK_CHARS = 600;

// ── Token limits per generation type ─────────────────────────
export const TOKEN_LIMITS = {
  OVERVIEW: 500,
  FILE_ROAST: 700,
  FULL_REPO: 900,
} as const;
