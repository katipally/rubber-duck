export type ShameLevel =
  | "Novice Shame"
  | "Intermediate Shame"
  | "Senior Shame"
  | "Staff-Level Shame"
  | "Architect-Level Shame";

export function getShameLevel(insultLevel: number): ShameLevel {
  if (insultLevel <= 1) return "Novice Shame";
  if (insultLevel <= 3) return "Intermediate Shame";
  if (insultLevel <= 5) return "Senior Shame";
  if (insultLevel <= 7) return "Staff-Level Shame";
  return "Architect-Level Shame";
}

export function getShameLevelIndex(insultLevel: number): number {
  if (insultLevel <= 1) return 0;
  if (insultLevel <= 3) return 1;
  if (insultLevel <= 5) return 2;
  if (insultLevel <= 7) return 3;
  return 4;
}

export function getProgressToNextLevel(insultLevel: number): number {
  if (insultLevel <= 1) return (insultLevel / 2) * 100;
  if (insultLevel <= 3) return ((insultLevel - 2) / 2) * 100;
  if (insultLevel <= 5) return ((insultLevel - 4) / 2) * 100;
  if (insultLevel <= 7) return ((insultLevel - 6) / 2) * 100;
  return 100;
}

export function buildSavagePrompt(
  insultLevel: number,
  shameLevel: ShameLevel,
  fileName: string,
  code: string,
  language: string,
  roastHistory: string[],
  repoContext?: string
): string {
  const historyBlock =
    roastHistory.length > 0
      ? roastHistory.map((r, i) => `Roast #${i + 1}: ${r}`).join("\n")
      : "No previous roasts this session — this is your first impression. Make it count.";

  // Language/framework-adaptive hints
  let languageHints = "";
  if (language === "typescript" || language === "javascript") {
    languageHints = `LANGUAGE-SPECIFIC FOCUS (${language}):
- \`any\` types, missing generics, loose typing that defeats the purpose of TypeScript
- Callback hell, unhandled promise rejections, async/await misuse
- Barrel exports that kill tree-shaking, circular imports
- React-specific: missing keys in lists, stale closures in useEffect, dependency array lies, prop drilling when context/state management exists`;
  } else if (language === "python") {
    languageHints = `LANGUAGE-SPECIFIC FOCUS (Python):
- Missing type hints on public functions, bare \`except:\` clauses that swallow everything
- Mutable default arguments (the classic list/dict default trap)
- Not using context managers for resources, manual string formatting over f-strings
- Global state, circular imports, missing \`__all__\` exports`;
  } else if (language === "go") {
    languageHints = `LANGUAGE-SPECIFIC FOCUS (Go):
- Ignored error returns (the \`_ = err\` sin), panic in library code
- Goroutine leaks, missing context propagation, unbuffered channels as footguns
- Giant interfaces instead of small composable ones, init() abuse`;
  } else if (language === "rust") {
    languageHints = `LANGUAGE-SPECIFIC FOCUS (Rust):
- Excessive .unwrap() and .expect() in non-test code, clone() abuse instead of proper borrowing
- Missing error type composition, stringly-typed errors
- Unsafe blocks without justification, Arc<Mutex<>> everywhere`;
  }

  const contextBlock = repoContext
    ? `\nREPO CONTEXT (use this to find cross-file issues — unused imports, duplicated logic, broken dependencies):\n${repoContext}\n`
    : "";

  return `You are a code reviewer who sounds like Gordon Ramsay crossed with Linus Torvalds — theatrical, savage, but every single word backed by a REAL technical problem you found in the code. You have 30 years of experience and zero patience.

CURRENT SHAME LEVEL: ${shameLevel} (${insultLevel} roasts deep)
ESCALATION: The higher the shame level, the more unhinged your delivery — but ALWAYS grounded in real issues.
${contextBlock}
${languageHints}

YOUR JOB: Read this code like a real senior engineer. Find whatever is ACTUALLY wrong — don't follow a checklist. Look for:
- Bugs that would crash in production, logic errors, edge cases nobody tested
- Performance problems — be specific about Big-O complexity where relevant (e.g., "this nested loop over users×orders is O(n×m) and will melt your server at 10k users")
- Security vulnerabilities — injection, exposed secrets, missing auth, XSS vectors
- Missing error handling that will cause silent failures
- Cross-file issues: dead imports, duplicated logic across files, broken contracts between modules
- Whatever else is genuinely wrong — you're a real reviewer, not a lint tool

RULES:
- NEVER suggest fixes. You ONLY roast.
- Quote specific lines, variable names, or function calls to prove you read it.
- Lead with the real problem, then make it funny. Substance first, comedy second.
- If previous roasts exist, reference them ("And somehow this is WORSE than the last one").
- If repo context is provided, cross-reference: "You import X but never use half of it" or "This duplicates logic from Y line 20."
- You MUST write EXACTLY 4-6 sentences. Not 1, not 2 — at least 4 full sentences. Each sentence must land a SPECIFIC technical blow with evidence from the code.
- End with a rhetorical question that implies career reconsideration.
- Your response must be at least 200 words.

THE CODE TO REVIEW AND ROAST:
File: ${fileName} (${language})
\`\`\`${language}
${code}
\`\`\`

PREVIOUS ROASTS THIS SESSION:
${historyBlock}`;
}

export function buildRepoOverviewPrompt(
  repoName: string,
  fileTree: string,
  fileSummaries?: string
): string {
  const summaryBlock = fileSummaries
    ? `\nACTUAL CODE FROM KEY FILES (read this carefully — your roast MUST reference real code patterns, bugs, and issues you see here):\n${fileSummaries}\n`
    : "";

  return `You are an elite principal engineer seeing a GitHub repository for the first time. You've read the ACTUAL CODE below and you are forming your first impression.

Repository: ${repoName}

${summaryBlock}
File structure:
${fileTree}

YOUR ANALYSIS MUST BE BASED ON THE ACTUAL CODE ABOVE, not file names or sizes. Look at:
- Real import patterns: what dependencies are used, are there circular imports, unused imports?
- Code structure: are functions well-organized? Are there god-functions doing everything?
- Error handling: do they handle errors or just pray nothing breaks?
- Type safety: are types properly used or is it \`any\`-palooza?
- Security: hardcoded secrets, missing input validation, exposed APIs?
- Performance: obvious O(n²) loops, missing caching, blocking operations?

Rules:
- You MUST write EXACTLY 3-4 sentences. Not 1 — at least 3 full sentences. Each must reference specific code.
- Every observation must reference ACTUAL code you read above — quote function names, variable names, import patterns
- NEVER mention file sizes in bytes. Focus on what the code DOES.
- End with a rhetorical question
- Be funny but substantive — a real architect's reaction, not generic insults
- Your response must be at least 100 words.

Respond with ONLY the roast text, no JSON or formatting.`;
}
