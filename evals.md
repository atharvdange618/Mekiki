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
