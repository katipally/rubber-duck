import { createWorkersAI } from "workers-ai-provider";
import { callable } from "agents";
import { AIChatAgent } from "@cloudflare/ai-chat";
import { generateText } from "ai";
import { createClient, streamToDataUri } from "../lib/elevenlabs";
import {
  parseGitHubUrl,
  fetchRepoTree,
  fetchFileContent,
  buildFileTree,
  pickRoastWorthyFiles,
  type RepoFile,
  type FileContent,
} from "../lib/github";
import {
  buildSavagePrompt,
  buildFilePickerPrompt,
  buildRepoOverviewPrompt,
  getShameLevel,
  getShameLevelIndex,
  getProgressToNextLevel,
  type ShameLevel,
} from "../lib/prompts";

export interface RoastHistoryEntry {
  fileName: string;
  roastText: string;
  timestamp: number;
}

export interface RoastAgentState {
  insultLevel: number;
  shameLevel: ShameLevel;
  shameLevelIndex: number;
  progressToNext: number;
  roastHistory: RoastHistoryEntry[];
  currentRepo: string | null;
  repoFiles: Array<{ path: string; reason: string }> | null;
  selectedModel: string;
  selectedVoiceId: string;
  isProcessing: boolean;
  statusMessage: string;
}

const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

export class RoastAgent extends AIChatAgent<Env, RoastAgentState> {
  initialState: RoastAgentState = {
    insultLevel: 0,
    shameLevel: "Novice Shame",
    shameLevelIndex: 0,
    progressToNext: 0,
    roastHistory: [],
    currentRepo: null,
    repoFiles: null,
    selectedModel: DEFAULT_MODEL,
    selectedVoiceId: DEFAULT_VOICE_ID,
    isProcessing: false,
    statusMessage: "",
  };

  // Reset stuck processing state on new connection
  onConnect() {
    if (this.state.isProcessing) {
      this.setState({ ...this.state, isProcessing: false, statusMessage: "" });
    }
  }

  private updateStatus(message: string) {
    this.setState({ ...this.state, statusMessage: message });
  }

  private escalateShame() {
    const newLevel = this.state.insultLevel + 1;
    this.setState({
      ...this.state,
      insultLevel: newLevel,
      shameLevel: getShameLevel(newLevel),
      shameLevelIndex: getShameLevelIndex(newLevel),
      progressToNext: getProgressToNextLevel(newLevel),
    });
  }

  @callable()
  async loadRepo(
    url: string,
    pat?: string
  ): Promise<{
    success: boolean;
    overview?: string;
    files?: Array<{ path: string; reason: string }>;
    error?: string;
  }> {
    const parsed = parseGitHubUrl(url);
    if (!parsed) {
      return {
        success: false,
        error: "That URL is so mangled even GitHub can't parse it. Impressive incompetence.",
      };
    }

    this.setState({ ...this.state, isProcessing: true });
    this.updateStatus("Fetching your crimes from GitHub...");

    try {
      const { files } = await fetchRepoTree(parsed.owner, parsed.repo, pat);
      if (files.length === 0) {
        this.setState({ ...this.state, isProcessing: false, statusMessage: "" });
        return {
          success: false,
          error: "An empty repository. Somehow that's the best code you've ever written.",
        };
      }

      const fileTree = buildFileTree(files);

      // Limit file tree for AI context (keep first 100 entries max)
      const truncatedTree = fileTree.split("\n").slice(0, 100).join("\n") +
        (files.length > 100 ? `\n... and ${files.length - 100} more files` : "");

      // Generate repo overview roast
      this.updateStatus("Judging your repository structure...");
      const workersai = createWorkersAI({ binding: this.env.AI });
      const overviewPrompt = buildRepoOverviewPrompt(
        `${parsed.owner}/${parsed.repo}`,
        truncatedTree
      );
      const { text: overview } = await generateText({
        model: workersai(this.state.selectedModel),
        prompt: overviewPrompt,
        maxTokens: 300,
      });

      // Pick worst files using smart heuristics (more reliable than AI JSON)
      this.updateStatus("Identifying your worst offenses...");
      const pickedFiles = pickRoastWorthyFiles(files, 5);

      this.setState({
        ...this.state,
        currentRepo: url,
        repoFiles: pickedFiles,
        isProcessing: false,
        statusMessage: "",
      });

      return { success: true, overview, files: pickedFiles };
    } catch (err) {
      this.setState({ ...this.state, isProcessing: false, statusMessage: "" });
      const msg = err instanceof Error ? err.message : "Unknown error";
      return {
        success: false,
        error: `Failed to fetch repo: ${msg}. Even your GitHub links are broken. Remarkable.`,
      };
    }
  }

  @callable()
  async roastFile(
    filePath: string,
    pat?: string
  ): Promise<{ roastText: string; fileName: string } | { error: string }> {
    const parsed = this.state.currentRepo
      ? parseGitHubUrl(this.state.currentRepo)
      : null;
    if (!parsed) {
      return { error: "No repository loaded. Did you forget that step too?" };
    }

    this.setState({ ...this.state, isProcessing: true });
    this.updateStatus(`Reading ${filePath}... preparing insults...`);

    try {
      const file = await fetchFileContent(
        parsed.owner,
        parsed.repo,
        filePath,
        pat
      );

      this.updateStatus("Generating devastating critique...");
      const workersai = createWorkersAI({ binding: this.env.AI });

      const prompt = buildSavagePrompt(
        this.state.insultLevel,
        this.state.shameLevel,
        file.path,
        file.content,
        file.language,
        this.state.roastHistory.map((r) => r.roastText)
      );

      const { text: roastText } = await generateText({
        model: workersai(this.state.selectedModel),
        prompt,
      });

      // Escalate shame
      this.escalateShame();

      // Add to history
      const entry: RoastHistoryEntry = {
        fileName: filePath,
        roastText,
        timestamp: Date.now(),
      };
      this.setState({
        ...this.state,
        roastHistory: [...this.state.roastHistory, entry],
        isProcessing: false,
        statusMessage: "",
      });

      return { roastText, fileName: filePath };
    } catch (err) {
      this.setState({ ...this.state, isProcessing: false, statusMessage: "" });
      const msg = err instanceof Error ? err.message : "Unknown error";
      return {
        error: `Couldn't read ${filePath}: ${msg}. Your code is so bad it crashes the code reader.`,
      };
    }
  }

  @callable()
  async speak(text: string): Promise<string> {
    const client = createClient(this.env.ELEVENLABS_API_KEY);
    const voiceId = this.state.selectedVoiceId || DEFAULT_VOICE_ID;
    const audio = await client.textToSpeech.convert(voiceId, {
      text,
      modelId: "eleven_flash_v2_5",
      outputFormat: "mp3_44100_128",
    });
    return streamToDataUri(audio);
  }

  @callable()
  async listVoices(): Promise<
    Array<{ voiceId: string; name: string; previewUrl: string | null; labels: Record<string, string> }>
  > {
    const client = createClient(this.env.ELEVENLABS_API_KEY);
    const response = await client.voices.search({ pageSize: 50 });
    return (response.voices ?? []).map((v) => ({
      voiceId: v.voiceId ?? "",
      name: v.name ?? "Unknown",
      previewUrl: v.previewUrl ?? null,
      labels: (v.labels as Record<string, string>) ?? {},
    }));
  }

  @callable()
  async listModels(): Promise<
    Array<{ id: string; name: string; description: string }>
  > {
    // Curated list of Workers AI text generation models
    return [
      {
        id: "@cf/meta/llama-3.1-8b-instruct",
        name: "Llama 3.1 8B",
        description: "Fast, good for quick roasts",
      },
      {
        id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        name: "Llama 3.3 70B",
        description: "Smarter, more devastating roasts (slower)",
      },
      {
        id: "@cf/moonshotai/kimi-k2.5",
        name: "Kimi K2.5",
        description: "Excellent reasoning, brutal analysis",
      },
      {
        id: "@cf/deepseek/deepseek-r1-distill-llama-70b",
        name: "DeepSeek R1 70B",
        description: "Deep reasoning, methodical destruction",
      },
      {
        id: "@cf/google/gemma-3-12b-it",
        name: "Gemma 3 12B",
        description: "Balanced speed and wit",
      },
    ];
  }

  @callable()
  async setModel(modelId: string) {
    this.setState({ ...this.state, selectedModel: modelId });
  }

  @callable()
  async setVoice(voiceId: string) {
    this.setState({ ...this.state, selectedVoiceId: voiceId });
  }

  @callable()
  async getStats() {
    return {
      totalRoasts: this.state.insultLevel,
      shameLevel: this.state.shameLevel,
      shameLevelIndex: this.state.shameLevelIndex,
      progressToNext: this.state.progressToNext,
      roastHistory: this.state.roastHistory,
      currentRepo: this.state.currentRepo,
    };
  }

  @callable()
  async resetSession() {
    this.setState({
      insultLevel: 0,
      shameLevel: "Novice Shame",
      shameLevelIndex: 0,
      progressToNext: 0,
      roastHistory: [],
      currentRepo: null,
      repoFiles: null,
      selectedModel: this.state.selectedModel,
      selectedVoiceId: this.state.selectedVoiceId,
      isProcessing: false,
      statusMessage: "",
    });
  }

  // We don't use the chat flow for this agent, but it's required by AIChatAgent
  async onChatMessage() {
    return new Response("Use the callable methods instead.", { status: 200 });
  }
}
