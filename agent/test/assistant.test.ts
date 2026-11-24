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
    expect(a.voice.cachingEnabled).toBe(false);
    // gegenprobe: ohne das Feld gilt der Default der Plattform, und der ist an
    const { cachingEnabled, ...ohne } = a.voice;
    expect("cachingEnabled" in ohne).toBe(false);
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
    expect(a.stopSpeakingPlan.numWords).toBe(2);
    expect(a.stopSpeakingPlan.acknowledgementPhrases).toContain("mhm");
    expect(a.stopSpeakingPlan.interruptionPhrases).toContain("moment");
    // gegenprobe: mit numWords 0 bricht jedes „mhm“ den Agenten ab
    expect({ ...a.stopSpeakingPlan, numWords: 0 }.numWords).not.toBe(2);
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
    expect(a.model.tools.some((t) => (t as { type: string }).type === "endCall")).toBe(false);
    expect(a.monitorPlan.controlEnabled).toBe(true);
    expect(a.monitorPlan.controlAuthenticationEnabled).toBe(true);
    // gegenprobe: ein Modell mit endCall kann vor dem letzten Feld auflegen, das kein Server-Check verhindert
    const mitEndCall = [...a.model.tools, { type: "endCall" }];
    expect(mitEndCall.some((t) => (t as { type: string }).type === "endCall")).toBe(true);
  });
});
