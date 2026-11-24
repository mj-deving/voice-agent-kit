import { describe, expect, test } from "bun:test";
import { ABSCHLUSS } from "../src/ablauf";
import { beenden, erstelleServer, konfiguration } from "../src/server";
import type { Nachricht } from "../src/weiterleitung";

const SECRET = "test-secret-0123456789";
const anfrage = (message: unknown, secret = SECRET) =>
  new Request("http://x/webhook", { method: "POST", headers: { "x-webhook-secret": secret }, body: JSON.stringify({ message }) });
const tool = (id: string, feld: string, wert: string) => ({ id, function: { name: "speichern", arguments: JSON.stringify({ feld, wert }) } });

function aufbau() {
  const gesendet: Nachricht[] = [], control: string[] = [], logs: string[] = [];
  const fakeFetch = (async (_u: string, init: RequestInit) => { control.push(JSON.parse(String(init.body)).type); return new Response("{}"); }) as typeof fetch;
  const handle = erstelleServer({ secret: SECRET, ausgaenge: [async (n) => { gesendet.push(n); }], fetch: fakeFetch, log: (s) => logs.push(s) });
  return { handle, gesendet, control, logs };
}

describe("Server", () => {
  test("ganzer Anruf: Tool-Aufrufe, Abschied, Auflegen, Weiterleitung", async () => {
    const { handle, gesendet, control } = aufbau();
    const call = { id: "c1", monitor: { controlUrl: "http://control/c1" } };
    const r = await (await handle(anfrage({ type: "tool-calls", call, toolCallList: [tool("t1", "name", "Erika Beispiel"), tool("t2", "rueckruf", "0123 4567890")] }))).json();
    expect(r.results).toHaveLength(2);
    expect(r.results[1].result).toContain("null eins zwo drei");
    await handle(anfrage({ type: "tool-calls", call, toolCallList: [tool("t3", "anliegen", "Angebot Wartung"), tool("t4", "dringlichkeit", "nein, morgen reicht")] }));
    await handle(anfrage({ type: "conversation-update", call, messages: [{ role: "user", message: "Das war alles." }, { role: "bot", message: ABSCHLUSS }] }));
    expect(control).toEqual(["mute-assistant", "end-call"]);
    await handle(anfrage({ type: "end-of-call-report", call }));
    expect(gesendet).toHaveLength(1);
    expect(gesendet[0]).toMatchObject({ vollstaendig: true, name: "Erika Beispiel", rueckruf: "01234567890", dringlichkeit: "normal" });
  });

  test("abgebrochenes Gespräch wird als unvollständig weitergeleitet", async () => {
    const { handle, gesendet } = aufbau();
    await handle(anfrage({ type: "tool-calls", call: { id: "c2" }, toolCallList: [tool("t1", "name", "Max Muster")] }));
    await handle(anfrage({ type: "end-of-call-report", call: { id: "c2" } }));
    expect(gesendet[0].vollstaendig).toBe(false);
    expect(gesendet[0].zusammenfassung).toContain("es fehlt: anliegen, rueckruf, dringlichkeit");
  });

  test("Endpointing-Anfrage bekommt eine Wartezeit", async () => {
    const { handle } = aufbau();
    const r = await (await handle(anfrage({ type: "call.endpointing.request", messages: [{ role: "bot", message: "Wie ist Ihr Name?" }, { role: "user", message: "Erika Beispiel." }] }))).json();
    expect(r).toEqual({ timeoutSeconds: 0.25 });
  });

  test("G20 der Body ist gelesen, bevor geantwortet wird", async () => {
    const { handle, gesendet } = aufbau();
    await handle(anfrage({ type: "tool-calls", call: { id: "c3" }, toolCallList: [tool("t1", "name", "Max Muster")] }));
    const antwort = await handle(anfrage({ type: "end-of-call-report", call: { id: "c3" } }));
    // Die Weiterleitung ist schon passiert, wenn die Antwort zurückkommt; nichts läuft danach im Hintergrund weiter.
    expect(gesendet).toHaveLength(1);
    expect((await antwort.json()).fehler).toBe(0);
    // gegenprobe: ein Handler, der zuerst antwortet und danach erst liest, hat zum Antwortzeitpunkt nichts weitergeleitet
    const spaet: string[] = [];
    const zuerstAntworten = (req: Request) => { req.text().then(() => spaet.push("gelesen")); return new Response(null, { status: 202 }); };
    zuerstAntworten(anfrage({ type: "end-of-call-report" }));
    expect(spaet).toHaveLength(0);
  });

  test("G21 ein abgebrochener oder kaputter Body beendet den Prozess nicht", async () => {
    const { handle } = aufbau();
    const kaputt = new Request("http://x/webhook", { method: "POST", headers: { "x-webhook-secret": SECRET }, body: "{nicht json" });
    expect((await handle(kaputt)).status).toBe(400);
    const abgebrochen = new Request("http://x/webhook", {
      method: "POST", headers: { "x-webhook-secret": SECRET },
      body: new ReadableStream({ start(c) { c.error(new Error("Verbindung geschlossen")); } }),
    });
    expect((await handle(abgebrochen)).status).toBe(400);
    expect((await handle(new Request("http://x/health"))).status).toBe(200);
    // gegenprobe: ein ungefangenes req.json() auf demselben Body wirft
    const roh = new Request("http://x", { method: "POST", body: new ReadableStream({ start(c) { c.error(new Error("weg")); } }) });
    expect(roh.json()).rejects.toThrow();
  });

  test("G22 secret: ohne Secret startet der Server nicht, falsches Secret gibt 401", async () => {
    expect(() => konfiguration({})).toThrow("WEBHOOK_SECRET");
    expect(() => konfiguration({ WEBHOOK_SECRET: "kurz" })).toThrow();
    expect(konfiguration({ WEBHOOK_SECRET: SECRET }).secret).toBe(SECRET);
    const { handle } = aufbau();
    expect((await handle(anfrage({ type: "x" }, "falsch"))).status).toBe(401);
    expect((await handle(new Request("http://x/webhook", { method: "POST", body: "{}" }))).status).toBe(401);
    // gegenprobe: dieselbe Prüfung „Start ohne Secret wirft“ gegen eine fail-open-Konfiguration (leer heißt: nicht prüfen) schlägt an
    const failOpen = (env: Record<string, string | undefined>) => ({ secret: env.WEBHOOK_SECRET ?? "" });
    expect(() => failOpen({})).not.toThrow();
  });

  test("G28 erst stumm schalten, dann auflegen, mit Token", async () => {
    const aufrufe: { type: string; auth: string | null }[] = [];
    const f = (async (_u: string, init: RequestInit) => {
      aufrufe.push({ type: JSON.parse(String(init.body)).type, auth: new Headers(init.headers).get("authorization") });
      return new Response("{}");
    }) as typeof fetch;
    await beenden("http://control", "tok", f);
    expect(aufrufe).toEqual([{ type: "mute-assistant", auth: "Bearer tok" }, { type: "end-call", auth: "Bearer tok" }]);
    // gegenprobe: schlägt mute fehl, wird nicht blind aufgelegt, sondern der Fehler gemeldet
    const fehler = (async () => new Response("", { status: 500 })) as unknown as typeof fetch;
    expect(beenden("http://control", undefined, fehler)).rejects.toThrow("mute-assistant 500");
  });

  test("Auflegen: ein fehlgeschlagener Versuch wird beim nächsten Update wiederholt", async () => {
    let versuche = 0;
    const f = (async () => new Response("", { status: ++versuche <= 1 ? 500 : 200 })) as unknown as typeof fetch;
    const logs: string[] = [];
    const handle = erstelleServer({ secret: SECRET, ausgaenge: [], fetch: f, log: (s) => logs.push(s) });
    const call = { id: "c9", monitor: { controlUrl: "http://control/c9" } };
    await handle(anfrage({ type: "tool-calls", call, toolCallList: [tool("a", "name", "Erika Beispiel"), tool("b", "anliegen", "Wartung"), tool("c", "rueckruf", "0123 4567890"), tool("d", "dringlichkeit", "morgen reicht")] }));
    const update = anfrage({ type: "conversation-update", call, messages: [{ role: "bot", message: ABSCHLUSS }] });
    expect((await handle(update)).status).toBe(200);
    expect(logs.join()).toContain("Auflegen fehlgeschlagen");
    await handle(anfrage({ type: "conversation-update", call, messages: [{ role: "bot", message: ABSCHLUSS }] }));
    expect(versuche).toBe(3); // 1 fehlgeschlagenes mute, dann mute + end-call
  });

  test("unbekanntes Tool-Feld wird abgelehnt, nicht gespeichert", async () => {
    const { handle, gesendet } = aufbau();
    const r = await (await handle(anfrage({ type: "tool-calls", call: { id: "c4" }, toolCallList: [tool("t1", "iban", "DE00")] }))).json();
    expect(r.results[0].result).toContain("Unbekanntes Feld");
    await handle(anfrage({ type: "end-of-call-report", call: { id: "c4" } }));
    expect(JSON.stringify(gesendet[0])).not.toContain("DE00");
  });
});
