# Decisions

Newest first. Each entry says what we chose, why, and what we turned down.

## 2026-10-08: Compute package age in code
 
**Problem.** The holdout set scored 5 of 9 on main picks and walked into a trap 2 of 9 times. Every miss involved a package last published in 2023. In traces `55ecba05902f932bf329ac6d8ffd07d9` and `1b71c2d78fead71c8246242d2a2f624f` the model called `node-fetch` "actively maintained" with "Last Published: July 25, 2023" printed right above.
 
**Root cause.** The model doesn't know today's date. gpt-4o-mini's training data ends around late 2023, so a 2023 date looks recent to it. The prompt said "weigh last publish date," but that means comparing to today, which the model can't do.
 
**Fix.** `get_package_info` now returns `monthsSinceLastPublish`, computed in TypeScript. The prompt replaces "weigh" with a rule: at 12 months or more, never the main pick, and any alternative must state its age. It also says high downloads don't mean a package is maintained, since `node-fetch` has 249M weekly downloads.
 
Rejected: putting today's date in the system prompt. The model would still have to subtract dates, and small models do arithmetic badly. Code is exact. We kept this to one mechanism so the result is easy to attribute.
 
**Tradeoff.** Some packages are finished and rarely need releases. A 12 month rule will flag them. For "which library should I pick" questions, an old release is a fair warning, and the rule only blocks the main pick, so such packages can still show up as alternatives with their age stated.
 
**Result.** Mixed. On the holdout set, main picks went from 5 of 9 to 9 of 9, but alternatives fell from 14 of 18 to 8 of 18, and traps went from 2 of 9 to 3 of 9. Full scores and which predictions held are in `evals.md`.
 
The traces show three ways the alternatives broke:
 
1. The hard line at 12 months threw out `luxon` at 13 months in every H1 run, instead of keeping it with a warning.
2. With freshness as the loudest signal, fresh and popular packages took slots whether or not they fit: `moment` (released last month, but legacy by its own team's account) in H1, `gaxios` (a Google APIs client) in H2.
3. The model's own candidate list is stale. Once its 2023-era picks were ruled out, it had too few good ones left and filled slots from search, with packages like `constate` and `unstated-next`. It reads "at most two alternatives" as "exactly two."
So the fix traded one failure for others. We keep the computed age, since it's right that the model can't do date math, and change how the prompt uses it.

## 2026-10-07: The model proposes, the tools verify

**Problem.** On "best React form library?", the main pick was right in 5 of 5 runs, but the alternatives were wrong in 10 of 10. They were `rc-field-form`, `@rc-component/form` and `survey-react-ui`. The first two are the same library under an old and a new name, and both ship inside Ant Design, so their downloads come from antd installs, not developers choosing them. `survey-react-ui` got picked because its description says "React form library," word for word. Formik and TanStack Form never appeared.

**Root cause, from the traces.** Downloads measure installs, not choices, so anything bundled inside a popular library looks popular. And the model only checked what search handed it. In trace `ad6ff271963c7520c05d8bf6c328352a`, search returned `@tanstack/react-form-devtools`, direct evidence TanStack Form exists, and the model never looked up `@tanstack/react-form`. The prompt line "plus any well-known package search missed" had no effect.

 
**Fix.** Two changes aimed at one metric:

1. The system prompt is now numbered steps. Step 1 has the model name the packages developers usually choose, from its own knowledge, and look them up in its first turn alongside search. The model knows what people choose but its knowledge is stale. The tools are current but can't tell a choice from a dependency. Each covers the other's gap: a made-up or abandoned name comes back as `found: false` or with an old publish date.
2. `get_package_info` now returns `repository`, normalized so `git+https://...git` and `github:owner/repo` compare equal. Two names with the same repository count as one project. In a monorepo this groups related packages too (`@tanstack/react-form` and its devtools share `github.com/tanstack/form`), which is what we want for alternatives. We changed both together since they target the same failure. If the score improves, a follow-up run without the repository field would show how much each one did.

 
**Metric.** Per run, how many of the two alternatives are `formik`, `@tanstack/react-form` or `react-final-form`. Scored 0, 1 or 2. Defined before seeing any results.

 
| | Runs | Alternatives score | Main pick right |
| --- | --- | --- | --- |
| Before | 5 | 0 of 10 | 5 of 5 |
| After | 5 | 10 of 10 | 5 of 5 |

 
After, the alternatives were Formik plus TanStack Form once, and Formik plus React Final Form four times. The rc packages and `survey-react-ui` never appeared as picks. Trace `f32a5943ac347bdd4e6af422a0dfa485` shows the new behavior: in its first turn the model looked up `formik`, `react-hook-form`, `redux-form` and `@tanstack/react-form` from its own knowledge, alongside one search. It dropped `redux-form` after seeing it was last published in March 2023, so the verify half works too.

 
Average run time also fell from 11.7 s to 9.6 s, since the model often reached an answer in two model turns instead of three. We didn't aim for this, and the runs did different amounts of work, so treat it as a side effect, not a measured win.

 
**What's still wrong.**

- In 2 of 5 runs the model "remembered" `@tanstack/react-query`, a data fetching library, as a form library. It exists, so `get_package_info` returned `found: true`. Our verification checks that a package exists and is maintained, not that it fits the job. The model didn't recommend it, but nothing stopped it.
- In trace `bcf477fbb559700244846c9afb665a15` the answer listed `@hookform/resolvers` and `survey-react-ui` as "additional packages," outside the one pick and two alternatives the prompt allows.
- In trace `bdbbaf8c1fe6b585e118c48660ee173c` the model searched in a separate turn instead of the first one, which cost a fourth model call.
- In the 4 runs that picked React Final Form (647K weekly downloads), TanStack Form (4.2M, published more recently) lost out. In 2 of those, the model never looked TanStack Form up because it checked `@tanstack/react-query` instead.
- All 10 runs used one question. The fix may be tuned to it.

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
