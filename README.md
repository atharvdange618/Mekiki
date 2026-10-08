# Mekiki

Mekiki (目利き) means a trained eye for quality. It's a small AI agent that recommends npm packages. Ask it which library to use, and it looks up real registry data before answering with one pick and up to two alternatives.

It's a practice project, built to learn how agents work before [neatHack](https://neatlogs.com/hackathon). The whole agent fits in one file of about 250 lines: a tool calling loop, two tools, and tracing with [neatlogs](https://neatlogs.com).

```
$ npm start -- "best React form library?"

[step 1] get_package_info({"name": "formik"})
[step 1] get_package_info({"name": "react-hook-form"})
[step 1] get_package_info({"name": "redux-form"})
[step 1] get_package_info({"name": "@tanstack/react-form"})
[step 1] search_packages({"query": "react form library"})

### Recommendation:
**Primary:** **React Hook Form** ...
**Alternatives:**
- **Formik** ...
- **@tanstack/react-form** ...

(answer shortened; the real one lists downloads and publish dates for each)
```

## What you need

- **Node 22 or later.** The `openai` package needs it. Check with `node -v`.
- **An OpenAI API key** from [platform.openai.com](https://platform.openai.com/api-keys). A run costs about $0.0006 with `gpt-4o-mini`, so a hundred runs cost less than ten cents.
- **A neatlogs account**, free at [app.neatlogs.com](https://app.neatlogs.com). This is where you'll see what the agent did on each run.

## Setup

1. Clone the repo and install:

   ```bash
   git clone https://github.com/atharvdange618/Mekiki.git
   cd Mekiki
   npm install
   ```

2. Copy the example env file:

   ```bash
   cp .env.example .env
   ```

3. Fill in `.env`:

   | Variable           | Where to get it                                                                                                |
   | ------------------ | -------------------------------------------------------------------------------------------------------------- |
   | `OPENAI_API_KEY`   | OpenAI dashboard, API keys                                                                                     |
   | `OPENAI_MODEL`     | Any chat model on your account. We used `gpt-4o-mini`, which is cheap and fails often enough to be interesting |
   | `NEATLOGS_API_KEY` | neatlogs dashboard, **Settings → API Keys**                                                                    |

   `.env` is in `.gitignore`. Never commit it, and never paste keys into chat.

4. Check that everything typechecks:

   ```bash
   npm run typecheck
   ```

## Run it

```bash
npm start
npm start -- "which HTTP client should I use in Node?"
```

With no question, it asks about date libraries. Each run prints the tool calls it makes as `[step N]` lines, then the answer. The last line, `[neatlogs] Neatlogs SDK shutdown complete`, means the trace was sent.

This works the same in Git Bash on Windows, macOS and Linux.

## See the trace

Open [app.neatlogs.com](https://app.neatlogs.com) and find the newest trace in the `npm-advisor` workflow. Each run is one trace:

```
WORKFLOW advise
└─ AGENT npm_advisor
   ├─ LLM            one per model turn, with tokens and cost
   ├─ TOOL search_packages
   └─ TOOL get_package_info
```

Click any `TOOL` span to see exactly what data the model got. Most of what we learned building this came from reading those spans, not the final answer.

## How it works

The agent is a loop. It sends the conversation and two tool descriptions to the model. If the model asks for tools, the loop runs them in parallel, adds the results to the conversation, and asks again. When the model answers without asking for a tool, that's the final answer.

| Tool               | What it does                                                                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `search_packages`  | Searches npm, returns the 8 most downloaded of 25 matches                                                        |
| `get_package_info` | Looks up one package: version, last publish date, months since then, license, repository, downloads, deprecation |

The system prompt tells the model to name the packages it already knows for the job, check them with `get_package_info`, and search for anything it missed. Its memory knows what developers choose. The tools know what's current.

[`architecture.md`](architecture.md) has the full picture.

## Things to try

Each of these teaches something we ran into for real.

1. **Read a trace end to end.** Run the form question and open its trace. Find the moment the model chose its alternatives, and look at what the tool spans handed it.
2. **Run the same question five times.** The answers change. One run proves nothing, which is why every fix here was measured over several.
3. **Score the holdout questions.** [`evals.md`](evals.md) has three questions with answer keys written before any run. Run them, score them, and compare with our results.
4. **Take on the open problem.** The last fix made main picks perfect but broke the alternatives. [`decisions.md`](decisions.md) explains the three causes. Try a prompt change, then measure it on questions you didn't tune on.
5. **Break it.** If npm returns an error, the agent crashes instead of telling the model. Turn off your network mid-run and find the crash in neatlogs. Then make the tool return the error to the model and see whether it recovers.
6. **Swap the model.** Change `OPENAI_MODEL` and rerun the holdout. Does a bigger model still trust a 2023 package?

## Agent sessions with Entire

We write much of this repo with AI coding agents, so the reasoning behind a change often lives in a chat that no one else sees. [Entire](https://docs.entire.io/overview) saves that chat. When you commit, it records the agent session behind the commit (your prompts, the agent's replies, the files it touched) as a checkpoint and links it to that commit.

Here's why that matters for this project. `decisions.md` tells you what we changed and why, in our own words. A checkpoint shows the session where it happened, so when someone asks why a prompt line exists, you can read the conversation that produced it instead of guessing.

Checkpoints live in git refs under `refs/entire/checkpoints/`, apart from your branches, so they never show up in `git log` or in a PR diff. Entire pushes them to `origin` along with your normal pushes.

### What's in the repo

| File                          | What it does                                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `.entire/settings.json`       | Turns Entire on for this repo and stores checkpoints as git refs                                                |
| `.entire/.gitignore`          | Keeps local logs, temp files and per machine settings out of git                                                |
| `.claude/settings.json`       | Claude Code hooks. They tell Entire when a session starts and ends, when you send a prompt, and when the agent stops |
| `.opencode/plugins/entire.ts` | The same hooks for OpenCode. `entire enable --agent opencode` generates it, so don't edit it by hand            |
| `.agents/hooks.json`          | The same hooks for Antigravity                                                                                  |

Each hook checks for the `entire` command first and exits quietly if it can't find it. If you don't install Entire, your agents work as before and nothing gets recorded. Claude Code will print a one line note at session start with a link to the install guide.

### Setup

1. Install the CLI with the [install guide](https://docs.entire.io/cli/installation#installation-methods).
2. From the repo root, run:

   ```bash
   entire enable
   ```

   The agent hooks are already committed, but the git hooks that link sessions to commits live in `.git/hooks`, which git never shares. This step installs them on your machine.

3. Check that it worked:

   ```bash
   entire status
   ```

   You should see `Enabled`, the three agents (Antigravity, Claude Code, OpenCode), and `Checkpoints sync to: origin`.

### Using it

| Command                          | What it does                                    |
| -------------------------------- | ----------------------------------------------- |
| `entire status`                  | Shows whether Entire is on and any live sessions |
| `entire checkpoint list`         | Lists checkpoints on the current branch          |
| `entire checkpoint explain <sha>` | Shows the session behind a commit               |
| `entire search "query"`          | Searches checkpoints, commits and sessions       |

## Project docs

| File                                 | What's in it                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| [`architecture.md`](architecture.md) | How the agent works, its tools, tracing, and known gaps                              |
| [`decisions.md`](decisions.md)       | Every change, why we made it, what we rejected, and the numbers before and after     |
| [`evals.md`](evals.md)               | Test questions, answer keys, scored results, and predictions written before each run |

## Scripts

| Command             | What it does                                                   |
| ------------------- | -------------------------------------------------------------- |
| `npm start`         | Runs the agent. Add `-- "your question"` to ask something else |
| `npm run typecheck` | Runs `tsc --noEmit`                                            |
