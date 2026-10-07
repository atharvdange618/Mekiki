# Decisions

Newest first. Each entry says what we chose, why, and what we turned down.

## 2026-10-07: Run tool calls in parallel

The model often asks for several tools in one turn, but the loop ran them one at a time with `await` inside `for...of`. The answer was the same either way, so only the trace timeline showed it: each tool span started the moment the previous one ended. Now the loop runs them with `Promise.all`. Each result comes back paired with its `tool_call_id`, so order can't get mixed up.

Measured on the form question, comparing runs with the same number of calls (3 searches, then 3 package lookups):

|               | Before | After  |
| ------------- | ------ | ------ |
| Time in tools | 6.3 s  | 2.3 s  |
| Total run     | 14.0 s | 10.7 s |

Before: trace `ad6ff271963c7520c05d8bf6c328352a`. After: trace `06f94df4908c636d9e010c1031cbc07e`. Two more runs after the fix made only 2 searches and spent 2.8 s and 2.9 s in tools. Answer quality didn't change, which is what we expected from a speed-only fix.

The model calls now take most of the time. The final call alone runs 4 to 5 seconds, since it writes 250 to 300 tokens.

## 2026-10-07: Manual Neatlogs setup, not the wizard

Neatlogs offers `npx @neatlogs/wizard@latest`, which edits your code for you. We added tracing by hand so we know what every line does before the hackathon, where we'll have to shape traces ourselves.

The trace tree is `WORKFLOW advise` > `AGENT npm_advisor` > `LLM` spans from `wrapOpenAI` and `TOOL` spans from `span()`. One CLI run is one trace.

The API key comes from `NEATLOGS_API_KEY` in `.env`. The dashboard snippet hardcodes it in `init()`, which would put it in a public repo.

`shutdown()` runs in a `finally` block. Spans flush every 5 seconds, so a short run or a crash could exit before they're sent. The `finally` matters most for crashes, since those are the traces we most want to see.

## 2026-10-07: One `get_package_info` tool instead of two

We merged the planned `get_package_info` and `get_downloads` into one tool. The model never wants one of those facts without the others, and every extra tool is one more choice it can get wrong. The cost is two HTTP requests inside one tool call.

## 2026-10-07: `/latest` plus search, not the full package document

The full document for `react-hook-form` is 5.2 MB because it lists every version ever published. `/latest` is 5 KB and has version, description, license and deprecation, but no publish date. An exact-name search fills in publish date and weekly downloads. Both run in parallel.

Rejected: fetching the latest version first and then its description. `/latest` returns both in one request, so a second call adds nothing.

Rejected: the abbreviated document (`application/vnd.npm.install-v1+json`). Still 2.6 MB, and it only has a `modified` date, which also changes on edits that aren't releases.

## 2026-10-07: A missing package is data, not an error

`get_package_info` returns `{ found: false }` on a 404. A model guessing a package name that doesn't exist is an expected outcome, and it should learn that and move on. A 500 or a network failure is different, and it still throws.

## 2026-10-07: Leave the crash on npm errors in, for now

A failed npm request crashes the run instead of returning the error to the model. We left it on purpose so we can trigger it and find it in Neatlogs traces in step 4.

## 2026-10-07: Fetch 25 search results, sort by downloads, keep 8

npm search ranks by text match, not popularity. With 5 results, "React form library" missed `react-hook-form` (70M weekly downloads) entirely. With 25 it came first after sorting. Keeping 8 limits how much text rides along in the context on every later turn.

## 2026-10-07: Phrasing advice lives in the tool description

"react form" and "react form library" return very different results, so the tool description tells the model to try 2 or 3 phrasings. We put this in the tool description rather than the system prompt because it's about using this one tool, and it travels with the tool if we reuse it.

## 2026-10-07: Model name comes from `OPENAI_MODEL`

Model names change often. An env var lets us swap models without touching code. We use `gpt-4o-mini`, a cheap model that fails often enough to teach us something.

## 2026-10-07: `tsx` and Node's `--env-file`

`tsx` runs TypeScript with no build step. Node 22's `--env-file` loads `.env`, so we skipped `dotenv`. `openai` 7.x needs Node 22 or later anyway.
