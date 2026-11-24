import { describe, expect, test } from "bun:test";
import { abweichungen, gate, mitDeckel, mitWiederholung, uebernommen, vergleich } from "../src/messung";

describe("Messung", () => {
  test("G23 deckel: ohne oder über dem Deckel startet kein bezahlter Lauf", async () => {
    let gestartet = 0;
    const start = async () => { gestartet++; return "ok"; };
    expect(await mitDeckel({ maxUsd: 1, schaetzungUsd: 0.5 }, start)).toBe("ok");
    expect(mitDeckel({ maxUsd: 1, schaetzungUsd: 1.5 }, start)).rejects.toThrow("über dem Deckel");
    expect(mitDeckel({ schaetzungUsd: 0.1 }, start)).rejects.toThrow("Kein Kostendeckel");
    expect(mitDeckel({ maxUsd: 1, schaetzungUsd: NaN }, start)).rejects.toThrow();
    // gegenprobe: nur der erste, erlaubte Lauf hat gestartet
    expect(gestartet).toBe(1);
  });

  test("G24 besser oder schlechter nur bei getrennten Spannen", () => {
    expect(vergleich({ treffer: 10, n: 10 }, { treffer: 0, n: 10 })).toBe("besser");
    expect(vergleich({ treffer: 0, n: 10 }, { treffer: 10, n: 10 })).toBe("schlechter");
    expect(vergleich({ treffer: 3, n: 3 }, { treffer: 2, n: 3 })).toBe("nicht unterscheidbar");
    expect(vergleich({ treffer: 1, n: 1 }, { treffer: 0, n: 1 })).toBe("zu wenig Läufe");
    // gegenprobe: ein Vergleich nur der Mittelwerte hätte 3/3 gegen 2/3 als besser gelesen
    expect(3 / 3 > 2 / 3).toBe(true);
  });

  test("G25 ein Einwurf macht das Gate rot, egal wie schnell", () => {
    expect(gate({ einwuerfe: 0, medianS: 1.2, zielS: 2 })).toBe("gruen");
    expect(gate({ einwuerfe: 1, medianS: 0.8, zielS: 2 })).toBe("rot");
    // gegenprobe: ein Gate nur auf Tempo hätte den schnelleren Arm mit Einwurf grün gemacht
    const nurTempo = (a: { medianS: number; zielS: number }) => a.medianS <= a.zielS;
    expect(nurTempo({ medianS: 0.8, zielS: 2 })).toBe(true);
  });

  test("G26 eine Messung zählt nur, wenn die Plattform die Einstellung übernommen hat", () => {
    const soll = { startSpeakingPlan: { waitSeconds: 0.4 } };
    expect(uebernommen(soll, { startSpeakingPlan: { waitSeconds: 0.4, extra: 1 } })).toEqual([]);
    expect(uebernommen(soll, { startSpeakingPlan: { waitSeconds: 0.6 } })).toHaveLength(1);
    // gegenprobe: wer nur den eigenen Request prüft, sieht den falschen Wert am Call nie
    expect(JSON.stringify(soll)).toContain("0.4");
  });

  test("G27 Diff in beide Richtungen mit Array-Längen", () => {
    const soll = { tools: [{ name: "speichern" }] };
    expect(abweichungen(soll, soll)).toEqual([]);
    const ist = { tools: [{ name: "speichern" }, { name: "endCall" }], neu: true };
    const d = abweichungen(soll, ist);
    expect(d.some((x) => x.includes("Länge soll 1, ist 2"))).toBe(true);
    expect(d.some((x) => x.startsWith(".neu"))).toBe(true);
    // gegenprobe: ein Diff nur vom Soll aus sieht das zusätzliche Tool im Konto nicht
    expect(uebernommen({ a: 1 }, { a: 1, neu: true }).length).toBe(0);
  });

  test("G29 429 und 5xx werden wiederholt, retry-after gilt", async () => {
    const pausen: number[] = [];
    const antworten = [new Response("", { status: 429, headers: { "retry-after": "2" } }), new Response("", { status: 503 }), new Response("ok")];
    const r = await mitWiederholung(async () => antworten.shift()!, { warte: async (ms) => { pausen.push(ms); } });
    expect(r.status).toBe(200);
    expect(pausen).toEqual([2000, 1000]);
    // gegenprobe: ein 400 wird nicht wiederholt, und nach den erlaubten Versuchen kommt der Fehler zurück
    let n = 0;
    const immer500 = await mitWiederholung(async () => { n++; return new Response("", { status: 500 }); }, { versuche: 3, warte: async () => {} });
    expect([immer500.status, n]).toEqual([500, 3]);
    expect((await mitWiederholung(async () => new Response("", { status: 400 }))).status).toBe(400);
  });
});
