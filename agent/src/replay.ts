// Offline-Replay: Gesprächskontext bis zum kritischen Turn schneiden, je Prompt-Fassung N Antworten ziehen, gegen den
// Kontrollarm (alter Prompt) vergleichen. Läuft gegen jeden OpenAI-kompatiblen /chat/completions-Endpunkt (kit/replay.md).
import { mitWiederholung, vergleich } from "./messung";

export type Msg = { role: "system" | "user" | "assistant"; content: string };

/** Verlauf bis einschließlich der ersten Anrufer-Äußerung, die `bis` trifft. Ohne Treffer: null, nie der ganze Verlauf. */
export function schneiden(verlauf: Msg[], bis: RegExp): Msg[] | null {
  const i = verlauf.findIndex((m) => m.role === "user" && bis.test(m.content));
  return i < 0 ? null : verlauf.slice(0, i + 1);
}

export type Ziel = { baseUrl: string; apiKey: string; model: string; temperature: number; maxTokens: number; fetch?: typeof fetch };

/** Eine Antwort des Modells auf System-Prompt plus Kontext. Fehler kommen als Text mit Präfix FEHLER zurück und zählen nicht. */
export async function ziehen(z: Ziel, system: string, kontext: Msg[]): Promise<string> {
  const f = z.fetch ?? fetch;
  const r = await mitWiederholung(() => f(`${z.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${z.apiKey}` },
    body: JSON.stringify({ model: z.model, temperature: z.temperature, max_tokens: z.maxTokens, messages: [{ role: "system", content: system }, ...kontext] }),
  }));
  if (!r.ok) return `FEHLER ${r.status}`;
  return ((await r.json()) as any).choices?.[0]?.message?.content ?? "FEHLER leer";
}

export type Arm = { name: string; treffer: number; n: number; fehler: number; beispiel: string };

/** N Ziehungen je Arm, gezählt mit `pruefer`. Der erste Arm ist die Kontrolle; jeder weitere wird gegen ihn verglichen. */
export async function replay(z: Ziel, arme: { name: string; system: string }[], kontext: Msg[], n: number, pruefer: (antwort: string) => boolean) {
  const ergebnisse: Arm[] = [];
  for (const arm of arme) {
    const aus = await Promise.all(Array.from({ length: n }, () => ziehen(z, arm.system, kontext)));
    const ok = aus.filter((a) => !a.startsWith("FEHLER"));
    ergebnisse.push({ name: arm.name, treffer: ok.filter(pruefer).length, n: ok.length, fehler: n - ok.length, beispiel: aus[0] ?? "" });
  }
  const [kontrolle, ...rest] = ergebnisse;
  return { kontrolle, arme: rest.map((a) => ({ ...a, urteil: vergleich(a, kontrolle) })) };
}
