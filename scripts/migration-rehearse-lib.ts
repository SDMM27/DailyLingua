/** Pure helpers of migration:rehearse (tested in migration-rehearse-lib.test.ts). */

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
// libpq reads these even when a URL is given: PGHOSTADDR bypasses the host name, PGSERVICE/PGSERVICEFILE can
// carry a host, and a URL with `?host=` or `?hostaddr=` overrides the authority part.
const REDIRECT_VARIABLES = ["PGHOSTADDR", "PGSERVICE", "PGSERVICEFILE"];
const REDIRECT_PARAMS = ["host", "hostaddr", "service"];

export type RehearsalCheck = { name: string; ok: boolean; detail: string };

/** Returns why the URL is refused, or null when it points to a local database. */
export function checkLocalDatabaseUrl(url: string, env: Record<string, string | undefined>): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "l'URL de la base n'est pas valide.";
  }
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") return "l'URL doit commencer par postgresql://.";
  if (!LOCAL_HOSTS.has(parsed.hostname)) {
    return `migration:rehearse ne s'exécute que sur une base locale (127.0.0.1, localhost), pas sur « ${parsed.hostname || "?"} ».`;
  }
  const param = REDIRECT_PARAMS.find((name) => parsed.searchParams.has(name));
  if (param) return `le paramètre « ${param} » de l'URL est interdit.`;
  const variable = REDIRECT_VARIABLES.find((name) => env[name]);
  if (variable) return `la variable ${variable} est définie ; retirez-la.`;
  return null;
}

/** Reads the `check|ok|detail` lines printed by migration-rehearse.sql. */
export function parseRehearsalOutput(stdout: string): RehearsalCheck[] {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.match(/^([^|]+)\|(ok|FAIL)\|(.*)$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map(([, name, status, detail]) => ({ name, ok: status === "ok", detail }));
}

export function formatRehearsalReport(checks: RehearsalCheck[], meta: { apply: boolean; host: string; at: Date }): string {
  const verdict = checks.length > 0 && checks.every((check) => check.ok) ? "VERT" : "ROUGE";
  const lines = [
    `# Répétition de la migration — ${verdict}`,
    "",
    `- Date : ${meta.at.toISOString()}`,
    `- Base : ${meta.host}`,
    `- Mode : ${meta.apply ? "appliqué (transaction validée)" : "à blanc (transaction annulée)"}`,
    "",
    "| Contrôle | Résultat | Détail |",
    "|---|---|---|",
    ...checks.map((check) => `| ${check.name} | ${check.ok ? "ok" : "**ÉCHEC**"} | ${check.detail.replaceAll("|", "\\|")} |`),
  ];
  if (checks.length === 0) lines.push("| (aucun contrôle lu) | **ÉCHEC** | sortie de psql illisible |");
  return `${lines.join("\n")}\n`;
}
