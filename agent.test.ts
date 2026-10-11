import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const npmFetch = vi.fn<(url: string) => Promise<Response>>();

vi.mock("./npm.js", () => ({ npmFetch }));
vi.mock("neatlogs", () => ({
  init: vi.fn(),
  shutdown: vi.fn(),
  span: <TArgs extends unknown[], TReturn>(
    _options: unknown,
    fn: (...args: TArgs) => TReturn,
  ) => fn,
  wrapOpenAI: <T>(client: T) => client,
}));

let getPackageInfo: typeof import("./agent.js").getPackageInfo;

beforeAll(async () => {
  vi.stubEnv("OPENAI_MODEL", "test-model");
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("NEATLOGS_API_KEY", "test-key");
  ({ getPackageInfo } = await import("./agent.js"));
});

const latest = { name: "zustand", version: "5.0.0", license: "MIT" };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function respond(latestRes: Response, searchRes: Response) {
  npmFetch.mockImplementation(async (url) =>
    url.includes("/-/v1/search") ? searchRes : latestRes,
  );
}

describe("getPackageInfo", () => {
  beforeEach(() => {
    npmFetch.mockReset();
  });

  it("throws when the search call fails, instead of returning unknown downloads", async () => {
    respond(json(latest), json({}, 429));
    await expect(getPackageInfo("zustand")).rejects.toThrow(
      "npm search for zustand failed with status 429",
    );
  });

  it("returns null downloads when search works but doesn't list the package", async () => {
    respond(json(latest), json({ objects: [] }));
    const info = await getPackageInfo("zustand");
    expect(info).toMatchObject({ found: true, weeklyDownloads: null, lastPublished: null });
  });

  it("fills downloads and publish date from the search match", async () => {
    respond(
      json(latest),
      json({
        objects: [
          {
            package: { name: "zustand", date: "2026-08-13T00:00:00.000Z" },
            downloads: { weekly: 61_766_686 },
          },
        ],
      }),
    );
    const info = await getPackageInfo("zustand");
    expect(info).toMatchObject({
      found: true,
      weeklyDownloads: 61_766_686,
      lastPublished: "2026-08-13T00:00:00.000Z",
    });
  });

  it("returns found: false on a 404 even if search fails", async () => {
    respond(json({}, 404), json({}, 429));
    expect(await getPackageInfo("not-a-package")).toEqual({
      found: false,
      name: "not-a-package",
    });
  });
});
