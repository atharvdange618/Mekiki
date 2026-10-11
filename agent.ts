import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import OpenAI from "openai";
import { init, shutdown, span, wrapOpenAI } from "neatlogs";
import { appendFacts, type PackageFacts } from "./report.js";
import { npmFetch } from "./npm.js";
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in .env`);
  return value;
}

const model = requireEnv("OPENAI_MODEL");
const apiKey = requireEnv("OPENAI_API_KEY");
export const commit = execFileSync("git", ["describe", "--always", "--dirty"]).toString().trim();

await init({
  apiKey: requireEnv("NEATLOGS_API_KEY"),
  workflowName: "npm-advisor",
  tags: [`commit:${commit}`, `model:${model}`],
});

const client = wrapOpenAI(
  new OpenAI({
    apiKey: apiKey,
  }),
);

const MAX_STEPS = 8;

const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_packages",
      description:
        "Search the npm registry by keywords. Returns the 8 most downloaded matches with name, description and weekly downloads. " +
        'Results depend heavily on wording, so try 2 or 3 phrasings (e.g. "react form", "react form library", "react hook form").',
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: 'Search terms, e.g. "date formatting"',
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
  {
    type: "function",
    function: {
      name: "get_package_info",
      description:
        "Look up one npm package by exact name. Returns description, latest version, last publish date, license, " +
        "repository, weekly downloads and whether it is deprecated, or found: false if no such package exists. " +
        "Packages with the same repository belong to the same project. " +
        "Use it to check packages you suspect exist but search missed, and to verify your top picks before recommending.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              'Exact package name, e.g. "formik" or "@tanstack/react-form"',
          },
        },
        required: ["name"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
];

interface SearchResult {
  name: string;
  description: string;
  weeklyDownloads: number;
}

interface NpmSearchResponse {
  objects: {
    package: { name: string; description?: string; date?: string };
    downloads?: { weekly: number };
  }[];
}

interface NpmLatestManifest {
  version: string;
  description?: string;
  license?: string;
  deprecated?: string;
  repository?: string | { url?: string };
}

type PackageInfo =
  | { found: false; name: string }
  | {
      found: true;
      name: string;
      description: string;
      latestVersion: string;
      lastPublished: string | null;
      monthsSinceLastPublish: number | null;
      license: string | null;
      repository: string | null;
      weeklyDownloads: number | null;
      deprecated: string | null;
    };

const searchPackages = span(
  { kind: "TOOL", toolName: "search_packages" },
  async (query: string): Promise<SearchResult[]> => {
    const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=25`;

    const res = await npmFetch(url);
    if (!res.ok) throw new Error(`npm search failed with status ${res.status}`);

    const data = (await res.json()) as NpmSearchResponse;

    return data.objects
      .map((o) => ({
        name: o.package.name,
        description: o.package.description ?? "",
        weeklyDownloads: o.downloads?.weekly ?? 0,
      }))
      .sort((a, b) => b.weeklyDownloads - a.weeklyDownloads)
      .slice(0, 8);
  },
);

export const getPackageInfo = span(
  { kind: "TOOL", toolName: "get_package_info" },
  async (name: string): Promise<PackageInfo> => {
    const encoded = encodeURIComponent(name).replace("%40", "@");
    const [latestRes, searchRes] = await Promise.all([
      npmFetch(`https://registry.npmjs.org/${encoded}/latest`),
      npmFetch(
        `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(name)}&size=5`,
      ),
    ]);

    if (latestRes.status === 404) return { found: false, name };
    if (!latestRes.ok)
      throw new Error(
        `npm lookup for ${name} failed with status ${latestRes.status}`,
      );

    if (!searchRes.ok)
      throw new Error(
        `npm search for ${name} failed with status ${searchRes.status}`,
      );

    const latest = (await latestRes.json()) as NpmLatestManifest;
    const search = (await searchRes.json()) as NpmSearchResponse;

    const match = search.objects.find((o) => o.package.name === name);

    return {
      found: true,
      name,
      description: latest.description ?? "",
      latestVersion: latest.version,
      lastPublished: match?.package.date ?? null,
      monthsSinceLastPublish: monthsSince(match?.package.date),
      license: latest.license ?? null,
      repository: normalizeRepository(latest.repository),
      weeklyDownloads: match?.downloads?.weekly ?? null,
      deprecated: latest.deprecated ?? null,
    };
  },
);

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44;

function monthsSince(isoDate: string | undefined): number | null {
  if (!isoDate) return null;
  const then = Date.parse(isoDate);
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / MS_PER_MONTH);
}

function normalizeRepository(
  repo: NpmLatestManifest["repository"],
): string | null {
  const raw = typeof repo === "string" ? repo : repo?.url;
  if (!raw) return null;
  return raw
    .replace(/^git\+/, "")
    .replace(/^github:/, "https://github.com/")
    .replace(/^git:\/\//, "https://")
    .replace(/\.git$/, "")
    .toLowerCase();
}

async function runTool(
  name: string,
  rawArgs: string,
  checked: Map<string, PackageFacts>,
): Promise<string> {
  const args: unknown = JSON.parse(rawArgs);

  if (name === "search_packages" && isQueryArgs(args)) {
    return JSON.stringify(await searchPackages(args.query));
  }

  if (name === "get_package_info" && isNameArgs(args)) {
    const info = await getPackageInfo(args.name);
    if (info.found) checked.set(info.name, info);
    return JSON.stringify(info);
  }

  return JSON.stringify({ error: `Unknown tool or bad args: ${name}` });
}

function isQueryArgs(value: unknown): value is { query: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "query" in value &&
    typeof value.query === "string"
  );
}

function isNameArgs(value: unknown): value is { name: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string"
  );
}

const runAgent = span(
  { kind: "AGENT", name: "npm_advisor" },
  async (question: string): Promise<string> => {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: [
          "You help developers pick npm packages. Follow these steps in order.",
          "1. From your own knowledge, name the 3 to 5 packages developers most often choose for this job.",
          "2. In your first turn, call get_package_info on each of them and call search_packages to find anything you missed.",
          "3. If search shows a strong candidate you have not checked, call get_package_info on it.",
          "4. Recommend one package and at most two alternatives. Each must be a library developers install directly for this job.",
          "   Skip packages that extend, wrap or ship inside another library. Packages with the same repository are one project: list it once.",
          "monthsSinceLastPublish is how long ago the last release was. At 12 or more, the package may be unmaintained:",
          "   never make it the main pick, and if you list it as an alternative, say it may be unmaintained.",
          "   High downloads do not mean a package is maintained. Never call a package actively maintained at 12 or more.",
          "Write each package by its exact npm name. Never write download counts, dates or month counts:",
          "   the program appends a table of registry data for every package you name.",
        ].join("\n"),
      },
      { role: "user", content: question },
    ];
    const checked = new Map<string, PackageFacts>();

    for (let step = 1; step <= MAX_STEPS; step++) {
      const res = await client.chat.completions.create({
        model,
        messages,
        tools,
      });

      const msg = res.choices[0]?.message;
      if (!msg) throw new Error("Model returned no message");
      messages.push(msg);

      if (!msg.tool_calls?.length)
        return appendFacts(msg.content ?? "", [...checked.values()]);

      const calls = msg.tool_calls.filter((call) => call.type === "function");
      const results = await Promise.all(
        calls.map(async (call) => {
          console.log(
            `[step ${step}] ${call.function.name}(${call.function.arguments})`,
          );
          return {
            id: call.id,
            content: await runTool(
              call.function.name,
              call.function.arguments,
              checked,
            ),
          };
        }),
      );
      for (const { id, content } of results) {
        messages.push({ role: "tool", tool_call_id: id, content });
      }
    }
    return `Stopped after ${MAX_STEPS} steps without a final answer.`;
  },
);

export const advise = span({ kind: "WORKFLOW", name: "advise" }, runAgent);

// Run as a CLI only when executed directly, so evals.ts can import advise.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const question =
    process.argv.slice(2).join(" ") ||
    "Which date library should I use for a Next.js app?";
  try {
    console.log(await advise(question));
  } finally {
    await shutdown();
  }
}
