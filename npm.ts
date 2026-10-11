const MAX_TRIES = 4;
const RETRY_STATUSES = new Set([429, 502, 503, 504]);

// npm returns 429 when an eval batch calls it too fast, and 502-504 when it's
// briefly overloaded. Retry those, waiting as long as Retry-After says, or
// 1s, 2s, 4s without it.
export async function npmFetch(url: string): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url);
    if (!RETRY_STATUSES.has(res.status) || attempt === MAX_TRIES) return res;
    const retryAfter = Number(res.headers.get("retry-after"));
    const waitMs = retryAfter > 0 ? retryAfter * 1000 : 2 ** (attempt - 1) * 1000;
    console.warn(`[npm] ${res.status} on ${url}, retry ${attempt + 1} in ${waitMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}
