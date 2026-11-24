import { describe, expect, test } from "bun:test";
import { betreffSicher, mailAusgang, nachricht, webhookAusgang, weiterleiten, type Mail } from "../src/weiterleitung";

const n = nachricht("c1", { name: "Erika Beispiel", anliegen: "Angebot", rueckruf: "01234567890", dringlichkeit: "dringend" });

describe("Weiterleitung", () => {
  test("webhook: die Nachricht kommt beim Empfänger an", async () => {
    const empfangen: unknown[] = [];
    const server = Bun.serve({ port: 0, fetch: async (req) => { empfangen.push(await req.json()); return new Response("ok"); } });
    try {
      await webhookAusgang(`http://localhost:${server.port}/eingang`)(n);
      expect(empfangen).toHaveLength(1);
      expect(empfangen[0]).toMatchObject({ callId: "c1", name: "Erika Beispiel", vollstaendig: true });
    } finally { server.stop(true); }
  });

  test("mail: zweiter Ausgang hinter derselben Schnittstelle", async () => {
    const mails: Mail[] = [];
    await weiterleiten(n, [mailAusgang(async (m) => { mails.push(m); }, "team@example.invalid", "anrufbeantworter@example.invalid")]);
    expect(mails[0].betreff).toBe("DRINGEND: Erika Beispiel");
    expect(mails[0].text).toContain("Dringender Rückruf: Erika Beispiel, 01234567890.");
  });

  test("ein kaputter Ausgang blockiert die anderen nicht und wird gemeldet", async () => {
    const ok: string[] = [];
    const f = (async () => new Response("", { status: 502 })) as unknown as typeof fetch;
    const fehler = await weiterleiten(n, [webhookAusgang("http://x", f), async () => { ok.push("mail"); }]);
    expect(fehler).toEqual(["Webhook 502"]);
    expect(ok).toEqual(["mail"]);
  });

  test("G32 Anrufertext landet nie roh in einem Mail-Header", async () => {
    const boese = nachricht("c2", { name: "Max\r\nBcc: alle@example.invalid", anliegen: "x", rueckruf: "01234567890", dringlichkeit: "normal" });
    const mails: Mail[] = [];
    await mailAusgang(async (m) => { mails.push(m); }, "a@example.invalid", "b@example.invalid")(boese);
    expect(mails[0].betreff).not.toMatch(/[\r\n]/);
    expect(betreffSicher("a\nb")).toBe("a b");
    // gegenprobe: ein Betreff direkt aus dem Namen trägt den eingeschleusten Header mit
    expect(`Rückruf: ${boese.name}`).toMatch(/\r\nBcc:/);
  });
});
