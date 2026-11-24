#!/usr/bin/env bun
// Replay einer Prompt-Änderung gegen echten Gesprächskontext, mit Kontrollarm und Kostendeckel.
// Aufruf:
//   OPENAI_BASE_URL=https://api.openai.com/v1 OPENAI_API_KEY=… bun agent/scripts/replay.ts \
//     --verlauf verlauf.json --bis "wiederholen" --n 10 --max-usd 0.50 --usd-pro-aufruf 0.002 \
//     --erwartet "Unter welcher Nummer" alt.txt neu.txt
// verlauf.json: [{ "role": "assistant" | "user", "content": "…" }]. Der erste Prompt ist die Kontrolle.
import { parseArgs } from "node:util";
import { mitDeckel } from "../src/messung";
import { replay, schneiden, type Msg } from "../src/replay";

const { values: v, positionals: prompts } = parseArgs({
  allowPositionals: true,
  options: {
    verlauf: { type: "string" }, bis: { type: "string" }, n: { type: "string", default: "10" }, erwartet: { type: "string" },
    "max-usd": { type: "string" }, "usd-pro-aufruf": { type: "string" }, modell: { type: "string", default: "gpt-4.1-mini" },
  },
});
if (!v.verlauf || !v.bis || !v.erwartet || prompts.length < 2) throw new Error("Pflicht: --verlauf, --bis, --erwartet und mindestens zwei Prompt-Dateien (Kontrolle zuerst).");
const n = Number(v.n);
const kontext = schneiden((await Bun.file(v.verlauf).json()) as Msg[], new RegExp(v.bis, "i"));
if (!kontext) throw new Error(`Keine Anrufer-Äußerung trifft /${v.bis}/.`);

const schaetzungUsd = n * prompts.length * Number(v["usd-pro-aufruf"] ?? NaN);
const ergebnis = await mitDeckel({ maxUsd: Number(v["max-usd"]), schaetzungUsd }, async () =>
  replay(
    { baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1", apiKey: process.env.OPENAI_API_KEY ?? "", model: v.modell!, temperature: 0.2, maxTokens: 250 },
    await Promise.all(prompts.map(async (p) => ({ name: p, system: await Bun.file(p).text() }))),
    kontext, n, (a) => a.toLowerCase().includes(v.erwartet!.toLowerCase()),
  ));

const zeile = (a: { name: string; treffer: number; n: number; fehler: number }) => `${a.name}: ${a.treffer}/${a.n} (Fehler ${a.fehler})`;
console.log(`Kontrolle ${zeile(ergebnis.kontrolle)}`);
for (const a of ergebnis.arme) console.log(`${zeile(a)} → ${a.urteil}`);
