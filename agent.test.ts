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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function packument(name: string) {
  return {
    name,
    "dist-tags": { latest: "5.0.0" },
    versions: {
      "4.0.0": { version: "4.0.0", description: "old" },
      "5.0.0": {
        version: "5.0.0",
        description: "Bear necessities",
        license: "MIT",
        repository: { url: "git+https://github.com/pmndrs/zustand.git" },
      },
    },
    time: {
      modified: "2026-09-01T00:00:00.000Z",
      "4.0.0": "2025-01-01T00:00:00.000Z",
      "5.0.0": "2026-08-13T00:00:00.000Z",
    },
  };
}

// Routes the package document and the downloads API to separate responses.
// Each call builds a fresh Response, since a body can only be read once.
function respond(doc: () => Response, downloads: () => Response) {
  npmFetch.mockImplementation(async (url) =>
    url.startsWith("https://api.npmjs.org/downloads/") ? downloads() : doc(),
  );
}

describe("getPackageInfo", () => {
  beforeEach(() => {
    npmFetch.mockReset();
  });

  // The cache lives for the whole module, so each test uses its own name.

  it("reads the latest version's fields and publish date from the package document", async () => {
    respond(
      () => json(packument("pkg-fields")),
      () => json({ downloads: 61_766_686 }),
    );
    expect(await getPackageInfo("pkg-fields")).toEqual({
      found: true,
      name: "pkg-fields",
      description: "Bear necessities",
      latestVersion: "5.0.0",
      lastPublished: "2026-08-13T00:00:00.000Z",
      monthsSinceLastPublish: expect.any(Number),
      license: "MIT",
      repository: "https://github.com/pmndrs/zustand",
      weeklyDownloads: 61_766_686,
      deprecated: null,
    });
  });

  it("asks the downloads API and the registry, never search", async () => {
    respond(
      () => json(packument("@scope/pkg-urls")),
      () => json({ downloads: 1 }),
    );
    await getPackageInfo("@scope/pkg-urls");
    expect(npmFetch.mock.calls.map(([url]) => url).sort()).toEqual([
      "https://api.npmjs.org/downloads/point/last-week/@scope%2Fpkg-urls",
      "https://registry.npmjs.org/@scope%2Fpkg-urls",
    ]);
  });

  it("returns found: false on a 404 even if the downloads call fails", async () => {
    respond(
      () => json({}, 404),
      () => json({}, 503),
    );
    expect(await getPackageInfo("pkg-missing")).toEqual({
      found: false,
      name: "pkg-missing",
    });
  });

  it("returns null downloads when the downloads API has no data for the package", async () => {
    respond(
      () => json(packument("pkg-new")),
      () => json({ error: "package pkg-new not found" }, 404),
    );
    expect(await getPackageInfo("pkg-new")).toMatchObject({
      found: true,
      weeklyDownloads: null,
    });
  });

  it("throws when the downloads call fails", async () => {
    respond(
      () => json(packument("pkg-downloads-down")),
      () => json({}, 503),
    );
    await expect(getPackageInfo("pkg-downloads-down")).rejects.toThrow(
      "npm downloads for pkg-downloads-down failed with status 503",
    );
  });

  it("throws when the registry call fails with anything but 404", async () => {
    respond(
      () => json({}, 500),
      () => json({ downloads: 1 }),
    );
    await expect(getPackageInfo("pkg-registry-down")).rejects.toThrow(
      "npm lookup for pkg-registry-down failed with status 500",
    );
  });

  describe("batch cache", () => {
    it("fetches a package once, however often it's asked for", async () => {
      respond(
        () => json(packument("pkg-cached")),
        () => json({ downloads: 5 }),
      );
      const first = await getPackageInfo("pkg-cached");
      const second = await getPackageInfo("pkg-cached");
      expect(second).toEqual(first);
      expect(npmFetch).toHaveBeenCalledTimes(2);
    });

    it("shares one fetch between lookups made at the same time", async () => {
      respond(
        () => json(packument("pkg-parallel")),
        () => json({ downloads: 5 }),
      );
      await Promise.all([
        getPackageInfo("pkg-parallel"),
        getPackageInfo("pkg-parallel"),
      ]);
      expect(npmFetch).toHaveBeenCalledTimes(2);
    });

    it("doesn't keep a failed lookup, so the next call tries again", async () => {
      respond(
        () => json({}, 500),
        () => json({ downloads: 5 }),
      );
      await expect(getPackageInfo("pkg-flaky")).rejects.toThrow();
      respond(
        () => json(packument("pkg-flaky")),
        () => json({ downloads: 5 }),
      );
      expect(await getPackageInfo("pkg-flaky")).toMatchObject({ found: true });
    });
  });
});
