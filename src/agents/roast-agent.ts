import { createWorkersAI } from "workers-ai-provider";
import { callable } from "agents";
import { AIChatAgent } from "@cloudflare/ai-chat";
import { generateText } from "ai";
import {
  parseGitHubUrl,
  fetchRepoTree,
  fetchFileContent,
  buildFileTree,
  pickRoastWorthyFiles,
} from "../lib/github";
import {
  buildSavagePrompt,
  buildRepoOverviewPrompt,
  getShameLevel,
  getShameLevelIndex,
  getProgressToNextLevel,
  type ShameLevel,
} from "../lib/prompts";
import {
  DEFAULT_MODEL,
  DEFAULT_VOICE_ID,
  ELEVENLABS_TTS_MODEL,
  TOKEN_LIMITS,
  WORKERS_AI_MODELS,
} from "../lib/constants";

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
  roastCache: Record<string, { roastText: string; timestamp: number }>;
  currentRepo: string | null;
  repoFiles: Array<{ path: string; reason: string }> | null;
  fileContents: Record<string, { content: string; language: string }>;
  selectedModel: string;
  selectedVoiceId: string;
  isProcessing: boolean;
  statusMessage: string;
}

export class RoastAgent extends AIChatAgent<Env, RoastAgentState> {
  initialState: RoastAgentState = {
    insultLevel: 0,
    shameLevel: "Novice Shame",
    shameLevelIndex: 0,
    progressToNext: 0,
    roastHistory: [],
    roastCache: {},
    currentRepo: null,
    repoFiles: null,
    fileContents: {},
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

  /** Build context from other pre-loaded files for cross-file roasting */
  private buildRepoContext(currentFile: string, currentContent: string): string {
    const parts: string[] = [];

    // Repo structure summary
    if (this.state.repoFiles) {
      parts.push("REPO FILES SELECTED FOR REVIEW:");
      for (const f of this.state.repoFiles) {
        parts.push(`  ${f.path} — ${f.reason}`);
      }
    }

    // Extract import/require statements from current file to find related files
    const importPattern = /(?:import\s+.*from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/g;
    const imports: string[] = [];
    let match;
    while ((match = importPattern.exec(currentContent)) !== null) {
      imports.push(match[1] || match[2]);
    }

    // Find related files: same directory or imported
    const currentDir = currentFile.split("/").slice(0, -1).join("/");
    const relatedSnippets: string[] = [];

    for (const [path, { content, language }] of Object.entries(this.state.fileContents)) {
      if (path === currentFile) continue;

      const fileDir = path.split("/").slice(0, -1).join("/");
      const isImported = imports.some((imp) => path.includes(imp.replace(/^[./]+/, "")));
      const isSameDir = fileDir === currentDir && currentDir !== "";

      if (isImported || isSameDir) {
        // Include a meaningful snippet (first 30 lines)
        const snippet = content.split("\n").slice(0, 30).join("\n");
        relatedSnippets.push(`--- ${path} (${language})${isImported ? " [IMPORTED]" : " [SAME DIR]"} ---\n${snippet}`);
      }
    }

    if (relatedSnippets.length > 0) {
      parts.push("\nRELATED FILES (the AI should cross-reference these):");
      parts.push(relatedSnippets.join("\n\n"));
    }

    return parts.join("\n");
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
      const { files } = await fetchRepoTree(parsed.owner, parsed.repo, pat, this.env.GITHUB_TOKEN);
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

      const workersai = createWorkersAI({ binding: this.env.AI });

      // Pick worst files using smart heuristics (more reliable than AI JSON)
      this.updateStatus("Identifying your worst offenses...");
      const pickedFiles = pickRoastWorthyFiles(files, 5);

      // Pre-fetch content of all picked files for deep context
      this.updateStatus("Reading ALL your code... nowhere to hide...");
      const fileContents: Record<string, { content: string; language: string }> = {};
      const fetchPromises = pickedFiles.map(async (pf) => {
        try {
          const fc = await fetchFileContent(parsed.owner, parsed.repo, pf.path, pat, this.env.GITHUB_TOKEN);
          fileContents[fc.path] = { content: fc.content, language: fc.language };
        } catch {
          // Skip files that fail to fetch
        }
      });
      await Promise.all(fetchPromises);

      // Generate overview with actual file summaries
      this.updateStatus("Forming first impressions with actual code...");
      const fileSummaries = Object.entries(fileContents).map(([path, { content, language }]) => {
        const firstLines = content.split("\n").slice(0, 5).join("\n");
        return `--- ${path} (${language}) ---\n${firstLines}`;
      }).join("\n\n");

      const overviewPrompt = buildRepoOverviewPrompt(
        `${parsed.owner}/${parsed.repo}`,
        truncatedTree,
        fileSummaries
      );
      const { text: overview } = await generateText({
        model: workersai(this.state.selectedModel),
        prompt: overviewPrompt,
        maxTokens: TOKEN_LIMITS.OVERVIEW,
      });

      const newCache = { ...this.state.roastCache };
      newCache["__overview__"] = { roastText: overview, timestamp: Date.now() };

      this.setState({
        ...this.state,
        currentRepo: url,
        repoFiles: pickedFiles,
        fileContents,
        roastCache: newCache,
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
      // Use pre-loaded content if available, otherwise fetch
      let file;
      const cached = this.state.fileContents[filePath];
      if (cached) {
        file = { path: filePath, content: cached.content, language: cached.language, size: cached.content.length };
      } else {
        file = await fetchFileContent(
          parsed.owner,
          parsed.repo,
          filePath,
          pat,
          this.env.GITHUB_TOKEN
        );
      }

      // Build cross-file context from pre-loaded files
      const repoContext = this.buildRepoContext(filePath, file.content);

      this.updateStatus("Generating devastating critique...");
      const workersai = createWorkersAI({ binding: this.env.AI });

      const prompt = buildSavagePrompt(
        this.state.insultLevel,
        this.state.shameLevel,
        file.path,
        file.content,
        file.language,
        this.state.roastHistory.map((r) => r.roastText),
        repoContext
      );

      const { text: roastText } = await generateText({
        model: workersai(this.state.selectedModel),
        prompt,
        maxTokens: TOKEN_LIMITS.FILE_ROAST,
      });

      // Escalate shame
      this.escalateShame();

      // Add to history (capped at 20) and cache
      const entry: RoastHistoryEntry = {
        fileName: filePath,
        roastText,
        timestamp: Date.now(),
      };
      const newHistory = [...this.state.roastHistory, entry].slice(-20);
      const newCache = { ...this.state.roastCache };
      newCache[filePath] = { roastText, timestamp: Date.now() };
      this.setState({
        ...this.state,
        roastHistory: newHistory,
        roastCache: newCache,
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
  async listModels(): Promise<
    Array<{ id: string; name: string; description: string }>
  > {
    return WORKERS_AI_MODELS.map(({ id, name, description }) => ({
      id,
      name,
      description,
    }));
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
      roastCache: {},
      currentRepo: null,
      repoFiles: null,
      fileContents: {},
      selectedModel: this.state.selectedModel,
      selectedVoiceId: this.state.selectedVoiceId,
      isProcessing: false,
      statusMessage: "",
    });
  }

  @callable()
  async clearFileRoast(filePath: string) {
    const newCache = { ...this.state.roastCache };
    delete newCache[filePath];
    const newHistory = this.state.roastHistory.filter(h => h.fileName !== filePath);
    this.setState({
      ...this.state,
      roastCache: newCache,
      roastHistory: newHistory,
    });
  }

  @callable()
  async getCachedRoast(filePath: string): Promise<{ roastText: string; timestamp: number } | null> {
    return this.state.roastCache[filePath] ?? null;
  }

  @callable()
  async roastFullRepo(pat?: string): Promise<{ roastText: string } | { error: string }> {
    const parsed = this.state.currentRepo ? parseGitHubUrl(this.state.currentRepo) : null;
    if (!parsed) {
      return { error: "No repository loaded. Load a repo first, genius." };
    }

    this.setState({ ...this.state, isProcessing: true });
    this.updateStatus("Preparing the ultimate verdict...");

    try {
      const { files } = await fetchRepoTree(parsed.owner, parsed.repo, pat, this.env.GITHUB_TOKEN);
      const fileTree = buildFileTree(files);
      const truncatedTree = fileTree.split("\n").slice(0, 150).join("\n") +
        (files.length > 150 ? `\n... and ${files.length - 150} more files` : "");

      const workersai = createWorkersAI({ binding: this.env.AI });

      const prompt = `You are an elite principal engineer conducting a FINAL VERDICT on this entire repository. You are DISGUSTED — but your disgust is grounded in REAL technical problems, not surface-level nitpicks.

Repository: ${parsed.owner}/${parsed.repo}
File structure:
${truncatedTree}

Previous roasts from this session:
${this.state.roastHistory.map(r => `- ${r.fileName}: "${r.roastText.slice(0, 100)}"`).join("\n")}

Current shame level: ${this.state.shameLevel} (insult level: ${this.state.insultLevel})

Give a COMPREHENSIVE, DEVASTATING verdict. For EACH point, reference SPECIFIC files from the tree and explain the REAL technical problem:
1. **Architecture** — Is there actual separation of concerns? Are there god-files? Is the dependency graph sane? Reference specific paths.
2. **Missing essentials** — No tests? No CI config? No error boundaries? No types? No documentation? Call out what's ABSENT.
3. **Dependency red flags** — Package bloat, outdated patterns, framework misuse, unnecessary abstractions visible from structure alone.
4. **Code organization smells** — Files in wrong directories, inconsistent patterns, evidence of abandoned refactors, mixed paradigms.
5. **The verdict** — A judge-style ruling summarizing the developer's engineering maturity based on evidence.

RULES:
- Every claim MUST reference actual file paths from the tree. No generic insults.
- Be savage but TECHNICALLY ACCURATE — this should read like a brutal but legitimate architecture review.
- 6-8 sentences, every one landing a specific technical blow.
- End with a devastating verdict that a real tech lead might actually write (if they had no filter).`;

      const { text: roastText } = await generateText({
        model: workersai(this.state.selectedModel),
        prompt,
        maxTokens: TOKEN_LIMITS.FULL_REPO,
      });

      this.escalateShame();

      const entry: RoastHistoryEntry = {
        fileName: "Full Repository Verdict",
        roastText,
        timestamp: Date.now(),
      };

      const newCache = { ...this.state.roastCache };
      newCache["__full_repo__"] = { roastText, timestamp: Date.now() };

      this.setState({
        ...this.state,
        roastHistory: [...this.state.roastHistory, entry].slice(-20),
        roastCache: newCache,
        isProcessing: false,
        statusMessage: "",
      });

      return { roastText };
    } catch (err) {
      this.setState({ ...this.state, isProcessing: false, statusMessage: "" });
      const msg = err instanceof Error ? err.message : "Unknown error";
      return { error: `Full repo roast failed: ${msg}` };
    }
  }

  // We don't use the chat flow for this agent, but it's required by AIChatAgent
  async onChatMessage() {
    return new Response("Use the callable methods instead.", { status: 200 });
  }
}
