import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The server and the shared layer must not contain display copy.
 *
 * Two bugs motivated this. `meta.scenarios` returned Chinese `title`/`summary`
 * fields, and `recommend.byScenario` returned finished Chinese caveat
 * sentences. Both rendered Chinese text inside an English UI, and both survived
 * a full i18n pass because the client-side scanner never sees strings that live
 * in server files. Worse, tRPC responses are cached, so switching language did
 * not even refresh them.
 *
 * The rule that makes this class of bug structurally impossible: the server
 * emits enum keys and codes; all human-facing prose lives in the i18n packs.
 * This test enforces it by scanning string literals for CJK characters.
 * Comments may be in any language — they never reach a user.
 */

const CJK = /[\u4e00-\u9fff]/;

/** Strip comments so Chinese explanations in them do not trip the scan. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function tsFilesIn(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "_core" || entry.name === "node_modules") continue;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) out.push(...tsFilesIn(full));
    else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

describe("server and shared layers carry no display copy", () => {
  it("has no Chinese string literals in server/ or shared/", () => {
    const files = [
      ...tsFilesIn(resolve(__dirname)),
      ...tsFilesIn(resolve(__dirname, "..", "shared")),
    ];

    const offenders: string[] = [];
    for (const file of files) {
      const src = stripComments(readFileSync(file, "utf8"));
      src.split("\n").forEach((line, i) => {
        if (CJK.test(line)) offenders.push(`${file.split("/").slice(-2).join("/")}:${i + 1} ${line.trim()}`);
      });
    }

    expect(
      offenders,
      `display copy found in the server/shared layer — emit keys or codes instead:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("emits every caveat code that the dictionaries can render, and no others", async () => {
    /* A code with no dictionary entry renders blank; a dictionary entry with no
       emitter is dead weight. Both drift silently, so pin them to each other. */
    const { en } = await import("../client/src/i18n/en");
    const routers = readFileSync(resolve(__dirname, "routers.ts"), "utf8");

    for (const code of Object.keys(en.caveat)) {
      expect(routers.includes(`"${code}"`), `caveat "${code}" is never emitted by the server`).toBe(true);
    }

    const emitted = Array.from(routers.matchAll(/caveats\.push\("([a-z_]+)"\)/g)).map(m => m[1]);
    expect(emitted.length).toBeGreaterThan(0);
    for (const code of emitted) {
      expect(Object.keys(en.caveat), `emitted caveat "${code}" has no dictionary entry`).toContain(code);
    }
  });
});
