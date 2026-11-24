import { describe, expect, test } from "bun:test";
import { buildAssistant, FUELLSAETZE, prompt, PROMPT_BUDGET } from "../src/assistant";

const a = buildAssistant({ firma: "Muster GmbH", serverUrl: "https://example.invalid/webhook", credentialId: "cred_platzhalter" });

describe("Assistant-Config", () => {
  test("Config ist ein Build aus Code und trägt Firma, Server und Tool", () => {
    expect(a.firstMessage).toContain("Muster GmbH");
    expect(a.firstMessage).toContain("transkribiert");
    expect(a.server).toEqual({ url: "https://example.invalid/webhook", credentialId: "cred_platzhalter" });
    expect(a.model.tools.map((t) => t.function.name)).toEqual(["speichern"]);
  });

  test("G1 budget: der Prompt bleibt unter dem Budget und trägt keinen Ablauf", () => {
    const p = prompt("Muster GmbH");
    expect(p.length).toBeLessThanOrEqual(PROMPT_BUDGET);
    // Der Ablauf (welche Frage wann) steht im Server, nicht im Prompt.
    expect(p).not.toContain("Unter welcher Nummer");
    // gegenprobe: eine Handvoll ungemessener Fix-Sätze, wie sie ohne Budget entstehen, sprengt es
    const angewachsen = p + "\nWICHTIG: Frage nie zweimal nach der Nummer. ".repeat(3) + "Lege nie auf, bevor alles erfasst ist. ".repeat(10);
    expect(angewachsen.length).toBeGreaterThan(PROMPT_BUDGET);
  });

  test("G14 die Zahl-Formatter der Plattform sind aus", () => {
    const an = a.voice.chunkPlan.formatPlan.formattersEnabled;
    for (const f of ["number", "dollarAmount", "date", "time", "phoneNumber"]) expect(an).not.toContain(f);
    // gegenprobe: ein Format-Plan ohne explizite Liste nimmt die Plattform-Defaults, die den Zahl-Formatter enthalten
    expect((a.voice.chunkPlan.formatPlan as { formattersEnabled?: string[] }).formattersEnabled).toBeDefined();
  });

  test("G15 der TTS-Cache ist aus", () => {
    const cacheAus = (v: { cachingEnabled?: boolean }) => v.cachingEnabled === false;
    expect(cacheAus(a.voice)).toBe(true);
    // gegenprobe: dieselbe Prüfung gegen eine Config ohne das Feld (Plattform-Default: an) schlägt an
    const { cachingEnabled, ...ohne } = a.voice;
    expect(cacheAus(ohne)).toBe(false);
  });

  test("G16 Füllsätze ohne Okay und ohne Dank", () => {
    const tool = a.model.tools[0];
    expect(tool.messages.map((m) => m.content)).toEqual(FUELLSAETZE);
    for (const s of FUELLSAETZE) expect(s).not.toMatch(/okay|danke|dank/i);
    // gegenprobe: ein Tool ohne messages lässt die Plattform einen englischen Default-Füllsatz sprechen
    expect(tool.messages.length).toBeGreaterThan(0);
    expect(["Okay.", "Danke dir."].some((s) => /okay|danke/i.test(s))).toBe(true);
  });

  test("G17 Barge-in: ein Hörersignal stoppt den Agenten nicht, deutsche Phrasenlisten", () => {
    type Plan = { numWords?: number; acknowledgementPhrases?: string[]; interruptionPhrases?: string[] };
    const bargeInOk = (p: Plan) => p.numWords === 2 && !!p.acknowledgementPhrases?.includes("mhm") && !!p.interruptionPhrases?.includes("moment");
    expect(bargeInOk(a.stopSpeakingPlan)).toBe(true);
    // gegenprobe: dieselbe Prüfung gegen numWords 0 (jedes „mhm“ bricht ab) und gegen Plattform-Listen ohne Deutsch
    expect(bargeInOk({ ...a.stopSpeakingPlan, numWords: 0 })).toBe(false);
    expect(bargeInOk({ numWords: 2 })).toBe(false);
  });

  test("G18 Defaults, die Daten verarbeiten oder Kosten treiben, sind explizit gesetzt", () => {
    expect(a.maxDurationSeconds).toBe(300);
    expect(a.silenceTimeoutSeconds).toBe(30);
    expect(a.artifactPlan.recordingEnabled).toBe(false);
    expect(a.analysisPlan.summaryPlan.enabled).toBe(false);
    expect(a.analysisPlan.successEvaluationPlan.enabled).toBe(false);
    expect(a.serverMessages).toContain("status-update");
    // gegenprobe: fehlt analysisPlan, erzeugt die Plattform ungefragt eine Zusammenfassung mit einem zweiten Modell
    const { analysisPlan, ...ohne } = a;
    expect("analysisPlan" in ohne).toBe(false);
  });

  test("G19 das Modell hat kein endCall-Tool, aufgelegt wird vom Server", () => {
    const keinEndCall = (tools: unknown[]) => !tools.some((t) => (t as { type: string }).type === "endCall");
    expect(keinEndCall(a.model.tools)).toBe(true);
    expect(a.monitorPlan.controlEnabled).toBe(true);
    expect(a.monitorPlan.controlAuthenticationEnabled).toBe(true);
    // gegenprobe: dieselbe Prüfung gegen ein Tool-Array mit endCall schlägt an
    expect(keinEndCall([...a.model.tools, { type: "endCall" }])).toBe(false);
  });

  test("Endpointing: die Wartezeit kommt vom Server", () => {
    // Mit diesem Provider schickt Vapi call.endpointing.request an die Server-URL des Assistenten.
    expect(a.startSpeakingPlan.smartEndpointingPlan.provider).toBe("custom-endpointing-model");
  });
});
