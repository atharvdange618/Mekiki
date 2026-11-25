# Evals

Each question has its answer key written down before any run. Commit this file before running, so the git history shows the key came first and nobody moved the goalposts after seeing results.

## How to score a run

| Field | Meaning                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------- |
| Main  | Is the main pick in the **accept** list? Yes or no.                                               |
| Alts  | How many of the alternatives are in the **accept** list, 0 to 2.                                  |
| Trap  | Did the answer recommend anything from the **trap** list, as main pick or alternative? Yes or no. |

Packages in neither list score nothing and aren't a trap. Something mentioned outside the pick and alternatives, like an "also found" list, doesn't count toward Main or Alts, but write it down as a note.

## Tuning set

The question we fixed the agent against. Good scores here prove less than good scores on the holdout set.

**"best React form library?"**

- Accept: `react-hook-form`, `formik`, `@tanstack/react-form`, `react-final-form`
- Trap: `rc-field-form`, `@rc-component/form`, `survey-react-ui`, `@hookform/resolvers`

## Holdout set

Questions the agent was never tuned on. Run each 10 times. Batches up to commit `b81e4c1` ran each 3 times, too few to tell a prompt change from run-to-run noise (see the `1c0f5df` rerun).

**H1: "best date library for a TypeScript project?"**

- Accept: `date-fns`, `dayjs`, `luxon`, `@js-temporal/polyfill`
- Trap: `moment`. The Moment team calls it a legacy project and points people to other libraries. Its registry data looks healthy (published September 2026), so the model has to know this from memory. The tools can't tell it.

**H2: "which HTTP client should I use in Node?"**

- Accept: `axios`, `got`, `ky`, `undici`, `ofetch`, `superagent`, and Node's built-in `fetch`, which counts as a valid pick even though it's not an npm package
- Trap: `request`, which is deprecated
- Neither: `node-fetch`. Still widely used, but last published July 2023 and mostly replaced by built-in `fetch`

**H3: "state management library for React?"**

- Accept: `zustand`, `@reduxjs/toolkit`, `jotai`, `mobx`, `valtio`
- Trap: `recoil`, last published March 2023
- Neither: `redux` and `react-redux` (the toolkit is the recommended way to use Redux now), `@tanstack/react-query` (server state, a different job)

## Results

### Tuning set, after the propose-then-verify fix

| Run | Main   | Alts     | Trap   | Notes                                                                        |
| --- | ------ | -------- | ------ | ---------------------------------------------------------------------------- |
| 1-5 | 5 of 5 | 10 of 10 | 0 of 5 | One run listed `@hookform/resolvers` as "also found"                         |
| 6   | Yes    | 2        | No     | Trace `0b01a315c22606e75faeab2dc0cb30ba`, run alongside the holdout baseline |

### Holdout set

| Question | Run | Main              | Alts                               | Trap           | Trace                              | Notes                                                                                                              |
| -------- | --- | ----------------- | ---------------------------------- | -------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| H1       | 1   | Yes (`date-fns`)  | 2 (`luxon`, `dayjs`)               | No             | `bf65999933a7675b6ea5f5c4b7b197d5` | Looked up `moment` and dropped it. Also looked up `react-day-picker`, a UI component, not a date library           |
| H1       | 2   | Yes (`date-fns`)  | 2 (`luxon`, `dayjs`)               | No             | `da8eab6d0a8a60c4b0dabcc114cfb55d` | Listed `moment` and `@date-fns/tz` in its overview, but not as picks                                               |
| H1       | 3   | Yes (`date-fns`)  | 2 (`luxon`, `dayjs`)               | No             | `80eb3c290d89ca89e68f92d7a0c90497` | "Additional options" section with `@date-fns/tz` and `@internationalized/date`                                     |
| H2       | 1   | No (`node-fetch`) | 2 (`axios`, `undici`)              | No             | `55ecba05902f932bf329ac6d8ffd07d9` | Called `node-fetch` "actively maintained" next to its own July 2023 publish date. Never mentioned built-in `fetch` |
| H2       | 2   | No (`node-fetch`) | 2 (`axios`, `got`)                 | No             | `a147256ea4b0376a64abdac262eddd45` | Checked `request` and dropped it. Listed `gaxios`, a client for Google APIs                                        |
| H2       | 3   | No (`node-fetch`) | 2 (`axios`, `got`)                 | No             | `1b71c2d78fead71c8246242d2a2f624f` | Called `node-fetch` "actively maintained" again                                                                    |
| H3       | 1   | No (`redux`)      | 1 (`zustand`)                      | Yes (`recoil`) | `3e20ece643be206ac6fd27763e8b9f77` | Recommended `recoil` with its March 2023 publish date on screen. Never looked up `@reduxjs/toolkit`                |
| H3       | 2   | Yes (`zustand`)   | 1 (`mobx`; `redux` scores nothing) | No             | `d140626febbe3fb6d1f475d69c5d814c` | Looked up `@reduxjs/toolkit`, then recommended plain `redux` anyway                                                |
| H3       | 3   | Yes (`zustand`)   | 0 (`redux`, `recoil`)              | Yes (`recoil`) | `317a15d4f60d9e1f11b867ad7e657f33` | Same "concurrent features" claim for `recoil` as run 1                                                             |

### Holdout baseline, before the freshness fix

| Question  | Main       | Alts         | Trap       |
| --------- | ---------- | ------------ | ---------- |
| H1, dates | 3 of 3     | 6 of 6       | 0 of 3     |
| H2, HTTP  | 0 of 3     | 6 of 6       | 0 of 3     |
| H3, state | 2 of 3     | 2 of 6       | 2 of 3     |
| **Total** | **5 of 9** | **14 of 18** | **2 of 9** |

Every miss involves a package last published in 2023: `node-fetch` (July 2023) as the H2 main pick three times, `redux` (December 2023) as an H3 pick three times, and `recoil` (March 2023) as an H3 pick twice.

### Predictions for the freshness fix

Written before running it.

- H2: `node-fetch` stops being the main pick. Main goes from 0 of 3 to at least 2 of 3.
- H3: `recoil` stops being recommended. Trap goes from 2 of 3 to 0 of 3. `redux` drops out or gets a warning, so Alts rises.
- H1: no change. `moment` was published in September 2026, so the fix can't see what's wrong with it. If H1 holds, that's memory doing the work, not the fix.
- `luxon` was last published 13 months ago. It's still in the accept list, so it can appear as an alternative, but the answer should say how long it has been. It should never be the main pick.
- Tuning set: stays at 2 of 2 alternatives. `formik` is 10 to 11 months since its last release, just under the line.

### Holdout, after the freshness fix

| Question | Run | Main             | Alts                                   | Trap           | Trace                              | Notes                                                                                                                                                                   |
| -------- | --- | ---------------- | -------------------------------------- | -------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1       | 1   | Yes (`date-fns`) | 1 (`dayjs`)                            | Yes (`moment`) | `3ae19b479636622aaff4b006d6f98dde` | Dropped `luxon` entirely. Said `moment` is "actively maintained"                                                                                                        |
| H1       | 2   | Yes (`date-fns`) | 1 (`dayjs`)                            | Yes (`moment`) | `452b3e5185e6b0a2a9c2d8d27b108cae` | Dropped `luxon`. Showed `moment` as "0 months ago"                                                                                                                      |
| H1       | 3   | Yes (`date-fns`) | 1 (`dayjs`)                            | Yes (`moment`) | `6602b43c24a5b2221db196be49d91ae1` | Listed `luxon` as "not actively maintained" at 13 months, then left it out of the picks                                                                                 |
| H2       | 1   | Yes (`axios`)    | 1 (`got`; `gaxios` scores nothing)     | No             | `7cc46ad8dd59f89b3a491737bf3972b0` | Two different "alternatives" lists: `got` and `gaxios` in the recommendation, `needle` and `ky` under the heading. Scored from the recommendation, both readings give 1 |
| H2       | 2   | Yes (`axios`)    | 1 (`got`; `node-fetch` scores nothing) | No             | `98bae4e13e513b921d7aab7720091a06` | Kept `node-fetch` as an alternative with "it's been a while" but no month count, against the rule                                                                       |
| H2       | 3   | Yes (`axios`)    | 1 (`got`; `gaxios` scores nothing)     | No             | `c7459c7175bbe880756b298f30ccb060` | Picked `gaxios`, a client built for Google APIs, as an alternative                                                                                                      |
| H3       | 1   | Yes (`zustand`)  | 0 (`constate`, `unstated-next`)        | No             | `4220f99ef63939c65a1cf5dc6dcdf383` | Picked `unstated-next`, last published 88 months ago, as an alternative over `mobx`. It did state the age, as the rule asks                                             |
| H3       | 2   | Yes (`zustand`)  | 1 (`mobx`; `xstate` scores nothing)    | No             | `7d8d036110db6e4ffa35ad2ecb4ba043` | Looked up `@tanstack/query`, which doesn't exist, got `found: false`, and moved on                                                                                      |
| H3       | 3   | Yes (`zustand`)  | 1 (`mobx`; `constate` scores nothing)  | No             | `ae6a0d221e2993064093b7e1a53e4ff7` | Warned against `unstated-next` and `@risingstack/react-easy-state` with their month counts                                                                              |

H1 got worse: Alts 6 of 6 became 3 of 6, and Trap 0 of 3 became 3 of 3. The prediction "H1: no change" was wrong.

H2 main pick went from 0 of 3 to 3 of 3, so that prediction held. But Alts fell from 6 of 6 to 3 of 6: `gaxios` (published 0 months ago, 134M weekly downloads, built for Google APIs) took a slot twice. Same pattern as `moment` in H1: once freshness became the main filter, fresh and popular packages filled the gaps whether or not they fit the job.

H3: `recoil` was never recommended and `redux` dropped out of the picks, so those predictions held. Alts stayed at 2 of 6, so "Alts rises" was wrong. No run looked up `@reduxjs/toolkit` or `jotai`. With `redux` and `recoil` ruled out, the model's own list had only `zustand` and `mobx` left, and it filled the last slot from search results like `constate` and `unstated-next`.

### Holdout summary, before and after the freshness fix

|        | Main   | Alts     | Trap   |
| ------ | ------ | -------- | ------ |
| Before | 5 of 9 | 14 of 18 | 2 of 9 |
| After  | 9 of 9 | 8 of 18  | 3 of 9 |

Main picks became perfect. Alternatives got much worse, and traps moved from `recoil` to `moment` instead of going away.

| Prediction                                          | Held?                                      |
| --------------------------------------------------- | ------------------------------------------ |
| H2: `node-fetch` stops being the main pick          | Yes, 3 of 3                                |
| H3: `recoil` trap drops to 0                        | Yes                                        |
| H3: `redux` drops out or gets a warning, Alts rises | Half. It dropped out, but Alts didn't rise |
| H1: no change                                       | No. Trap went from 0 of 3 to 3 of 3        |
| `luxon` appears as an alternative with a warning    | No. It was dropped in all 3 runs           |
| Tuning set unchanged                                | Not measured yet                           |

## Verified numbers fix

Run with `pnpm evals`. Each batch is one neatlogs session, and the runner prints the table below with trace IDs filled in. Main, Alts and Trap stay for a human to score. "Mentions trap" in Notes means the name appears anywhere in the answer, not that it was recommended.

**Problem.** The model copies numbers between packages. Trace `93993d17d256c10674ab3a6a5da9cbf6` gave `fecha` "13 months ago", which is `luxon`'s age. The tool returned 53.

**Metric.** Answers with a download count, publish date or month count that disagrees with the tool data for that package. Defined before the fix.

### Before, session `eval-9ffc58a-dirty-1791712993362`

| Question | Run | Main | Alts | Trap | Trace | Notes |
| -------- | --- | ---- | ---- | ---- | ----- | ----- |
| T | 1 | Yes (`react-hook-form`) | 1 (`formik`) | Yes (`survey-react-ui`) | `14a281e8b0cd575db6bfa6256b41c8da` | Picked `survey-react-ui` from search results as an alternative |
| T | 2 | Yes (`react-hook-form`) | 2 (`formik`, `@tanstack/react-form`) | No | `607545d0caa51bd136cff5388a301eec` |  |
| T | 3 | Yes (`react-hook-form`) | 1 (`formik`; `final-form` scores nothing) | No | `a8f3c4f90a11d688ed36ba9fd6eb4063` |  |
| H1 | 1 | Yes (`date-fns`) | 1 (`dayjs`) | Yes (`moment`) | `e3abbd163b24ea309a25a285f9d2d8b1` | Mentions trap: `moment` |
| H1 | 2 | Yes (`date-fns`) | 1 (`dayjs`) | Yes (`moment`) | `93bb850ed9808b7c07be569b3796a3d3` | Mentions trap: `moment` |
| H1 | 3 | Yes (`date-fns`) | 1 (`dayjs`) | Yes (`moment`) | `834c173c19faa6fcc37a2eb3a3576cf3` | Mentions trap: `moment`. Says `luxon` is 12 months, tool says 13 |
| H2 | 1 | Yes (`axios`) | 1 (`superagent`; `node-fetch` scores nothing) | No | `503b859562c9f3ccc1b799e69f961a79` | Says `node-fetch` was published "3 months ago" and is "actively maintained", next to its July 2023 date |
| H2 | 2 | Yes (`axios`) | 1 (`superagent`; `gaxios` scores nothing) | No | `05099ff864a47ab32e1f52236f2a684b` | Mentions trap: `request`. The "Alternatives" heading has `superagent` and `gaxios`, the closing line names `got`. Both readings give 1 |
| H2 | 3 | Yes (`axios`) | 1 (`superagent`; `needle` scores nothing) | No | `4b88f0d07e6dd586119152484d5cb845` |  |
| H3 | 1 | Yes (`zustand`) | 1 (`mobx`; `constate` scores nothing) | No | `b264907ba22797eca513676a1e60f432` | Scored from the closing recommendation (`mobx`, `constate`). The "Alternatives" heading holds `constate` and `unstated-next`, which would give 0 |
| H3 | 2 | Yes (`zustand`) | 1 (`mobx`; `constate` scores nothing) | No | `dd9462a69cb4b7b671776a608b8ca6cc` | Mentions trap: `recoil` |
| H3 | 3 | Yes (`zustand`) | 0 (`constate`, `unstated-next`) | No | `0962c5726e80f341151c2ee5c91a8765` | Listed `mobx` and `@reduxjs/toolkit` in its top 3 but put `constate` and `unstated-next` under "Alternatives" |

At least 2 of 12 answers state a wrong number. That count is a floor: it only covers numbers checkable from the answer text and the earlier `fecha` trace.

### Predictions for the fix

Written before running it. The fix: the model stops writing numbers, and the code appends a table of tool data for every checked package the answer names.

- Wrong numbers in the appended table: 0 of 12, since code copies them.
- Wrong numbers in the model's own text: drops, but not to 0. A small model may still write some numbers against the prompt.
- Main, Alts and Trap: no change. The rules for picking stay the same, only who writes the numbers moves.
- Risk: a pick written under a name other than its npm name (like "React Hook Form") gets no table row.

### After, session `eval-9ffc58a-dirty-1791713388639`

Notes below come from the fixed matcher. The first version counted "request" in "HTTP request library" as the package, which put false trap notes on every H2 run and a `request` row in one appended table.

| Question | Run | Main | Alts | Trap | Trace | Notes |
| -------- | --- | ---- | ---- | ---- | ----- | ----- |
| T | 1 | Yes (`react-hook-form`) | 2 (`formik`, `react-final-form`) | No | `0a35e35ad0c55fb40de805aec7870c35` |  |
| T | 2 | Yes (`react-hook-form`) | 2 (`formik`, `react-final-form`) | No | `7f5e47e8635c7782b57fef52afb622f3` |  |
| T | 3 | Yes (`react-hook-form`) | 2 (`formik`, `react-final-form`) | No | `96df3dadcbe80d13799e2049300c2504` |  |
| H1 | 1 | Yes (`date-fns`) | 1 (`dayjs`) | Yes (`moment`) | `9bb280ecc60a11546da6b272c6218edb` | Mentions trap: `moment`. Wrote `luxon` 13 months and `xdate` 26 months itself |
| H1 | 2 | Yes (`date-fns`) | 1 (`dayjs`) | Yes (`moment`) | `528aae459ab3f430b9d452e38df06b5d` | Mentions trap: `moment`. Wrote its own table with publish dates |
| H1 | 3 | Yes (`date-fns`) | 1 (`dayjs`) | Yes (`moment`) | `f5cc99072ae81883dd900c0556570b42` | Mentions trap: `moment` |
| H2 | 1 | Yes (`axios`) | 2 (`got`, `superagent`) | No | `38661850411203d8f66edb1e9936245c` |  |
| H2 | 2 | Yes (`axios`) | 2 (`undici`, `got`) | No | `254d3343006c7410332b8c2c3a859013` |  |
| H2 | 3 | Yes (`axios`) | 2 (`superagent`, `got`) | No | `0f19c9fcfdee96016207832146a6ddb2` | Wrote its own table with publish dates |
| H3 | 1 | Yes (`zustand`) | 1 (`mobx`; `redux` scores nothing) | No | `828fd19c506c4fccbf8f14da1d5c2de5` |  |
| H3 | 2 | Yes (`@reduxjs/toolkit`) | 2 (`mobx`, `zustand`) | No | `d78c5c8bfdda1158d22afdf01e78b263` |  |
| H3 | 3 | n/a | n/a | n/a | `cc5ab175d86b8f038f419f36f12ff74c` | Crashed: npm search failed with status 429 |

| Prediction | Held? |
| --- | --- |
| Wrong numbers in the appended table: 0 | Yes. All 11 answers got a table, copied from tool data |
| Wrong numbers in the model's own text drop, not to 0 | Yes. 3 of 11 answers still wrote numbers. None I could check were wrong, against at least 2 of 12 before |
| Main, Alts and Trap unchanged | Main and holdout Trap, yes. Alts, no: they went up. See below |
| A pick under a non-npm name gets no table row | Not checked |

|                  | Main   | Alts     | Trap   |
| ---------------- | ------ | -------- | ------ |
| Tuning, before   | 3 of 3 | 4 of 6   | 1 of 3 |
| Tuning, after    | 3 of 3 | 6 of 6   | 0 of 3 |
| Holdout, before  | 9 of 9 | 8 of 18  | 3 of 9 |
| Holdout, after   | 8 of 8 | 12 of 16 | 3 of 8 |

The after holdout has 8 runs, since H3 run 3 crashed.

Main held at every run. The holdout trap stayed the same: `moment` as an alternative in all 3 H1 runs of both batches. The fix can't reach that one, since the registry data for `moment` looks healthy.

Alts rose, against the prediction. Per question: T 4 to 6 of 6, H1 3 to 3 of 6, H2 3 to 6 of 6, H3 2 of 6 to 3 of 4. The before answers filled slots from search results: `survey-react-ui` (a tuning trap), `final-form`, `gaxios`, `needle`, `constate`. None of those appear as picks after. The after runs also looked up more accepted packages in step 1 (`react-final-form`, `undici`, `@reduxjs/toolkit`), so part of the gain may come from what the model chose to check, not from how it wrote. With 3 runs per question, this is a lead, not a result.

Both batches carry the tag `commit:9ffc58a-dirty`, because neither change was committed. The session IDs tell them apart, but the commit tag can't. Commit a prompt change before running its "after" batch.

## Rerun at `1c0f5df`, session `eval-1c0f5df-1791733912955`

Same prompt as the "after" batch above. Commit `185890e` only added retries for npm 429s and made a failed search lookup throw, so neither changes what the model sees on a good run. No predictions, since this batch was run to test the retry, not a change to the agent. It still shows how much the scores move between two runs of the same prompt.

When an answer names no main pick, Main scores No. Notes say what the list led with.

| Question | Run | Main | Alts | Trap | Trace | Notes |
| -------- | --- | ---- | ---- | ---- | ----- | ----- |
| T | 1 | No (none named) | 0 (`survey-react-ui`, `@jiin.seok/formkit-react`) | Yes (`survey-react-ui`) | `0235630ee945eb0b81b7ecd58fa7f3ce` | List led with `react-hook-form`, then `formik` and `@tanstack/react-form`, none of them picked |
| T | 2 | Yes (`react-hook-form`) | 2 (`formik`, `react-final-form`) | No | `9c2632f13004732d4e447fc4d1292f5e` |  |
| T | 3 | Yes (`react-hook-form`) | 0 (`survey-react-ui`, `@jcoreio/zod-forms`) | Yes (`survey-react-ui`) | `c77435f05effe17c7681eddec5ecebdb` | Listed `formik` and `react-final-form` in its top 3 but put search results under "Alternatives" |
| H1 | 1 | Yes (`date-fns`) | 1 (`dayjs`) | Yes (`moment`) | `dd1d4b92a9b7d8a3d04471497da90a08` | First answer to warn about `moment`'s status ("possible future deprecation"), then recommended it anyway |
| H1 | 2 | Yes (`date-fns`) | 1 (`luxon`) | Yes (`moment`) | `72696b416445321be5b47be74fb2359c` | `dayjs` named as second choice outside the heading. First time `luxon` is an alternative with an age warning, as the freshness fix predicted |
| H1 | 3 | Yes (`date-fns`) | 1 (`dayjs`) | Yes (`moment`) | `c017ec0da2657e0c54694a6cb3d94e8b` | Called `moment` "actively maintained". Looked up `luxon`, then left it out without a word |
| H2 | 1 | Yes (`axios`) | 2 (`got`, `undici`) | No | `d1371a624e4ba5cf799ba7cdb848b71f` | Said `node-fetch` "has not been updated in several months". The table says 38 |
| H2 | 2 | n/a | n/a | n/a | `0f96766f80ce63fa8ec44003f01383fc` | Crashed: npm search for ky failed with status 503 |
| H2 | 3 | Yes (`axios`) | 1 (`got`; `gaxios` scores nothing) | No | `119c035b5ff636e9b7c629f352194774` | Picked `gaxios`, the Google APIs client, again |
| H3 | 1 | No (none named) | 0 (`constate`, `unstated-next`) | No | `a02ca582ff1cc1ce1d1c7c84b342caa2` | List led with `redux` (33 months) with no warning, then `mobx`, `zustand` |
| H3 | 2 | Yes (`zustand`) | 1 (`mobx`; `constate` scores nothing) | No | `8aaa9cfdbb728a01ba859d16adefed58` | Put `recoil` under "Packages to Avoid" |
| H3 | 3 | No (none named) | 0 (`constate`, `unstated-next`) | No | `1da3a646e0cdb2ebd53d665020c04a2a` | List led with `redux`, flagged as maybe unmaintained |

|                 | Main   | Alts     | Trap   |
| --------------- | ------ | -------- | ------ |
| Tuning, after   | 3 of 3 | 6 of 6   | 0 of 3 |
| Tuning, rerun   | 2 of 3 | 2 of 6   | 2 of 3 |
| Holdout, after  | 8 of 8 | 12 of 16 | 3 of 8 |
| Holdout, rerun  | 6 of 8 | 7 of 16  | 3 of 8 |

Both have 8 holdout runs: one crash each.

Same prompt, much worse scores. `survey-react-ui` went from 0 of 3 to 2 of 3, Alts dropped back to the level of the "before" batch, and 3 of 11 answers named no main pick, which no earlier batch did. So the Alts rise in the verified-numbers comparison (8 of 18 to 12 of 16) sits inside the spread between two runs of one prompt. It wasn't the fix. With 3 runs per question, a batch can't tell a change of 4 or 5 Alts from noise. Comparing prompts needs more runs per question, or several batches per side.

`moment` is the one steady result: an alternative in all 3 H1 runs, in every batch since the freshness fix.

The retry logged 11 retries across 5 runs, all recovered. Without it, those 5 runs would have crashed. The one crash left was a 503, which `npmFetch` didn't retry at the time. It now retries 502, 503 and 504 too.

## 10-run baseline at `3a62ea0`, session `eval-d68d642-dirty-1791736407690`

The first batch at 10 runs per question, and the first after `get_package_info` moved off npm search to the package document and downloads API. The prompt is the same as the verified-numbers "after" batch. Future prompt changes compare against this table.

The tag says `d68d642-dirty` because the batch started 38 seconds before commit `3a62ea0` landed. The uncommitted code was exactly what `3a62ea0` contains, so the batch ran that commit's code.

No run crashed and no npm retries were logged. `request` now gets real registry data (79 months, deprecated) where it used to show `unknown`.

Scoring rules, same as the `1c0f5df` rerun: an answer that names no main pick scores No. A trap counts when the answer recommends it in any list, not only under "Alternatives". When an answer has two alternatives lists, the closing one counts.

| Question | Run | Main | Alts | Trap | Trace | Notes |
| -------- | --- | ---- | ---- | ---- | ----- | ----- |
| T | 1 | Yes (`react-hook-form`) | 0 (`survey-react-ui`, `@jcoreio/zod-forms`) | Yes (`survey-react-ui`) | `a7a15ddf357386cb5d12939fdcc3a369` | `formik` and `react-final-form` in its top 3, not under alternatives |
| T | 2 | Yes (`react-hook-form`) | 2 (`formik`, `@tanstack/react-form`) | No | `3f2027eaa302cca583e29c3f19450673` | `survey-react-ui` under "more specialized choices", outside the picks |
| T | 3 | Yes (`react-hook-form`) | 0 (`survey-react-ui`) | Yes (`survey-react-ui`) | `438c0f8ad2e86d63a2bcca67d3f6a347` | `formik` in its top 2, not under alternatives |
| T | 4 | Yes (`react-hook-form`) | 2 (`formik`, `react-final-form`) | No | `e32bb301e52bd68d2cc6d05571460b71` |  |
| T | 5 | Yes (`react-hook-form`) | 2 (`formik`, `@tanstack/react-form`) | No | `881959d46e18824e678a93032c9fc44a` | Warned off `redux-form` |
| T | 6 | Yes (`react-hook-form`) | 1 (`formik`; `final-form` scores nothing) | No | `b014c08408f64084c9e450e2dff3523d` |  |
| T | 7 | Yes (`react-hook-form`) | 2 (`formik`, `@tanstack/react-form`) | No | `607a36d252fe7046a52be32fae8490b2` |  |
| T | 8 | Yes (`react-hook-form`) | 2 (`formik`, `react-final-form`) | No | `c5ba48cb93d8c5695ba7741b7155b172` |  |
| T | 9 | No (none named) | 1 (`@tanstack/react-form`) | Yes (`survey-react-ui`) | `7d6dde44860f63d96d5b072cd7cc6a79` | "Top recommended" listed `react-hook-form` and `formik` with no single pick |
| T | 10 | Yes (`react-hook-form`) | 1 (`formik`; `final-form` scores nothing) | No | `bb078d981c928aba6db8a1945c92285b` |  |
| H1 | 1 | Yes (`date-fns`) | 2 (`dayjs`, `luxon`) | No | `d1f4b967f5ab081be1cc378bc5ffbba3` | Never mentions `moment`. `luxon` with its age warning |
| H1 | 2 | Yes (`date-fns`) | 2 (`luxon`, `dayjs`) | No | `4efc32e4bf50327cdffeb65cc75e374f` | Called `moment` "a legacy project" in its overview |
| H1 | 3 | No (none named) | 2 (`dayjs`, `luxon`) | Yes (`moment`) | `8daac89adf0bca21433ad623659197f3` | Recommended `date-fns` and `moment` side by side |
| H1 | 4 | Yes (`date-fns`) | 1 (`dayjs`; `@internationalized/date` scores nothing) | No | `159b73e9f836261fc12ac659747c4e9a` | Called `moment` legacy in its overview |
| H1 | 5 | Yes (`date-fns`) | 1 (`dayjs`; `@internationalized/date` scores nothing) | No | `d3448316ecef457ba0640b3f2a9544cc` | Said the Moment team recommends alternatives for new projects |
| H1 | 6 | Yes (`date-fns`) | 1 (`dayjs`) | Yes (`moment`) | `f2cb10754bff250537cb991db16fd19a` |  |
| H1 | 7 | Yes (`date-fns`) | 1 (`dayjs`; `@internationalized/date` scores nothing) | No | `2062834fb3a0288af9c006d4ff2b2b6a` | Never mentions `moment`. Warned off `luxon` |
| H1 | 8 | Yes (`date-fns`) | 1 (`dayjs`) | Yes (`moment`) | `45344b0ab1c803156b389f3f6d35d16f` | Wrote publish dates itself |
| H1 | 9 | Yes (`date-fns`) | 1 (`dayjs`) | Yes (`moment`) | `9ae94e2fb40fc6e235bd5e36a2345447` | Said `moment` hasn't released "in over a year". The table says 0 months |
| H1 | 10 | Yes (`date-fns`) | 1 (`dayjs`) | Yes (`moment`) | `c395c2d128a957e56ccc470f02bd608d` | `luxon` under "Other Notable Mentions" |
| H2 | 1 | Yes (`axios`) | 2 (`undici`, `superagent`) | No | `97dba45b0f74eb773dcd334adc0d17dd` | Listed `request` as deprecated |
| H2 | 2 | Yes (`axios`) | 2 (`got`, `undici`) | No | `d03064ece29a996568f26ab4e9d5e2c7` | Listed `request` as deprecated |
| H2 | 3 | Yes (`axios`) | 2 (`got`, `superagent`) | No | `982281137c5c1a7162f6610db13c0d5f` |  |
| H2 | 4 | No (none named) | 1 (`got`; `node-fetch` scores nothing) | No | `2490c86c4f4f09e84578d25d798070e7` | Recommended `axios` and `superagent` with no single pick |
| H2 | 5 | Yes (`axios`) | 2 (`got`, `undici`) | No | `474774bd647aaf1b653d248cf48d61eb` | Two alternatives lists: `superagent` and `node-fetch` under the heading, `got` and `undici` in the closing one. Said `node-fetch` "has been updated recently". It's 38 months |
| H2 | 6 | Yes (`axios`) | 1 (`superagent`; `node-fetch` scores nothing) | No | `6b15442cff1de94c3b9e895f46bbdd04` | Listed `request` as deprecated |
| H2 | 7 | Yes (`axios`) | 1 (`superagent`; `gaxios` scores nothing) | No | `9941f5325fd69251ebb9f45acc6ff6f0` |  |
| H2 | 8 | Yes (`axios`) | 2 (`undici`, `superagent`) | No | `6936530eb021d6c2b8d30ac3746d2ef9` |  |
| H2 | 9 | Yes (`axios`) | 1 (`got`; `gaxios` scores nothing) | No | `6fcaa3c897413cbcdb68bc47190770aa` | Listed `request` as deprecated |
| H2 | 10 | Yes (`axios`) | 1 (`got`; `gaxios` scores nothing) | No | `87df00ac4a283d810418259363f36e5b` |  |
| H3 | 1 | No (none named) | 0 (`redux`, `unstated-next`) | No | `7b7c91182d1a51ae4f12743236656ea8` | Top list led with `mobx`, then `zustand`, `constate` |
| H3 | 2 | Yes (`zustand`) | 1 (`mobx`) | Yes (`recoil`) | `9568c3f33d438bc1ce2a04cc308e3987` | Listed `recoil` as an alternative while warning it's 43 months old |
| H3 | 3 | Yes (`zustand`) | 2 (`mobx`, `@reduxjs/toolkit`) | No | `fe452d071e42b28f50998161c54a3f17` |  |
| H3 | 4 | No (none named) | 1 (`@reduxjs/toolkit`) | No | `e10e642b4add695471c4b7b401d9ea75` | Top list led with `redux` |
| H3 | 5 | No (none named) | 0 (`redux`) | Yes (`recoil`) | `f31dda39dcf0c005414ad4ddb299fa5e` | Called `recoil` "a good choice" in its top list |
| H3 | 6 | Yes (`zustand`) | 1 (`mobx`; `constate` scores nothing) | No | `66125d35b6dd614855699d0bdee8607a` |  |
| H3 | 7 | Yes (`zustand`) | 1 (`mobx`; `constate` scores nothing) | No | `26f77562bf47c1cc1869c3037ae00fbb` |  |
| H3 | 8 | Yes (`zustand`) | 1 (`mobx`; `constate` scores nothing) | No | `3a5d1a0475fd3d9135e214f444a11e09` | Warned off `redux` and `recoil` |
| H3 | 9 | No (`redux`) | 2 (`zustand`, `mobx`) | No | `165fd7e6f775d839c50de648c56181ee` | Said `unstated-next` is "over 7 months" old. The table says 88 |
| H3 | 10 | Yes (`zustand`) | 0 (`constate`, `unstated-next`) | No | `55142c8d2f7e21b684eaabfda9271c05` | `react-redux` in its top 2 |

|             | Main         | Alts         | Trap        |
| ----------- | ------------ | ------------ | ----------- |
| T, forms    | 9 of 10      | 13 of 20     | 3 of 10     |
| H1, dates   | 9 of 10      | 13 of 20     | 5 of 10     |
| H2, HTTP    | 9 of 10      | 15 of 20     | 0 of 10     |
| H3, state   | 6 of 10      | 9 of 20      | 2 of 10     |
| **Holdout** | **24 of 30** | **37 of 60** | **7 of 30** |

Holdout Alts come to 62%, between the two 3-run batches of this prompt (75% and 44%). Tuning traps come to 3 of 10, between their 0 of 3 and 2 of 3. Both fit the reading that the 3-run batches were swinging around this level.

Most Main misses come from answers that list packages without naming one pick: 6 of 40 here (T 9, H1 3, H2 4, H3 1, 4 and 5). Only H3 run 9 named a wrong main pick, plain `redux`. The prompt asks for one main pick, so these are format misses as much as choice misses.

`moment` is no longer recommended every time: 5 of 10 H1 runs, down from all 3 runs in every earlier batch since the freshness fix. Two runs never mention it, and three call it legacy or say its team points elsewhere. The registry data for `moment` looks the same as before, so this is the model's own knowledge showing up some of the time, not something the tools taught it.

The model still writes some wrong numbers in its own text (H1 9, H2 5, H3 9). The registry table under each answer is right in all 40.

## 10-run batch on deepseek 4.1, session `eval-11c7ca7-dirty-1795638126455`

The same prompt, tools and scoring as the `3a62ea0` baseline, after `OPENAI_MODEL` moved to `deepseek/deepseek-v4.1-flash` through the aicredits router (see `decisions.md`, 2026-11-26). Nothing in the agent changed, so the gap between the two tables is the model.

The tag says `11c7ca7-dirty` because the batch started before the documentation commit `b1b2c89` landed. That commit touched no code, so the batch ran the same prompt and tools as `11c7ca7`.

| Question | Run | Main | Alts | Trap | Trace | Notes |
| -------- | --- | ---- | ---- | ---- | ----- | ----- |
| T | 1 | Yes (`react-hook-form`) | 1 (`@tanstack/react-form`) | Yes (`@rc-component/form`) | `1556b84cd2c8879ea0f385b8b1be2bb9` | Offered `@rc-component/form` as an alternative for Ant Design work |
| T | 2 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `react-final-form`, `formik`) | No | `6a456fbcc18b43f782bfa2a70a02cf6d` | Three alternatives, score capped at 2 |
| T | 3 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `react-final-form`) | No | `5ca6a0fe122dbe675fe4c4591772566c` | `@rc-component/form` named as a wrapper, not a pick |
| T | 4 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `formik`) | No | `81f9a1728d1951aa5ea005684b1b04f3` |  |
| T | 5 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `react-final-form`) | No | `d17602f7757d441c4898c2c8458e2b3d` |  |
| T | 6 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `react-final-form`, `formik`) | No | `45bb7815cc7b7d2a62907dc83f7d339a` | Three alternatives, score capped at 2 |
| T | 7 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `formik`) | No | `55bd7e3e608c26a0b36d2ad04791d9f1` | Wrote `formik`'s 12 months itself, correctly |
| T | 8 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `formik`) | No | `6316d6cd6b81c7fd61f968b257b6b6bd` |  |
| T | 9 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `react-final-form`, `formik`) | No | `3ad54de504bc9882ef2d713a28ac7d84` | Three alternatives, score capped at 2 |
| T | 10 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `formik`) | No | `6e23ee689fedc9c8dbd796ab8ec0a8ea` |  |
| H1 | 1 | Yes (`date-fns`) | 1 (`dayjs`; `@internationalized/date` scores nothing) | No | `39f775f8c6d9e774bbc308452cb12870` | `luxon` under "worth knowing", with its 14 months |
| H1 | 2 | Yes (`date-fns`) | 2 (`dayjs`, `luxon`) | No | `c34f2158a4549bee7ca7fe5732438f6c` |  |
| H1 | 3 | Yes (`date-fns`) | 2 (`dayjs`, `luxon`) | No | `c245fef1669be4e2d66e33932f7e8883` |  |
| H1 | 4 | Yes (`date-fns`) | 2 (`dayjs`, `luxon`) | No | `49f143c140a2307c248b2ca1ef1d1d3a` |  |
| H1 | 5 | Yes (`date-fns`) | 2 (`dayjs`, `luxon`) | No | `111ed51f7140f461d18a84e2ae56ff9b` |  |
| H1 | 6 | Yes (`date-fns`) | 1 (`dayjs`; `@internationalized/date` scores nothing) | No | `01427b1c57d64ca91a42d57bb6bee458` | Ran `luxon` under "avoid" |
| H1 | 7 | Yes (`date-fns`) | 2 (`dayjs`, `luxon`) | No | `48ea799a69ca58282c53920107aee482` |  |
| H1 | 8 | Yes (`date-fns`) | 2 (`dayjs`, `luxon`) | No | `6df9017737480d312804e64547ad4cb2` |  |
| H1 | 9 | Yes (`date-fns`) | 2 (`dayjs`, `luxon`) | No | `42a367a1936bb25c6498bc26510722ff` |  |
| H1 | 10 | Yes (`date-fns`) | 2 (`dayjs`, `luxon`) | No | `8dccdb947f0b17b764701b1506f28c43` |  |
| H2 | 1 | Yes (`undici`) | 2 (`axios`, `got`) | No | `1e51cc2e8f6ff36807a9da8c847563e8` |  |
| H2 | 2 | Yes (`undici`) | 2 (`axios`, `got`) | No | `327410f27e9dade55ab6a3e2094db4a0` | Listed `request` as deprecated |
| H2 | 3 | Yes (`undici`) | 2 (`axios`, `got`) | No | `6b04e6f914c2f7df8e3ea0460f7f350b` |  |
| H2 | 4 | Yes (`undici`) | 2 (`axios`, `got`) | No | `a3d5a8cc51b960c7334cc1327f2710c9` |  |
| H2 | 5 | Yes (`undici`) | 2 (`axios`, `got`) | No | `1d93b2da19b6442fbf13b4997e757b52` | `request` and `phin` both called deprecated |
| H2 | 6 | Yes (`undici`) | 2 (`axios`, `got`) | No | `8c741f8acffe9a190d13516c1438c48d` |  |
| H2 | 7 | Yes (`undici`) | 2 (`axios`, `got`) | No | `93500ed61016fe1ac66abfb779289c58` | The runner's "mentions `request`" line is prose ("request/response transforms"), not a package |
| H2 | 8 | Yes (`undici`) | 2 (`axios`, `got`) | No | `dfa427e2a3fc9dd595c4d65d9439b0c2` |  |
| H2 | 9 | Yes (`undici`) | 2 (`axios`, `got`) | No | `0659a7c7cd6a350a76b5f2e2e1160671` |  |
| H2 | 10 | Yes (`undici`) | 2 (`got`, `axios`) | No | `80a415e47e44298cae063edebd53931c` |  |
| H3 | 1 | Yes (`zustand`) | 1 (`jotai`; `redux` scores nothing) | No | `0a96fd5f8dcb1771315faa5c05f60644` | Named `redux` as an alternative with a warning |
| H3 | 2 | Yes (`zustand`) | 2 (`@reduxjs/toolkit`, `jotai`) | No | `f8a432904bdbd6c5e6da1b2f85b49655` |  |
| H3 | 3 | Yes (`zustand`) | 2 (`@reduxjs/toolkit`, `jotai`) | No | `a6236f758e30d5db72413ad4c6cf2641` |  |
| H3 | 4 | Yes (`zustand`) | 1 (`jotai`; `react-redux` scores nothing) | No | `f32437ecfcde91840d3bfc09feccb3ec` |  |
| H3 | 5 | Yes (`zustand`) | 2 (`@reduxjs/toolkit`, `jotai`) | No | `0afb01d58740e2bf2fa2089923692d4a` |  |
| H3 | 6 | Yes (`zustand`) | 2 (`@reduxjs/toolkit`, `jotai`) | No | `849a0b5f993d52c95bdb8f6e7efae376` |  |
| H3 | 7 | Yes (`zustand`) | 2 (`@reduxjs/toolkit`, `jotai`, `valtio`) | No | `83308f9463257cc45e8752f202b8b454` | Three alternatives, score capped at 2. `recoil` avoided with its 44 months |
| H3 | 8 | Yes (`zustand`) | 2 (`@reduxjs/toolkit`, `jotai`) | No | `93e5aee299719714d9bd2597cd51030d` | `recoil` avoided |
| H3 | 9 | Yes (`zustand`) | 1 (`jotai`; `redux` scores nothing) | No | `4ee6f560cf91ad490d55392491872996` | Named `redux` as an alternative with a warning |
| H3 | 10 | Yes (`zustand`) | 2 (`@reduxjs/toolkit`, `jotai`) | No | `10fbfbe8fa584207cbf4b445ba2277ee` |  |

|                          | Main         | Alts         | Trap        |
| ------------------------ | ------------ | ------------ | ----------- |
| T, forms                 | 10 of 10     | 19 of 20     | 1 of 10     |
| H1, dates                | 10 of 10     | 18 of 20     | 0 of 10     |
| H2, HTTP                 | 10 of 10     | 20 of 20     | 0 of 10     |
| H3, state                | 10 of 10     | 17 of 20     | 0 of 10     |
| **Holdout**              | **30 of 30** | **55 of 60** | **0 of 30** |
| **gpt-4o-mini baseline** | **24 of 30** | **37 of 60** | **7 of 30** |

Every run named one main pick and every pick was in the accept list. The 6 format misses from the `3a62ea0` baseline, where an answer listed packages without choosing one, do not appear here.

Alts went from 37 of 60 to 55 of 60. All five empty holdout slots went to a package the key marks Neither: `@internationalized/date` twice in H1, `redux` or `react-redux` three times in H3. The baseline's empty slots went to `constate`, `unstated-next` and `gaxios`, which appear in neither list, so the failure has the same shape with better-known neighbors.

Traps went from 7 of 30 to 0 of 30. `moment` appears in all 10 H1 answers and is warned off every time; `redux` appears in all 10 H3 answers and is never a pick; `recoil` appears twice, both under "avoid". The one forms trap is T run 1, which offered `@rc-component/form` as an alternative for Ant Design work. The key calls it a trap because it ships inside `antd`, and the answer still chose to recommend it, so it scores.

H2 changed answer outright. `undici` is the main pick in 10 of 10, where `gpt-4o-mini` picked `axios` in 9. Both are in the accept list, so this does not move Main, but it does say the newer model prefers the client built into Node.

The model still breaks the "at most two alternatives" rule, listing three in T 2, T 6, T 9 and H3 7. The score caps at 2, so the column can't inflate, but the prompt violation is real and worth a look before it reaches a user.

Every count written in prose matched the appended table: `formik` at 12 months, `luxon` at 14, `node-fetch` at 40, `recoil` at 44, `redux` at 35. The wrong-number failure from earlier batches does not show up in this one.

Limits: one batch, one model, no prompt change, so this measures the model and nothing else. It is the new comparison point; the next prompt change is measured against these numbers, not the `gpt-4o-mini` table.

## Two-alternatives fix

Four of the 40 answers above put three packages under the alternatives heading: T 2, T 6, T 9 and H3 7. The prompt already said "at most two alternatives", and the model went past it. Step 4 now names the number it overshot and says what to do with the third candidate:

> Recommend one package and at most two alternatives. Three is too many: leave a third candidate out of the alternatives list, or mention it in one line as a note.

### Predictions, written before running it

- Answers with three or more packages under the alternatives heading drop from 4 of 40 to 0 of 40. One or two left means the wording isn't doing the work.
- Main stays at 30 of 30 on the holdout. This line only touches how alternatives are listed, so a Main change would mean the model re-planned the answer.
- Alts stays between 54 and 55 of 60. Every third candidate in this batch was an accepted package, but each run already had two accepted packages above it, so dropping the third costs no slot.
- Trap stays at 0 of 30. The third candidates were `formik`, `@tanstack/react-form`, `react-final-form` and `valtio`, none of them traps.

### Result, session `eval-615d577-1795638778376`

Same prompt and tools as the batch above, plus the step 4 sentence. Scored the same way. A third package counts when the answer offers it as a choice, including inside another package's bullet. A package the answer explicitly moves to a one-line note does not count.

| Question | Run | Main | Alts | Trap | Trace | Notes |
| -------- | --- | ---- | ---- | ---- | ----- | ----- |
| T | 1 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `react-final-form`, `formik`) | No | `472983a44436ce2d7af06b03c08d02dc` | Three alternatives in the "Final recommendation" bullets. `@hookform/resolvers` named as the companion, not as a pick |
| T | 2 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `formik`) | No | `64f09c627a42fa15c36fd6dc2c88f339` | `react-final-form` moved to a one-line note. `@rc-component/form` called an internal part of Ant Design |
| T | 3 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `formik`) | No | `1eeca3f30433c7ba0c17afb2dbe9e5a8` | `react-final-form` one-line note |
| T | 4 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `formik`) | No | `a0425b694ca4a1dcf7412b35997af622` | `react-final-form` one-line note |
| T | 5 | Yes (`react-hook-form`) | 1 (`@tanstack/react-form`; `@rjsf/core` scores nothing) | No | `05797f28407f8c11419713fc80c5bb01` | `@rjsf/core` offered for JSON-Schema forms. `formik` demoted to a note |
| T | 6 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `formik`) | No | `a491caf6f087f34ad8b96f1a84279bb7` | `react-final-form` called "a related alternative" inside the `formik` bullet, then demoted in a note. `survey-react-ui` named as a different category |
| T | 7 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `react-final-form`) | No | `87e448de223b218213aee48ec1b67421` | `formik` left out for age. `@rc-component/form` named as shipping inside Ant Design |
| T | 8 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `formik`) | No | `cc88495bcdb2cf6f5a50aab98245a424` | `react-final-form` one-line note |
| T | 9 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `formik`) | No | `3a443da7bd604b2d470923883e008177` | `react-final-form` one-line note |
| T | 10 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `formik`) | No | `952cf2debe440f9ab4ec86e7a862fba4` | `react-final-form` one-line note |
| H1 | 1 | Yes (`date-fns`) | 2 (`dayjs`, `luxon`) | No | `24fbf0b5864153ab31af6b9fb237ddbd` | `moment` called legacy |
| H1 | 2 | Yes (`date-fns`) | 2 (`dayjs`, `luxon`) | No | `872bf8a8767b5647138881d901ccecca` | `moment` in maintenance mode. `@js-joda/core` and `temporal-polyfill` in a note |
| H1 | 3 | Yes (`date-fns`) | 2 (`dayjs`, `luxon`) | No | `25432864abe8c57271b1d1fa1dbfc550` | `temporal-polyfill` as "a third option worth one line" |
| H1 | 4 | Yes (`date-fns`) | 2 (`dayjs`, `luxon`) | No | `3d568fbad6fd523716a3065978adb1d2` | `@js-joda/core` as "one line on a fourth option" |
| H1 | 5 | Yes (`date-fns`) | 2 (`dayjs`, `luxon`) | No | `e19b2ef9460d45d58d35d0aea0a5432e` | Polyfills in a one line |
| H1 | 6 | Yes (`date-fns`) | 2 (`dayjs`, `luxon`) | No | `7885fc96263c9d3a94efdd4afeed565f` | `moment` not mentioned |
| H1 | 7 | Yes (`date-fns`) | 2 (`dayjs`, `luxon`) | No | `6434389c195abef9fe0ff471d4a0cc1f` | `moment` maintenance-only |
| H1 | 8 | Yes (`date-fns`) | 2 (`dayjs`, `luxon`) | No | `966121fac03cdd50745aa56afc589790` | `moment` left out for legacy status |
| H1 | 9 | Yes (`date-fns`) | 2 (`dayjs`, `luxon`) | No | `a8c1eabec8dabc05989b2cf34f8d0701` | `moment` maintenance mode. Says `moment` types come from `@types/moment`, which does not exist |
| H1 | 10 | Yes (`date-fns`) | 2 (`dayjs`, `luxon`) | No | `ee6713be3ea7bb00f58a75b58a42a8a8` | `@internationalized/date` one-line note. `moment` left off |
| H2 | 1 | Yes (`undici`) | 2 (`axios`, `got`) | No | `9dd4f6c64f97e5f40e56d0c520d486c4` | "request/response transforms" is prose, not the deprecated package |
| H2 | 2 | Yes (`undici`) | 2 (`axios`, `got`) | No | `f2093663c124108207803caf9535ed5e` |  |
| H2 | 3 | Yes (`undici`) | 2 (`axios`, `got`) | No | `d0dd76753126bf575b8c0205509a5843` | Says "three alternatives is already more than you need" while leaving out `superagent` |
| H2 | 4 | Yes (`undici`) | 2 (`axios`, `got`) | No | `15036d94a44cf2f5942fc7f9fd07aba4` |  |
| H2 | 5 | Yes (`axios`) | 2 (`undici`, `got`) | No | `7f78bf88584858a8ca98243ccb91d4d2` | Only run where `axios` is the pick |
| H2 | 6 | Yes (`undici`) | 2 (`axios`, `got`) | No | `fd06bc92a50494f883208ba52e94019e` |  |
| H2 | 7 | Yes (`undici`) | 2 (`axios`, `got`) | No | `869962005c5587e16dd137503a4c15ed` | `superagent` checked, then left out "rather than listing a fourth candidate" |
| H2 | 8 | Yes (`undici`) | 2 (`axios`, `got`) | No | `b7fcd12fb9d789cf5b5363acdcaf0086` |  |
| H2 | 9 | Yes (`undici`) | 2 (`axios`, `got`) | No | `bc214b56979e4e6922c53f732a51053e` | `superagent` mentioned, not offered |
| H2 | 10 | Yes (`undici`) | 2 (`axios`, `got`) | No | `ae26a7f216ac4a2693916366ff3a9f0c` | `node-fetch` and `superagent` in a one line |
| H3 | 1 | Yes (`zustand`) | 2 (`@reduxjs/toolkit`, `jotai`) | No | `783e9e9456409d122b8eaaace2f6eff6` | `redux` note: may be unmaintained |
| H3 | 2 | Yes (`zustand`) | 2 (`@reduxjs/toolkit`, `jotai`) | No | `6a4fb8e225e757dc8b90d6a0dccc9311` | `nanostores` "worth a look". Says it kept the list to "a top pick plus two" |
| H3 | 3 | Yes (`zustand`) | 1 (`jotai`; `redux` + `react-redux` score nothing) | No | `327295f24bacc81e1789ebfd16822584` | `redux` + `react-redux` listed as one project. `recoil` avoided |
| H3 | 4 | Yes (`zustand`) | 1 (`jotai`; `@tanstack/react-query` scores nothing) | No | `2bba8059dbd2d72f45ac313bbac06522` | Query is server state, a different job |
| H3 | 5 | Yes (`zustand`) | 2 (`@reduxjs/toolkit`, `jotai`) | No | `03665f8e27e51b5f44790640ab9d8512` | `mobx` one-line note |
| H3 | 6 | Yes (`zustand`) | 2 (`@reduxjs/toolkit`, `jotai`) | No | `d8346df740e5f71f9a3b909361e11010` | `nanostores` worth knowing |
| H3 | 7 | Yes (`zustand`) | 2 (`@reduxjs/toolkit`, `jotai`) | No | `0e3321ba053f0a8e984de6ba93fcf1fd` | `valtio` note |
| H3 | 8 | Yes (`zustand`) | 2 (`@reduxjs/toolkit`, `jotai`) | No | `d952725de273ccd09692cd17513c3147` | `recoil` and `redux` steered away |
| H3 | 9 | Yes (`zustand`) | 2 (`@reduxjs/toolkit`, `jotai`) | No | `850cb1f90e3ac2e7e0bbaf51b0a846cc` | `mobx`, `valtio`, `recoil`, `nanostores` in notes |
| H3 | 10 | Yes (`zustand`) | 2 (`@reduxjs/toolkit`, `jotai`) | No | `81b71d5395163f8960cdcc5e81e78c6f` | `redux` and `mobx` called not alternatives |

|                          | Main         | Alts         | Trap        | Three or more alts |
| ------------------------ | ------------ | ------------ | ----------- | ------------------ |
| T, forms                 | 10 of 10     | 19 of 20     | 0 of 10     | 2 of 10            |
| H1, dates                | 10 of 10     | 20 of 20     | 0 of 10     | 0 of 10            |
| H2, HTTP                 | 10 of 10     | 20 of 20     | 0 of 10     | 0 of 10            |
| H3, state                | 10 of 10     | 18 of 20     | 0 of 10     | 0 of 10            |
| **Holdout**              | **30 of 30** | **58 of 60** | **0 of 30** | **2 of 40**        |
| **Before it** (71764d0)  | **30 of 30** | **55 of 60** | **0 of 30** | **4 of 40**        |

| Prediction                                     | Held?                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| Three or more alternatives drop to 0 of 40     | No. 2 left, T 1 and T 6. The prediction itself said one or two left means the wording isn't doing the work |
| Main stays at 30 of 30                         | Yes                                                                       |
| Alts stays between 54 and 55 of 60             | No. 58. It went up, not down                                              |
| Trap stays at 0 of 30                          | Yes                                                                       |

Both leftovers put their third package somewhere the sentence doesn't reach. T 1 has no alternatives heading at all: it writes "Final recommendation" and then four bullets, one main and three alternatives. T 6 keeps two bullets and puts `react-final-form` inside the `formik` bullet as "a related alternative", then demotes it in a note. A sentence about the alternatives list can't stop either shape, because neither is a list of three.

Alts gained 3 slots. H1 went 18 to 20: runs 1 and 6 now offer `dayjs` and `luxon` where they used to offer one. H3 went 17 to 18: run 1 added `@reduxjs/toolkit` next to `jotai`. The sentence says where a third candidate goes, and the model took that as license to fill both alternative slots rather than staying short.

The six empty holdout slots go to `@rjsf/core`, `redux` + `react-redux`, and `@tanstack/react-query`. `@rjsf/core` is a real form library for JSON-Schema forms, so that one is a key gap rather than a bad pick. The other two are packages the key marks Neither on purpose.

No trap fire. `moment` appears in 9 of 10 H1 runs and gets a warning each time; the tenth leaves it out. `recoil` appears in 3 H3 runs, all under "avoid". `@rc-component/form` appears in T 2 and T 7, both times described as shipping inside Ant Design. T 1 recommends `@hookform/resolvers` as the schema-validation companion to `react-hook-form`. I scored that No because the answer offers it as a companion, not as a form-library pick, which is how the earlier batches treated it. Atharv settled that on 2026-11-26: a package named as a companion or adjunct to the main pick is not a trap, even when it is on the trap list. Only an offer as a main pick or alternative counts. That also covers `@rc-component/form` described as shipping inside Ant Design.

One wrong claim outside the counted numbers: H1 run 9 says `moment`'s TypeScript types come from `@types/moment`. That package does not exist. The tables under each answer match the tool data.

## Layout fix

Both leftovers came from layout, not count. T 1 wrote "Final recommendation" and four bullets, one main and three alternatives, with no alternatives heading. T 6 kept two bullets and put `react-final-form` inside the `formik` bullet as "a related alternative". Step 4 now states the count for any layout and sends extra packages out of the list:

> Recommend one package and at most two alternatives, whatever the layout: a list holds one main pick and never more than three packages in it. Any other package goes in a separate one-line note, out of the list, never inside a pick's bullet.

### Predictions, written before running it

- Three or more packages offered as picks drops from 2 of 40 to 0 of 40. Each leftover shape gets a clause: the list total covers T 1, the bullet rule covers T 6.
- Main stays at 30 of 30. The line changes layout, not choice.
- Alts stays at 58 of 60, no lower than 57. Every third package in this batch was accepted and sat above two accepted ones, so removing it costs no slot. A drop below 57 means the line is shortening answers.
- Trap stays at 0 of 30.

### Result, session `eval-885aec5-1795639430161`

| Question | Run | Main | Alts | Trap | Trace | Notes |
| -------- | --- | ---- | ---- | ---- | ----- | ----- |
| T | 1 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `formik`) | No | `ae8b8703cd4ac9d99be5573081f2c559` | "Picks" list holds one main and two alternatives. Resolvers named as the companion |
| T | 2 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `react-final-form`, `formik`) | No | `7a1ffe7a01c4a1a39eab15dada118a1b` | "Recommendation" list holds four packages, three alternatives. `@rc-component/form` called an internal Ant Design package |
| T | 3 | Yes (`react-hook-form`) | 1 (`@tanstack/react-form`; `@rjsf/core` scores nothing) | No | `1ac50b8c5c81127d159acda8bf8eadfc` | `formik` and `rc-field-form` called "not a pick" |
| T | 4 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `formik`) | No | `669e3a04bc221a39a9010458fed8491c` | `react-final-form` in a note line |
| T | 5 | Yes (`react-hook-form`) | 2 (`formik`, `react-final-form`) | No | `e8e2afb113b92dea6a33b67f3d7657d1` | 3-package list. `survey-react-ui` in a note as a JSON-survey option |
| T | 6 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `react-final-form`) | No | `0c00ee8434d5df92946620d783d3f7c8` | `formik` note |
| T | 7 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `formik`) | No | `64ddbb254d33c357ae40f56bb03f4021` | `final-form`/`react-final-form` and resolvers in a note |
| T | 8 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `react-final-form`) | No | `eec082874616ca8f3102aba580347649` | 3-package list. `formik` note |
| T | 9 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `react-final-form`) | No | `f85a4e142454f3fa4672e83cd33f6965` | 3-package list. `formik` note |
| T | 10 | Yes (`react-hook-form`) | 2 (`@tanstack/react-form`, `formik`) | No | `311dda43dba963eeeba99b7e08504a4d` | "Recommendation" list holds four packages, three alternatives. Wrote `formik`'s "12 months ago" |
| H1 | 1 | Yes (`date-fns`) | 1 (`dayjs`; `@js-joda/core` scores nothing) | No | `ea4f64d76d28b87f2a7c4e4c2ed4fcd3` | 3-package list. `luxon` moved to a note |
| H1 | 2 | Yes (`date-fns`) | 2 (`dayjs`, `luxon`) | No | `2bd3cfa3ca2ce825041223726dbcd189` | 3-package list. `moment` note |
| H1 | 3 | Yes (`date-fns`) | 2 (`dayjs`, `@js-temporal/polyfill`) | No | `b4bffdfaac5c5ac59bfa7be7922c8faa` | `luxon` offered inside the polyfill bullet ("also sits here"), so three alternatives |
| H1 | 4 | Yes (`date-fns`) | 1 (`dayjs`; `@js-joda/core` scores nothing) | No | `319c1ac82bd1fb956e8c75e9f3ee695d` | "Top 4 picks" list, then a main pick plus two. `luxon` in a note |
| H1 | 5 | Yes (`date-fns`) | 2 (`dayjs`, `luxon`) | No | `a085b73bd2777dd97d656b1651b86eb0` | 3-package list. `moment` one-line note |
| H1 | 6 | Yes (`date-fns`) | 1 (`dayjs`; `@internationalized/date` scores nothing) | No | `bc7a1a83329a2153cfe9eac4f9c39b46` | `luxon` one note |
| H1 | 7 | Yes (`date-fns`) | 2 (`dayjs`, `luxon`) | No | `5bed67c19f218a4d0520167cf4a5cede` | 3-package list. `moment` and `temporal-polyfill` notes |
| H1 | 8 | Yes (`date-fns`) | 1 (`dayjs`; `@js-joda/core` scores nothing) | No | `850383d87a81fce422236796496821bf` | `luxon` flagged in prose. `fecha` and `moment` notes |
| H1 | 9 | Yes (`date-fns`) | 1 (`dayjs`; `@internationalized/date` scores nothing) | No | `516e4dc81945f8f9b3de93030894da77` | `temporal-polyfill` note. `luxon` avoided in prose |
| H1 | 10 | Yes (`date-fns`) | 2 (`dayjs`, `luxon`) | No | `92b37b3685825726083153cbec11570d` | 3-package list. `moment` note |
| H2 | 1 | Yes (`undici`) | 2 (`axios`, `got`) | No | `89a0570e4321020ef853a085e6d0c9fa` | 3-package list. `node-fetch` and `superagent` outside it |
| H2 | 2 | Yes (`undici`) | 2 (`axios`, `got`) | No | `ab237bee748e939e6da3302727e1c929` | Looked up `request`, never named it |
| H2 | 3 | Yes (`undici`) | 2 (`axios`, `got`) | No | `f5de8e8cc229d494787be79822aab319` | `request` called deprecated in a note |
| H2 | 4 | Yes (`undici`) | 2 (`got`, `axios`) | No | `b76b9a59e44dddf8ceaab93d7f491915` |  |
| H2 | 5 | Yes (`undici`) | 2 (`axios`, `got`) | No | `6f6c2fcca6caf0c1b77de2ff2fedd9c1` | 3-package list. Wrote `node-fetch`'s "40 months ago" |
| H2 | 6 | Yes (`undici`) | 2 (`axios`, `got`) | No | `57d68392f94962ce6361027a591bb500` | `superagent` mentioned, not offered |
| H2 | 7 | Yes (`undici`) | 2 (`axios`, `got`) | No | `98467cdb752c66a4cb55b21786eeb261` | "Recommended" list holds three. `superagent` and `node-fetch` "also considered" |
| H2 | 8 | Yes (`undici`) | 2 (`axios`, `got`) | No | `ff1e9419d0ee2bf23a90bed2fc6060c6` | `superagent` worth a look in a line |
| H2 | 9 | Yes (`undici`) | 2 (`axios`, `got`) | No | `b75f6fd361fd66b1eafea87ff4def0b8` | 3-package list |
| H2 | 10 | Yes (`undici`) | 2 (`axios`, `got`) | No | `63372c8edfdaa6cac7a41469fe0a4b95` |  |
| H3 | 1 | Yes (`zustand`) | 1 (`jotai`; `nanostores` scores nothing) | No | `928b17193dc45920a5d0db0090f2af0e` | 3-package list. `react-redux` note |
| H3 | 2 | Yes (`zustand`) | 2 (`@reduxjs/toolkit`, `jotai`) | No | `32245c5ed4dd70f77e8901470df3ab38` | `mobx` called a viable pick and `recoil` "an option but may be unmaintained", both in notes |
| H3 | 3 | Yes (`zustand`) | 2 (`jotai`, `mobx`) | No | `9e3c1cfc9a8225204bfcef603efbdca5` | `redux` and `react-redux` notes |
| H3 | 4 | Yes (`zustand`) | 1 (`jotai`; `redux` scores nothing) | No | `8e6157e9e1132e168ffa4d82e2e77a57` | 3-package list. `recoil` left off |
| H3 | 5 | Yes (`zustand`) | 2 (`@reduxjs/toolkit`, `jotai`) | No | `c7e325c435ec2bdb658d45f1911b40bf` | The `jotai` bullet adds `valtio` and `mobx` ("may be followed by"), so five packages offered |
| H3 | 6 | Yes (`zustand`) | 2 (`@reduxjs/toolkit`, `jotai`) | No | `07d4bac4a5b98309e47b696d65e14c31` | 3-package list. `recoil` and `nanostores` notes |
| H3 | 7 | Yes (`zustand`) | 2 (`@reduxjs/toolkit`, `jotai`) | No | `4e247ff0e4cece5646ff185fe5243916` | `valtio` and `@tanstack/react-store` called reasonable in a line |
| H3 | 8 | Yes (`zustand`) | 2 (`@reduxjs/toolkit`, `jotai`) | No | `098eaf1019fbf7c58329650229e72a81` | `mobx` and `nanostores` worth a look |
| H3 | 9 | Yes (`zustand`) | 2 (`@reduxjs/toolkit`, `jotai`) | No | `5eb2dca03bc5c3b9b700c3ace33e34af` | 3-package list. `valtio` and `mobx` notes |
| H3 | 10 | Yes (`zustand`) | 2 (`@reduxjs/toolkit`, `jotai`) | No | `dd8ab1c87a9f7f28dc8609821341eb1d` | 3-package list. `mobx` and `valtio` note |

|                          | Main         | Alts         | Trap        | Three or more alts |
| ------------------------ | ------------ | ------------ | ----------- | ------------------ |
| T, forms                 | 10 of 10     | 19 of 20     | 0 of 10     | 2 of 10            |
| H1, dates                | 10 of 10     | 15 of 20     | 0 of 10     | 1 of 10            |
| H2, HTTP                 | 10 of 10     | 20 of 20     | 0 of 10     | 0 of 10            |
| H3, state                | 10 of 10     | 18 of 20     | 0 of 10     | 1 of 10            |
| **Holdout**              | **30 of 30** | **53 of 60** | **0 of 30** | **4 of 40**        |
| **Before it** (6c6b554)  | **30 of 30** | **58 of 60** | **0 of 30** | **2 of 40**        |

| Prediction                                     | Held?                                                         |
| ---------------------------------------------- | ------------------------------------------------------------- |
| Three or more alternatives drop to 0 of 40     | No. 4, the same count as before the previous fix              |
| Main stays at 30 of 30                         | Yes                                                           |
| Alts stays at 58, no lower than 57             | No. 53, five below the floor                                  |
| Trap stays at 0 of 30                          | Yes                                                           |

The fix moved the problem instead of removing it. Two answers ignore the list cap outright: T 2 and T 10 each write "Recommendation" followed by four bullets, one main and three alternatives. Two more use the shape the previous wording also allowed: H1 3 offers `luxon` inside the `@js-temporal/polyfill` bullet, and H3 5 offers `valtio` and `mobx` inside the `jotai` bullet. That is T 6 again, one word changed.

Alts lost 5 slots, all in H1. Runs 1, 4, 6, 8 and 9 now fill the second alternative with `@js-joda/core` or `@internationalized/date`, both marked Neither, where they used to name `luxon`. The cap did not shorten those answers, which still name three packages. It changed the third package from an accepted one to an off-key one. The "Top 4 picks" preamble in H1 4 shows the pressure: it names four, then trims the recommendation to three, and `luxon` is what falls out.

Two runs also break the "never write month counts" rule: T 10 writes `formik`'s "12 months ago" and H2 5 writes `node-fetch`'s "40 months ago". Both match the appended table, so the numbers are right, but the instruction says to leave them out. This is the first batch where either fix leaked a count into prose.

Recommendation: revert `885aec5`. The `615d577` wording scores 58 of 60 with 2 of 40; this one scores 53 with 4. On this evidence the tighter list cap costs four accepted alternatives and buys nothing. Reverted in the next commit: step 4 is back at the `615d577` wording.

