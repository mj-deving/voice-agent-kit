// Repo-Hygiene: keine privaten Spuren, keine Fremd-Importe im Server,
// keine On-demand-Runner, kein bezahlter Aufruf ohne Kostendeckel.
import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const SELBST = "test/hygiene.test.ts";
const dateien = Bun.spawnSync(["git", "ls-files", "-co", "--exclude-standard"], { cwd: ROOT })
  .stdout.toString().split("\n").filter(Boolean).filter((f) => existsSync(join(ROOT, f)));
const lies = (f: string) => readFileSync(join(ROOT, f), "utf8");

// Generische Muster gelten für jeden. Die Sperrliste mit Namen liegt bewusst
// außerhalb des Repos, damit das Repo die Namen nicht selbst enthält.
const GENERISCH = [/\/Users\//, /\.claude\b/, /LIFEOS/, /\.beads\b/, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i];
const sperrDatei = process.env.VOICE_KIT_SPERRLISTE ?? join(homedir(), ".config/voice-agent-kit/sperrliste.txt");
const sperrWorte = existsSync(sperrDatei)
  ? readFileSync(sperrDatei, "utf8").split("\n").map((z) => z.trim().toLowerCase()).filter(Boolean)
  : [];

export const treffer = (text: string, worte: string[]) => {
  const klein = text.toLowerCase();
  return [...worte.filter((w) => klein.includes(w)), ...GENERISCH.filter((r) => r.test(text)).map(String)];
};

test("sperrliste: keine privaten Namen, Pfade oder IDs im Repo", () => {
  if (!sperrWorte.length) console.warn(`Sperrliste ${sperrDatei} fehlt, nur generische Muster geprüft`);
  expect(dateien.length).toBeGreaterThan(10);
  const funde = dateien.filter((f) => f !== SELBST).flatMap((f) => treffer(f + "\n" + lies(f), sperrWorte).map((t) => `${f}: ${t}`));
  expect(funde).toEqual([]);
  // gegenprobe: ein eingeschleuster Pfad würde gefunden
  expect(treffer("siehe /Users/someone/x", [])).not.toEqual([]);
});

// Erlaubt im Server: eigene Dateien und node:-Module.
export const fremdImporte = (src: string) =>
  [...src.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map((m) => m[1]).filter((p) => !p.startsWith("./") && !p.startsWith("node:"));

test("G30 Server-Code importiert nur eigene Dateien und node:-Module", () => {
  const src = dateien.filter((f) => f.startsWith("agent/src/") && f.endsWith(".ts"));
  expect(src.length).toBeGreaterThan(3);
  for (const f of src) expect(fremdImporte(lies(f)), f).toEqual([]);
  // gegenprobe: Import aus einem Nachbarordner oder Paket fällt auf
  expect(fremdImporte('import { x } from "../../scripts/y";\nimport z from "lodash";')).toEqual(["../../scripts/y", "lodash"]);
});

export const runner = (src: string) => src.match(/\b(bunx|npx|bun x)\s/g) ?? [];

test("G31 keine On-demand-Runner in Code und Konfiguration", () => {
  const code = dateien.filter((f) => /\.(ts|json|sh)$/.test(f) && f !== SELBST);
  for (const f of code) expect(runner(lies(f)), f).toEqual([]);
  // gegenprobe: ein Skript mit bunx würde auffallen
  expect(runner('"test": "bunx vitest"')).toEqual(["bunx "]);
});

test("deckel: jedes Skript mit bezahltem Aufruf läuft über mitDeckel", () => {
  const skripte = dateien.filter((f) => f.startsWith("agent/scripts/") && f.endsWith(".ts"));
  const bezahlt = skripte.filter((f) => /\bfetch\(|src\/replay/.test(lies(f)));
  expect(bezahlt.length).toBeGreaterThan(0);
  for (const f of bezahlt) expect(lies(f), f).toContain("mitDeckel(");
});
