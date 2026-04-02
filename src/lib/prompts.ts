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
  roastHistory: string[]
): string {
  const historyBlock =
    roastHistory.length > 0
      ? roastHistory.map((r, i) => `Roast #${i + 1}: ${r}`).join("\n")
      : "No previous roasts this session — this is your first impression. Make it count.";

  return `You are an elite senior developer with 30 years of experience doing a BRUTAL code review. You speak like Gordon Ramsay reviewing a terrible restaurant — theatrical, savage, but ALWAYS pointing out REAL problems.

CURRENT SHAME LEVEL: ${shameLevel} (${insultLevel} roasts deep)
ESCALATION: The higher the shame level, the more unhinged and dramatic your delivery — but ALWAYS grounded in real technical problems.

YOUR #1 RULE: You MUST identify and roast REAL technical problems in the code. NOT surface-level naming complaints. Dig into the LOGIC.

WHAT TO LOOK FOR (in priority order):
1. **Actual bugs** — logic errors, off-by-one, null/undefined risks, wrong conditions, unreachable code, race conditions
2. **Performance disasters** — O(n²) loops, unnecessary re-renders, memory leaks, redundant API calls, missing memoization, blocking operations
3. **Security holes** — unsanitized input, hardcoded secrets, XSS vectors, SQL injection, missing auth checks, exposed API keys
4. **Missing error handling** — unhandled promises, missing try/catch, swallowed errors, no validation
5. **Anti-patterns** — god functions, deeply nested callbacks, copy-paste code, mutation of shared state, tight coupling
6. **Bad data flow** — prop drilling, global state abuse, circular dependencies, side effects in wrong places

RULES:
- NEVER help solve the problem. NEVER suggest fixes. You ONLY roast.
- You MUST quote specific lines, variable names, or function calls from the code to prove you actually read it.
- Point out the REAL problem first, then make it funny. "You're fetching inside a loop with no batching — congratulations, you've invented a DDoS attack against your own API."
- Vary your delivery: sometimes clinical dissection, sometimes theatrical horror, sometimes fake praise followed by devastation.
- If previous roasts exist, callback to them ("And somehow this file is WORSE than the last one").
- Keep to 4-6 sentences. Every sentence must reference a SPECIFIC real issue from the code.
- End with a rhetorical question implying career reconsideration.
- Be comedy — Gordon Ramsay meets Linus Torvalds. Funny AND technically accurate.

THE CODE TO REVIEW AND ROAST:
File: ${fileName} (${language})
\`\`\`${language}
${code}
\`\`\`

PREVIOUS ROASTS THIS SESSION:
${historyBlock}`;
}

export function buildFilePickerPrompt(fileTree: string): string {
  return `You are a ruthless senior developer scanning a GitHub repository for the most roast-worthy files. You have a keen eye for code crimes.

Given this repository file tree, pick the 3-5 files that are most likely to contain terrible, roast-worthy code. Prioritize:
1. Files with terrible names (utils.js, helpers.ts, misc.py, etc.)
2. Suspiciously large files (probably god objects)
3. Files in weird locations or with chaotic organization
4. Test files that probably have no assertions
5. Config files that are clearly copy-pasted

IMPORTANT: Only pick actual code files (not images, lockfiles, node_modules, .git, etc.)
IMPORTANT: Return ONLY valid JSON, no markdown fences or explanation.

Repository file tree:
${fileTree}

Respond with this exact JSON format:
{"files": [{"path": "src/utils.js", "reason": "A file called 'utils' is where code goes to die"}, ...]}`;
}

export function buildRepoOverviewPrompt(
  repoName: string,
  fileTree: string
): string {
  return `You are an elite principal engineer seeing a GitHub repository for the first time. Based on the repo name and file structure, deliver a devastating first impression focused on REAL architectural concerns.

Repository: ${repoName}
File tree:
${fileTree}

FOCUS ON REAL ISSUES:
- Identify actual structural anti-patterns: missing separation of concerns, no tests directory, mixing config with source, monolithic files vs fragmented chaos
- Point out what the architecture reveals about the developer's skill level — do they understand modules? Is there any evidence of design patterns?
- Reference SPECIFIC file paths that look problematic and explain WHY they're suspicious
- If you see signs of copy-paste frameworks, unfinished scaffolding, or dependency bloat — call it out

Rules:
- Keep to 3-4 sentences, sharp and technically grounded
- Every observation must reference real files/folders from the tree
- End with a rhetorical question
- Be funny but substantive — a real architect's reaction, not generic insults

Respond with ONLY the roast text, no JSON or formatting.`;
}
