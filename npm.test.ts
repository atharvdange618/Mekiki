import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { npmFetch } from "./npm.js";

function response(status: number, headers: Record<string, string> = {}) {
  return new Response(null, { status, headers });
}

describe("npmFetch", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("returns the first response when it isn't a 429", async () => {
    fetchMock.mockResolvedValueOnce(response(200));
    const res = await npmFetch("https://registry.npmjs.org/x");
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("doesn't retry other errors", async () => {
    fetchMock.mockResolvedValueOnce(response(500));
    const res = await npmFetch("https://registry.npmjs.org/x");
    expect(res.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a 429 and returns the later success", async () => {
    fetchMock
      .mockResolvedValueOnce(response(429))
      .mockResolvedValueOnce(response(429))
      .mockResolvedValueOnce(response(200));
    const pending = npmFetch("https://registry.npmjs.org/x");
    await vi.runAllTimersAsync();
    expect((await pending).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries 502, 503 and 504 and logs the actual status", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(502))
      .mockResolvedValueOnce(response(504))
      .mockResolvedValueOnce(response(200));
    const pending = npmFetch("https://registry.npmjs.org/x");
    await vi.runAllTimersAsync();
    expect((await pending).status).toBe(200);
    expect(warn.mock.calls).toEqual([
      ["[npm] 503 on https://registry.npmjs.org/x, retry 2 in 1000ms"],
      ["[npm] 502 on https://registry.npmjs.org/x, retry 3 in 2000ms"],
      ["[npm] 504 on https://registry.npmjs.org/x, retry 4 in 4000ms"],
    ]);
    warn.mockRestore();
  });

  it("waits as long as Retry-After asks", async () => {
    fetchMock
      .mockResolvedValueOnce(response(429, { "retry-after": "5" }))
      .mockResolvedValueOnce(response(200));
    const pending = npmFetch("https://registry.npmjs.org/x");
    await vi.advanceTimersByTimeAsync(4_999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect((await pending).status).toBe(200);
  });

  it("logs each retry with the url, attempt and wait", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock
      .mockResolvedValueOnce(response(429))
      .mockResolvedValueOnce(response(429, { "retry-after": "3" }))
      .mockResolvedValueOnce(response(200));
    const pending = npmFetch("https://registry.npmjs.org/x");
    await vi.runAllTimersAsync();
    await pending;
    expect(warn.mock.calls).toEqual([
      ["[npm] 429 on https://registry.npmjs.org/x, retry 2 in 1000ms"],
      ["[npm] 429 on https://registry.npmjs.org/x, retry 3 in 3000ms"],
    ]);
    warn.mockRestore();
  });

  it("gives up after 4 tries and returns the last 429", async () => {
    fetchMock.mockResolvedValue(response(429));
    const pending = npmFetch("https://registry.npmjs.org/x");
    await vi.runAllTimersAsync();
    expect((await pending).status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
