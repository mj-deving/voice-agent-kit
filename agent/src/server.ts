// Webhook-Server des Anrufbeantworters. Eine Route für alle Plattform-Nachrichten:
//   GET  /health   → 200
//   POST /webhook  → 401 ohne gültiges Secret im Header x-webhook-secret
// Nachrichtentypen (Vapi-Namen): tool-calls, conversation-update, call.endpointing.request, end-of-call-report.
import { timingSafeEqual } from "node:crypto";
import { anweisung, auflegenErlaubt, pruefeWert, FELDER, type Feld, type Stand, type Turn } from "./ablauf";
import { wartezeit } from "./endpointing";
import { nachricht, weiterleiten, type Ausgang } from "./weiterleitung";

export const secretOk = (got: string | null, soll: string) => {
  if (!got) return false;
  const a = Buffer.from(got), b = Buffer.from(soll);
  return a.length === b.length && timingSafeEqual(a, b);
};

/** Beendet einen laufenden Call. G28: erst stumm schalten, dann auflegen, sonst wartet das Auflegen den laufenden Satz ab. */
export async function beenden(controlUrl: string, token: string | undefined, f: typeof fetch = fetch) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  for (const type of ["mute-assistant", "end-call"]) {
    const r = await f(controlUrl, { method: "POST", headers, body: JSON.stringify({ type }) });
    if (!r.ok) throw new Error(`${type} ${r.status}`);
  }
}

type Deps = { secret: string; ausgaenge: Ausgang[]; controlToken?: string; fetch?: typeof fetch; log?: (s: string) => void };
const json = (body: unknown, status = 200) => Response.json(body, { status });

const turns = (messages: any[]): Turn[] =>
  (Array.isArray(messages) ? messages : []).flatMap((m) => {
    const text = typeof m?.message === "string" ? m.message.trim() : "";
    if (!text) return [];
    return m.role === "user" ? [{ wer: "anrufer", text }] : m.role === "bot" || m.role === "assistant" ? [{ wer: "agent", text }] : [];
  });

export function erstelleServer(d: Deps) {
  // ponytail: Stand nur im Speicher, je Prozess. Ein Neustart verliert laufende Gespräche; Redis o. Ä., wenn das zählt.
  const staende = new Map<string, Stand>();
  const beendet = new Set<string>();
  const log = d.log ?? console.error;
  const stand = (id: string) => staende.get(id) ?? (staende.set(id, {}), staende.get(id)!);

  async function verarbeiten(msg: any): Promise<unknown> {
    const callId: string = msg?.call?.id ?? "ohne-id";
    switch (msg?.type) {
      case "tool-calls": {
        const results = (msg.toolCallList ?? []).map((t: any) => {
          const args = typeof t.function?.arguments === "string" ? JSON.parse(t.function.arguments) : t.function?.arguments ?? {};
          const feld = args.feld as Feld;
          if (t.function?.name !== "speichern" || !FELDER.some((f) => f.feld === feld))
            return { toolCallId: t.id, result: "Unbekanntes Feld. Rufe speichern nur mit name, anliegen, rueckruf oder dringlichkeit auf." };
          const s = stand(callId), ergebnis = pruefeWert(feld, String(args.wert ?? ""));
          if (ergebnis.ok) s[feld] = ergebnis.wert;
          return { toolCallId: t.id, result: anweisung(s, { feld, ergebnis }) };
        });
        return { results };
      }
      case "call.endpointing.request":
        return { timeoutSeconds: wartezeit(msg.messages ?? []).s };
      case "conversation-update": {
        const url = msg.call?.monitor?.controlUrl;
        if (url && !beendet.has(callId) && auflegenErlaubt(stand(callId), turns(msg.messages))) {
          beendet.add(callId);
          try {
            await beenden(url, d.controlToken, d.fetch);
          } catch (e) {
            // Fehlgeschlagen (kein Token, 5xx): Sperre lösen, damit das nächste Update es erneut versucht.
            beendet.delete(callId);
            log(`Auflegen fehlgeschlagen für ${callId}: ${(e as Error).message}`);
          }
        }
        return { ok: true };
      }
      case "end-of-call-report": {
        const fehler = await weiterleiten(nachricht(callId, stand(callId)), d.ausgaenge);
        for (const f of fehler) log(`Weiterleitung fehlgeschlagen für ${callId}: ${f}`);
        staende.delete(callId);
        beendet.delete(callId);
        return { ok: true, fehler: fehler.length };
      }
      default:
        return { ok: true };
    }
  }

  return async function handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === "GET" && url.pathname === "/health") return json({ ok: true });
    if (req.method !== "POST" || url.pathname !== "/webhook") return json({ error: "not found" }, 404);
    if (!secretOk(req.headers.get("x-webhook-secret"), d.secret)) return json({ error: "unauthorized" }, 401);
    // G21: Ein abgebrochener Body darf den Prozess nicht beenden. G20: Body ganz lesen, bevor geantwortet wird.
    let body: any;
    try { body = JSON.parse(await req.text()); } catch { return json({ error: "bad request" }, 400); }
    try { return json(await verarbeiten(body?.message)); } catch (e) {
      log(`Fehler: ${(e as Error).message}`);
      return json({ error: "internal" }, 500);
    }
  };
}

/** G22: Ohne Secret startet der Server nicht. Nie offen. */
export function konfiguration(env: Record<string, string | undefined>) {
  const secret = env.WEBHOOK_SECRET?.trim();
  if (!secret || secret.length < 16) throw new Error("WEBHOOK_SECRET fehlt oder ist kürzer als 16 Zeichen; Server startet nicht.");
  return { secret, port: Number(env.PORT ?? 3000), weiterleitungUrl: env.WEITERLEITUNG_URL, controlToken: env.CONTROL_TOKEN };
}
