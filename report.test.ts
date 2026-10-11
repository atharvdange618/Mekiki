import { describe, expect, it } from "vitest";
import {
  appendFacts,
  mentionedPackages,
  type PackageFacts,
  resultsTable,
} from "./report.js";

describe("mentionedPackages", () => {
  it("finds names in bold, italics, code and link text, in any case", () => {
    const text =
      "Main pick: **date-fns**. Also `Luxon`, *dayjs* and [ky](https://github.com/sindresorhus/ky).";
    expect(
      mentionedPackages(text, ["date-fns", "luxon", "dayjs", "ky"]),
    ).toEqual(["date-fns", "luxon", "dayjs", "ky"]);
  });

  it("allows a .js suffix or trailing colon inside the formatting", () => {
    const text = "- **Moment.js** is legacy.\n- **Formik:** still popular.";
    expect(mentionedPackages(text, ["moment", "formik"])).toEqual([
      "moment",
      "formik",
    ]);
  });

  it("ignores names used as plain English words", () => {
    const text = "A powerful HTTP request library. I got it working.";
    expect(mentionedPackages(text, ["request", "got"])).toEqual([]);
  });

  it("ignores longer names that contain the name", () => {
    const text = "Use **moment-timezone** with `@tanstack/react-form-devtools`.";
    expect(
      mentionedPackages(text, ["moment", "@tanstack/react-form", "react-form"]),
    ).toEqual([]);
  });

  it("ignores the name inside a repository URL", () => {
    const text = "[Repository](https://github.com/moment/moment)";
    expect(mentionedPackages(text, ["moment"])).toEqual([]);
  });

  it("does not count redux inside @reduxjs/toolkit or react-redux", () => {
    expect(
      mentionedPackages("Use **@reduxjs/toolkit** and `react-redux`.", ["redux"]),
    ).toEqual([]);
  });

  it("matches scoped names with regex characters in them", () => {
    expect(
      mentionedPackages("Try `@js-temporal/polyfill`.", ["@js-temporal/polyfill"]),
    ).toEqual(["@js-temporal/polyfill"]);
  });
});

describe("resultsTable", () => {
  it("writes one row per run with scoring cells left blank", () => {
    const table = resultsTable([
      { caseId: "H1", run: 1, traceId: "abc", trapsMentioned: ["moment"] },
      { caseId: "H2", run: 2, traceId: "def", trapsMentioned: [] },
    ]);
    expect(table.split("\n")).toEqual([
      "| Question | Run | Main | Alts | Trap | Trace | Notes |",
      "| -------- | --- | ---- | ---- | ---- | ----- | ----- |",
      "| H1 | 1 | | | | `abc` | Mentions trap: `moment` |",
      "| H2 | 2 | | | | `def` |  |",
    ]);
  });

  it("puts the error in Notes for a crashed run", () => {
    const table = resultsTable([
      {
        caseId: "H2",
        run: 1,
        traceId: "abc",
        trapsMentioned: [],
        error: "npm search failed with status 429",
      },
    ]);
    expect(table.split("\n")[2]).toBe(
      "| H2 | 1 | | | | `abc` | Crashed: npm search failed with status 429 |",
    );
  });
});

describe("appendFacts", () => {
  const fecha: PackageFacts = {
    name: "fecha",
    weeklyDownloads: 26043349,
    lastPublished: "2022-04-15T22:08:38.783Z",
    monthsSinceLastPublish: 53,
  };
  const luxon: PackageFacts = {
    name: "luxon",
    weeklyDownloads: 42059281,
    lastPublished: "2025-09-05T10:14:55.814Z",
    monthsSinceLastPublish: 13,
  };

  it("adds a row only for checked packages the answer names", () => {
    const out = appendFacts("Use **fecha**.", [luxon, fecha]);
    expect(out).toBe(
      [
        "Use **fecha**.",
        "",
        "Registry data:",
        "",
        "| Package | Weekly downloads | Last published | Months since |",
        "| ------- | ---------------- | -------------- | ------------ |",
        "| fecha | 26,043,349 | 2022-04-15 | 53 |",
      ].join("\n"),
    );
  });

  it("writes unknown for missing data", () => {
    const out = appendFacts("Use **luxon**.", [
      { name: "luxon", weeklyDownloads: null, lastPublished: null, monthsSinceLastPublish: null },
    ]);
    expect(out.split("\n").at(-1)).toBe("| luxon | unknown | unknown | unknown |");
  });

  it("returns the answer unchanged when it names no checked package", () => {
    expect(appendFacts("Use the built-in fetch.", [luxon])).toBe(
      "Use the built-in fetch.",
    );
  });
});
