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

| Run | Main   | Alts     | Trap   | Notes                                                |
| --- | ------ | -------- | ------ | ---------------------------------------------------- |
| 1-5 | 5 of 5 | 10 of 10 | 0 of 5 | One run listed `@hookform/resolvers` as "also found" |

### Holdout set

| Question | Run | Main | Alts | Trap | Trace | Notes |
| -------- | --- | ---- | ---- | ---- | ----- | ----- |
| H1       | 1   |      |      |      |       |       |
| H1       | 2   |      |      |      |       |       |
| H1       | 3   |      |      |      |       |       |
| H2       | 1   |      |      |      |       |       |
| H2       | 2   |      |      |      |       |       |
| H2       | 3   |      |      |      |       |       |
| H3       | 1   |      |      |      |       |       |
| H3       | 2   |      |      |      |       |       |
| H3       | 3   |      |      |      |       |       |
