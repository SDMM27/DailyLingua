import { describe, expect, it } from "vitest";
import { checkLocalDatabaseUrl, formatRehearsalReport, parseRehearsalOutput } from "./migration-rehearse-lib.js";

describe("checkLocalDatabaseUrl", () => {
  it("accepts the local stack", () => {
    expect(checkLocalDatabaseUrl("postgresql://postgres:postgres@127.0.0.1:54322/postgres", {})).toBeNull();
    expect(checkLocalDatabaseUrl("postgres://u:p@localhost:5432/db", {})).toBeNull();
  });

  it("refuses a hosted project and redirections", () => {
    expect(checkLocalDatabaseUrl("postgresql://postgres:x@db.abcd.supabase.co:5432/postgres", {})).toMatch(/base locale/);
    expect(checkLocalDatabaseUrl("postgresql://u:p@127.0.0.1:5432/db?host=db.abcd.supabase.co", {})).toMatch(/host/);
    expect(checkLocalDatabaseUrl("postgresql://u:p@127.0.0.1:5432/db?hostaddr=1.2.3.4", {})).toMatch(/hostaddr/);
    expect(checkLocalDatabaseUrl("postgresql://u:p@127.0.0.1:5432/db", { PGHOSTADDR: "1.2.3.4" })).toMatch(/PGHOSTADDR/);
    expect(checkLocalDatabaseUrl("postgresql://u:p@127.0.0.1:5432/db", { PGSERVICE: "prod" })).toMatch(/PGSERVICE/);
    expect(checkLocalDatabaseUrl("https://127.0.0.1/db", {})).toMatch(/postgresql/);
    expect(checkLocalDatabaseUrl("not a url", {})).toMatch(/valide/);
  });
});

describe("rehearsal output", () => {
  const stdout = "pass 1: migrate_all|ok|{\"users\": 1}\r\nnoise\npublic untouched|FAIL|public.profiles\n";

  it("parses the check lines only", () => {
    expect(parseRehearsalOutput(stdout)).toEqual([
      { name: "pass 1: migrate_all", ok: true, detail: "{\"users\": 1}" },
      { name: "public untouched", ok: false, detail: "public.profiles" },
    ]);
  });

  it("is red when a check fails or nothing was read", () => {
    const meta = { apply: false, host: "127.0.0.1:54322", at: new Date("2026-11-28T10:00:00Z") };
    expect(formatRehearsalReport(parseRehearsalOutput(stdout), meta)).toMatch(/— ROUGE/);
    expect(formatRehearsalReport([], meta)).toMatch(/ROUGE[\s\S]*illisible/);
    expect(formatRehearsalReport([{ name: "a", ok: true, detail: "x|y" }], meta)).toMatch(/— VERT[\s\S]*à blanc[\s\S]*x\\\|y/);
  });
});
