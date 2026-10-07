import OpenAI from "openai";
import { init, shutdown, span, wrapOpenAI } from "neatlogs";
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

await init({
  apiKey: requireEnv("NEATLOGS_API_KEY"),
  workflowName: "npm-advisor",
});

const client = wrapOpenAI(
  new OpenAI({
    baseURL: "https://api.aicredits.in/v1",
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
  license: string;
  deprecated: string;
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
      license: string | null;
      repository: string | null;
      weeklyDownloads: number | null;
      deprecated: string | null;
    };

const searchPackages = span(
  { kind: "TOOL", toolName: "search_packages" },
  async (query: string): Promise<SearchResult[]> => {
    const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=25`;

    const res = await fetch(url);
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

const getPackageInfo = span(
  { kind: "TOOL", toolName: "get_package_info" },
  async (name: string): Promise<PackageInfo> => {
    const encoded = encodeURIComponent(name).replace("%40", "@");
    const [latestRes, searchRes] = await Promise.all([
      fetch(`https://registry.npmjs.org/${encoded}/latest`),
      fetch(
        `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(name)}&size=5`,
      ),
    ]);

    if (latestRes.status === 404) return { found: false, name };
    if (!latestRes.ok)
      throw new Error(
        `npm lookup for ${name} failed with status ${latestRes.status}`,
      );

    const latest = (await latestRes.json()) as NpmLatestManifest;

    const search = searchRes.ok
      ? ((await searchRes.json()) as NpmSearchResponse)
      : { objects: [] };

    const match = search.objects.find((o) => o.package.name === name);

    return {
      found: true,
      name,
      description: latest.description ?? "",
      latestVersion: latest.version,
      lastPublished: match?.package.date ?? null,
      license: latest.license ?? null,
      repository: normalizeRepository(latest.repository),
      weeklyDownloads: match?.downloads?.weekly ?? null,
      deprecated: latest.deprecated ?? null,
    };
  },
);

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

async function runTool(name: string, rawArgs: string): Promise<string> {
  const args: unknown = JSON.parse(rawArgs);

  if (name === "search_packages" && isQueryArgs(args)) {
    return JSON.stringify(await searchPackages(args.query));
  }

  if (name === "get_package_info" && isNameArgs(args)) {
    return JSON.stringify(await getPackageInfo(args.name));
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
          "Weigh weekly downloads, last publish date and deprecation. Give downloads and last publish date for each pick.",
        ].join("\n"),
      },
      { role: "user", content: question },
    ];

    for (let step = 1; step <= MAX_STEPS; step++) {
      const res = await client.chat.completions.create({
        model,
        messages,
        tools,
      });

      const msg = res.choices[0]?.message;
      if (!msg) throw new Error("Model returned no message");
      messages.push(msg);

      if (!msg.tool_calls?.length) return msg.content ?? "";

      const calls = msg.tool_calls.filter((call) => call.type === "function");
      const results = await Promise.all(
        calls.map(async (call) => {
          console.log(
            `[step ${step}] ${call.function.name}(${call.function.arguments})`,
          );
          return {
            id: call.id,
            content: await runTool(call.function.name, call.function.arguments),
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

const advise = span({ kind: "WORKFLOW", name: "advise" }, runAgent);

const question =
  process.argv.slice(2).join(" ") ||
  "Which date library should I use for a Next.js app?";
try {
  console.log(await advise(question));
} finally {
  await shutdown();
}
