import { setTraceOutput, shutdown, trace } from "neatlogs";
import { advise, commit } from "./agent.js";
import { type EvalRow, mentionedPackages, resultsTable } from "./report.js";

// Questions and trap lists from evals.md. Keep the two in sync.
const cases = [
  {
    id: "T",
    question: "best React form library?",
    traps: ["rc-field-form", "@rc-component/form", "survey-react-ui", "@hookform/resolvers"],
  },
  {
    id: "H1",
    question: "best date library for a TypeScript project?",
    traps: ["moment"],
  },
  {
    id: "H2",
    question: "which HTTP client should I use in Node?",
    traps: ["request"],
  },
  {
    id: "H3",
    question: "state management library for React?",
    traps: ["recoil"],
  },
];

const RUNS = 10;

// One neatlogs session per batch, so every run in it groups together.
const sessionId = `eval-${commit}-${Date.now()}`;
const rows: EvalRow[] = [];

try {
  // ponytail: runs one at a time (~7 min for 40). Parallel would be faster but sets off more npm 429s.
  for (const c of cases) {
    for (let run = 1; run <= RUNS; run++) {
      let traceId = "";
      try {
        const answer = await trace(
          {
            name: `eval ${c.id} run ${run}`,
            sessionId,
            attributes: { "eval.case": c.id, "eval.run": run },
          },
          async (span) => {
            traceId = span.spanContext().traceId;
            const answer = await advise(c.question);
            setTraceOutput(answer);
            return answer;
          },
        );
        console.log(`\n### ${c.id} run ${run}, trace ${traceId}\n\n${answer}`);
        rows.push({
          caseId: c.id,
          run,
          traceId,
          trapsMentioned: mentionedPackages(answer, c.traps),
        });
      } catch (err) {
        // A crashed run still has its trace in neatlogs. Record it and keep going.
        const error = err instanceof Error ? err.message : String(err);
        console.log(`\n### ${c.id} run ${run}, trace ${traceId}\n\nCrashed: ${error}`);
        rows.push({ caseId: c.id, run, traceId, trapsMentioned: [], error });
      }
    }
  }
} finally {
  console.log(`\n## Session ${sessionId}\n\n${resultsTable(rows)}`);
  await shutdown();
}
