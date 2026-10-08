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

Questions the agent was never tuned on. Run each 3 times.

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
