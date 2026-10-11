// Pure text helpers shared by the agent and the eval runner. No I/O here, so
// tests can import this file without API keys or a neatlogs connection.

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Package names from `names` that `text` names as a package: wrapped in bold,
 * italics, backticks or link text, the way the model formats picks.
 * Plain words don't count, since names like "request" and "got" are also
 * English. "**Moment.js**" and "**Formik:**" match, "**moment-timezone**" doesn't.
 */
export function mentionedPackages(text: string, names: string[]): string[] {
  return names.filter((name) => {
    const n = `${escapeRegExp(name)}(?:\\.js)?`;
    return new RegExp(`(\\*\\*|\\*|\`)${n}[:,.]?\\1|\\[${n}\\]`, "i").test(text);
  });
}

export interface EvalRow {
  caseId: string;
  run: number;
  traceId: string;
  trapsMentioned: string[];
  /** Set when the run crashed instead of answering. */
  error?: string;
}

/** The results table from evals.md, with Main, Alts and Trap left for a human to score. */
export function resultsTable(rows: EvalRow[]): string {
  const lines = [
    "| Question | Run | Main | Alts | Trap | Trace | Notes |",
    "| -------- | --- | ---- | ---- | ---- | ----- | ----- |",
    ...rows.map((r) => {
      const notes = r.error
        ? `Crashed: ${r.error}`
        : r.trapsMentioned.length
          ? `Mentions trap: ${r.trapsMentioned.map((t) => `\`${t}\``).join(", ")}`
          : "";
      return `| ${r.caseId} | ${r.run} | | | | \`${r.traceId}\` | ${notes} |`;
    }),
  ];
  return lines.join("\n");
}

export interface PackageFacts {
  name: string;
  weeklyDownloads: number | null;
  lastPublished: string | null;
  monthsSinceLastPublish: number | null;
}

/**
 * Append a table of tool data for every checked package the answer names.
 * The model writes no numbers itself, so it can't copy one package's age onto another.
 */
export function appendFacts(answer: string, facts: PackageFacts[]): string {
  const named = mentionedPackages(answer, facts.map((f) => f.name));
  const rows = facts.filter((f) => named.includes(f.name));
  if (!rows.length) return answer;

  return [
    answer,
    "",
    "Registry data:",
    "",
    "| Package | Weekly downloads | Last published | Months since |",
    "| ------- | ---------------- | -------------- | ------------ |",
    ...rows.map(
      (f) =>
        `| ${f.name} | ${f.weeklyDownloads?.toLocaleString("en-US") ?? "unknown"} | ${f.lastPublished?.slice(0, 10) ?? "unknown"} | ${f.monthsSinceLastPublish ?? "unknown"} |`,
    ),
  ].join("\n");
}
