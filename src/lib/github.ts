export interface RepoFile {
  path: string;
  size: number;
  type: "file" | "dir";
}

export interface FileContent {
  path: string;
  content: string;
  language: string;
  size: number;
}

const GITHUB_API = "https://api.github.com";

function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    php: "php",
    html: "html",
    css: "css",
    scss: "scss",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    md: "markdown",
    sql: "sql",
    sh: "bash",
    dockerfile: "dockerfile",
  };
  return langMap[ext] || "text";
}

export function parseGitHubUrl(url: string): {
  owner: string;
  repo: string;
} | null {
  const patterns = [
    /github\.com\/([^/]+)\/([^/\s?#]+)/,
    /^([^/]+)\/([^/\s]+)$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
    }
  }
  return null;
}

export async function fetchRepoTree(
  owner: string,
  repo: string,
  pat?: string
): Promise<{ files: RepoFile[]; truncated: boolean }> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "RubberDuck/1.0",
  };
  if (pat) headers.Authorization = `token ${pat}`;

  // Get default branch
  const repoResp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers,
  });
  if (!repoResp.ok) {
    const status = repoResp.status;
    if (status === 404) throw new Error("Repository not found. Is it public?");
    if (status === 403) throw new Error("Rate limited. Try adding a GitHub PAT.");
    throw new Error(`GitHub API error: ${status}`);
  }
  const repoData = (await repoResp.json()) as { default_branch: string };

  // Get tree
  const treeResp = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${repoData.default_branch}?recursive=1`,
    { headers }
  );
  if (!treeResp.ok) throw new Error(`Failed to fetch repo tree: ${treeResp.status}`);
  const treeData = (await treeResp.json()) as {
    tree: Array<{ path: string; type: string; size?: number }>;
    truncated: boolean;
  };

  const ignoreDirs = [
    "node_modules",
    ".git",
    "vendor",
    "dist",
    "build",
    ".next",
    "__pycache__",
    ".venv",
    "venv",
    ".idea",
    ".vscode",
    "coverage",
  ];
  const ignoreExts = [
    "png", "jpg", "jpeg", "gif", "svg", "ico", "woff", "woff2",
    "ttf", "eot", "mp3", "mp4", "zip", "tar", "gz", "lock",
    "map", "min.js", "min.css",
  ];

  const files: RepoFile[] = treeData.tree
    .filter((item) => {
      if (item.type !== "blob") return false;
      const parts = item.path.split("/");
      if (parts.some((p) => ignoreDirs.includes(p))) return false;
      const ext = item.path.split(".").pop()?.toLowerCase() ?? "";
      if (ignoreExts.includes(ext)) return false;
      return true;
    })
    .map((item) => ({
      path: item.path,
      size: item.size ?? 0,
      type: "file" as const,
    }));

  return { files, truncated: treeData.truncated };
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  pat?: string
): Promise<FileContent> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3.raw",
    "User-Agent": "RubberDuck/1.0",
  };
  if (pat) headers.Authorization = `token ${pat}`;

  const resp = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    { headers }
  );
  if (!resp.ok) throw new Error(`Failed to fetch ${path}: ${resp.status}`);

  let content = await resp.text();
  // Truncate very large files to avoid blowing up context
  const MAX_CHARS = 6000;
  if (content.length > MAX_CHARS) {
    content = content.slice(0, MAX_CHARS) + "\n\n// ... [TRUNCATED — file too long, which is a roast in itself]";
  }

  return {
    path,
    content,
    language: getLanguageFromPath(path),
    size: content.length,
  };
}

export function buildFileTree(files: RepoFile[]): string {
  return files
    .slice(0, 200) // limit tree size
    .map((f) => `${f.path} (${f.size} bytes)`)
    .join("\n");
}

/** Heuristic file picker: finds the most "roast-worthy" code files */
export function pickRoastWorthyFiles(
  files: RepoFile[],
  count = 5
): Array<{ path: string; reason: string }> {
  const codeExts = new Set([
    "ts", "tsx", "js", "jsx", "py", "rb", "go", "rs", "java", "c", "cpp",
    "cs", "php", "kt", "swift", "sh",
  ]);

  const roastNames = [
    { pattern: /utils?\./i, reason: "A file called 'utils' — where code goes to die" },
    { pattern: /helper/i, reason: "Helper files: where developers admit they don't know where to put things" },
    { pattern: /misc/i, reason: "Named 'misc' — even the developer doesn't know what this does" },
    { pattern: /temp/i, reason: "A 'temp' file that became permanent. Classic." },
    { pattern: /index\.(js|ts|jsx|tsx)$/i, reason: "The dreaded index file — probably 500 lines of pure chaos" },
    { pattern: /app\.(js|ts|jsx|tsx)$/i, reason: "The app file — where all the bad decisions converge" },
    { pattern: /main\.(js|ts|py|go|rs|java)$/i, reason: "The main file — ground zero for spaghetti code" },
    { pattern: /server\./i, reason: "The server file — probably handles everything and nothing well" },
    { pattern: /config/i, reason: "Config file — likely copy-pasted from StackOverflow in 2019" },
    { pattern: /route/i, reason: "Routes file — probably one giant switch statement" },
  ];

  type Scored = { path: string; reason: string; score: number };
  const scored: Scored[] = [];

  for (const f of files) {
    const ext = f.path.split(".").pop()?.toLowerCase() ?? "";
    if (!codeExts.has(ext)) continue;

    let score = 0;
    let reason = "Looks suspicious enough to roast";

    // Big files are roast gold
    if (f.size > 5000) { score += 3; reason = "Suspiciously large — probably a god object"; }
    if (f.size > 10000) { score += 2; reason = "Massively oversized — definitely a code crime scene"; }

    // Check roast-worthy names
    for (const r of roastNames) {
      if (r.pattern.test(f.path)) {
        score += 4;
        reason = r.reason;
        break;
      }
    }

    // Deeply nested files
    const depth = f.path.split("/").length;
    if (depth >= 4) { score += 1; reason = reason || "Buried deep in the folder structure — hiding shame"; }

    // Prefer source files over tests for first impression
    if (/test|spec|__test__/i.test(f.path)) {
      score -= 1;
    }

    scored.push({ path: f.path, reason, score });
  }

  // Sort by score desc, take top N
  scored.sort((a, b) => b.score - a.score);
  const picked = scored.slice(0, count);

  // If we got nothing, just grab first code files
  if (picked.length === 0) {
    return files
      .filter((f) => codeExts.has(f.path.split(".").pop()?.toLowerCase() ?? ""))
      .slice(0, count)
      .map((f) => ({ path: f.path, reason: "Selected for roasting by default" }));
  }

  return picked.map(({ path, reason }) => ({ path, reason }));
}
