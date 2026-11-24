// Prüft, dass das Lern-Kit hält, was es verspricht: Pflichtspalten gefüllt,
// jede Gotcha-Zeile mit Test zeigt auf einen echten Test mit Gegenprobe,
// und README und Kit verweisen auf Dateien, die es gibt.
import { expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const lies = (p: string) => readFileSync(join(ROOT, p), "utf8");

// Markdown-Tabelle: Zeilen ab der Kopfzeile, Trennzeile weg, Zellen getrimmt.
function tabelle(md: string, kopfStart: string): Record<string, string>[] {
  const zeilen = md.split("\n");
  const i = zeilen.findIndex((z) => z.startsWith(`| ${kopfStart} |`));
  if (i < 0) throw new Error(`Tabelle mit Kopf "${kopfStart}" fehlt`);
  const zellen = (z: string) => z.slice(1, z.lastIndexOf("|")).split("|").map((c) => c.trim());
  const kopf = zellen(zeilen[i]);
  const rows: Record<string, string>[] = [];
  for (const z of zeilen.slice(i + 2)) {
    if (!z.startsWith("|")) break;
    const c = zellen(z);
    rows.push(Object.fromEntries(kopf.map((k, j) => [k, c[j] ?? ""])));
  }
  return rows;
}

const schrauben = tabelle(lies("kit/stellschrauben.md"), "Gruppe");
const gotchas = tabelle(lies("kit/gotchas.md"), "ID");

// Alle G-Tests im Repo: Datei → Liste der G-IDs samt Testblock.
function gTests(): { datei: string; id: string; block: string }[] {
  const out: { datei: string; id: string; block: string }[] = [];
  for (const dir of ["agent/test", "test"]) {
    for (const f of readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".test.ts"))) {
      const datei = `${dir}/${f}`;
      const src = lies(datei);
      const starts = [...src.matchAll(/\btest\("(G\d+) /g)];
      starts.forEach((m, k) => {
        const ende = src.indexOf("\ntest(", m.index! + 1);
        const naechster = starts[k + 1]?.index ?? src.length;
        out.push({ datei, id: m[1], block: src.slice(m.index!, ende < 0 ? naechster : Math.min(ende, naechster)) });
      });
    }
  }
  return out;
}

test("kernregel: steht als erste Regel und hat Quellen", () => {
  const md = lies("kit/regeln.md");
  const ersteH2 = md.split("\n").find((z) => z.startsWith("## "));
  expect(ersteH2).toContain("Kernregel");
  const r1 = md.slice(md.indexOf(ersteH2!), md.indexOf("\n## ", md.indexOf(ersteH2!) + 1));
  expect((r1.match(/https:\/\//g) ?? []).length).toBeGreaterThanOrEqual(3);
});

test("stellschrauben: jede Zeile hat alle Pflichtspalten", () => {
  const pflicht = ["Gruppe", "Stellschraube", "Default hier", "Praxis", "Quelle", "Stufe", "Selbst messen"];
  expect(schrauben.length).toBeGreaterThan(0);
  for (const r of schrauben) for (const p of pflicht) expect(`${r.Stellschraube}:${p}:${r[p]}`).not.toMatch(/:$/);
  for (const r of schrauben) expect(["HIGH", "MED", "LOW"]).toContain(r.Stufe);
});

test("abdeckung: alle acht Gruppen vorhanden", () => {
  const gruppen = new Set(schrauben.map((r) => r.Gruppe));
  for (const g of ["Modell", "Endpointing", "Barge-in", "Stimme", "Transcriber", "Prompt-Budget", "Dauer", "Stille"]) {
    expect(gruppen.has(g)).toBe(true);
  }
});

test("quelle: keine Stellschraube ohne Quelle, keine Quelle nur 'unbelegt'", () => {
  for (const r of schrauben) {
    expect(r.Quelle.length).toBeGreaterThan(3);
    expect(r.Quelle.toLowerCase()).not.toBe("unbelegt");
  }
});

test("gotchas: Pflichtspalten gefüllt, IDs lückenlos", () => {
  const pflicht = ["ID", "Symptom", "Ursache", "Regel", "Wächter-Idee", "Geltung", "Test"];
  gotchas.forEach((r, i) => {
    expect(r.ID).toBe(`G${i + 1}`);
    for (const p of pflicht) expect(`${r.ID}:${p}:${r[p]}`).not.toMatch(/:$/);
  });
});

test("neutral: jede Gotcha ist als neutral oder Vapi markiert", () => {
  for (const r of gotchas) expect(["neutral", "Vapi"]).toContain(r.Geltung);
});

test("replay: die vier Verfahrensteile sind benannt", () => {
  const md = lies("kit/replay.md");
  for (const h of ["## 1. Schnitt", "## 2. Ziehungen", "## 3. Kontrollarm", "## 4. Spannen"]) expect(md).toContain(h);
});

test("szenarien: valide, synthetisch, Gotcha-Verweise existieren", () => {
  const { szenarien } = JSON.parse(lies("kit/szenarien.json"));
  const ids = new Set(gotchas.map((r) => r.ID));
  expect(szenarien.length).toBeGreaterThanOrEqual(8);
  for (const s of szenarien) {
    expect(s.id && s.ziel).toBeTruthy();
    expect(s.anrufer.length).toBeGreaterThan(0);
    expect(s.erwartet.length).toBeGreaterThan(0);
    for (const g of s.gotchas) expect(ids.has(g)).toBe(true);
    // Nur erfundene Nummern: jede Ziffernfolge ab 6 Ziffern beginnt mit 0123.
    for (const z of s.anrufer) {
      for (const n of z.match(/\d[\d ]{5,}\d/g) ?? []) expect(n.replace(/\s/g, "")).toStartWith("0123");
    }
  }
});

test("waechter: jede Testangabe zeigt auf einen echten G-Test, jeder G-Test hat eine Zeile", () => {
  const alle = gTests();
  for (const r of gotchas) {
    if (r.Test === "Regel ohne Test") continue;
    const m = r.Test.match(/^`([^`]+)` › (G\d+)$/);
    expect(m, `${r.ID}: Testangabe "${r.Test}"`).not.toBeNull();
    expect(m![2]).toBe(r.ID);
    expect(existsSync(join(ROOT, m![1])), m![1]).toBe(true);
    expect(alle.some((t) => t.datei === m![1] && t.id === r.ID), `${r.ID} in ${m![1]}`).toBe(true);
  }
  for (const t of alle) {
    const zeile = gotchas.find((r) => r.ID === t.id);
    expect(zeile?.Test, `${t.id} ohne Zeile`).toBe(`\`${t.datei}\` › ${t.id}`);
  }
});

test("gegenprobe: jeder G-Test enthält eine Gegenprobe", () => {
  const alle = gTests();
  expect(alle.length).toBeGreaterThanOrEqual(30);
  for (const t of alle) expect(t.block.includes("gegenprobe"), `${t.datei} › ${t.id}`).toBe(true);
});

test("readme: nennt jede Gotcha-ID und alle lokalen Links lösen auf", () => {
  const md = lies("README.md");
  for (const r of gotchas) expect(md, r.ID).toMatch(new RegExp(`\\b${r.ID}\\b`));
  for (const datei of ["README.md", ...readdirSync(join(ROOT, "kit")).filter((f) => f.endsWith(".md")).map((f) => `kit/${f}`)]) {
    const basis = datei.includes("/") ? datei.slice(0, datei.lastIndexOf("/")) : "";
    for (const [, ziel] of lies(datei).matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)) {
      if (/^https?:/.test(ziel)) continue;
      expect(existsSync(join(ROOT, basis, ziel)), `${datei} → ${ziel}`).toBe(true);
    }
  }
});
