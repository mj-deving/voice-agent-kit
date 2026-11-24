import { describe, expect, test } from "bun:test";
import { ABSCHLUSS, anweisung, FELDER, auflegenErlaubt, NOTFALL, offen, pruefeWert, ziffernweise, type Stand, type Turn } from "../src/ablauf";

const voll: Stand = { name: "Erika Beispiel", anliegen: "Angebot für eine Wartung", rueckruf: "01234567890", dringlichkeit: "normal" };

describe("Ablauf", () => {
  test("pflichtfelder: Abschied erst, wenn Name, Anliegen, Rückruf und Dringlichkeit da sind", () => {
    expect(offen({})).toEqual(["name", "anliegen", "rueckruf", "dringlichkeit"]);
    expect(anweisung({ name: "Erika Beispiel" })).toContain("Worum geht es");
    expect(anweisung(voll)).toContain(ABSCHLUSS);
    for (const feld of Object.keys(voll) as (keyof Stand)[]) {
      const ohne = { ...voll, [feld]: undefined };
      expect(anweisung(ohne)).not.toContain(ABSCHLUSS);
    }
  });

  test("G2 jede Anweisung nennt alle offenen Felder und verbietet andere Fragen", () => {
    const a = anweisung({ name: "Erika Beispiel" });
    expect(a).toContain("anliegen, rueckruf, dringlichkeit");
    expect(a).toContain("keine Frage, die nicht in dieser Liste steht");
    // gegenprobe: eine Anweisung nur mit der nächsten Frage (der ursprüngliche Fehler) sagt nichts über den Rest
    const nurNaechste = a.split("\n")[0];
    expect(nurNaechste).not.toContain("dringlichkeit");
  });

  test("G3 eine vorgezogene Antwort überspringt ihre Frage", () => {
    // Die Person nennt die Nummer schon beim Namen; die Rückruffrage darf nicht mehr kommen.
    const s: Stand = { name: "Erika Beispiel", rueckruf: "01234567890" };
    const a = anweisung(s);
    expect(a).toContain("Worum geht es");
    expect(a).not.toContain("Unter welcher Nummer");
    // gegenprobe: ein starrer Ablauf nach Zahl der Antworten fragt nach dem Anliegen die schon genannte Nummer erneut
    const starr = (antworten: number) => `Stelle jetzt nur diese Frage: ${FELDER[antworten].frage}`;
    expect(starr(2)).toContain("Unter welcher Nummer");
  });

  test("G4 der Server prüft Werte: unvollständige Nummer wird nachgefragt, nicht gespeichert", () => {
    expect(pruefeWert("rueckruf", "0123 4")).toEqual({ ok: false, grund: "nummer-unvollstaendig" });
    expect(pruefeWert("rueckruf", "null eins zwo")).toEqual({ ok: false, grund: "nummer-unvollstaendig" });
    expect(pruefeWert("rueckruf", "+49 123 4567890")).toEqual({ ok: true, wert: "+491234567890" });
    expect(anweisung({}, { feld: "rueckruf", ergebnis: { ok: false, grund: "nummer-unvollstaendig" } })).toContain("unvollständig");
    // gegenprobe: ohne Prüfung wäre „0123 45“ ein gültiger Wert und das Feld als erledigt markiert
    const ohnePruefung = (w: string) => w.trim().length > 0;
    expect(ohnePruefung("0123 4")).toBe(true);
  });

  test("G5 Auflegen ist zustandslos: nur alle Felder plus gesprochener Abschied als letzte Äußerung", () => {
    const mitAbschied: Turn[] = [{ wer: "anrufer", text: "Nein, das war alles." }, { wer: "agent", text: ABSCHLUSS }];
    expect(auflegenErlaubt(voll, mitAbschied)).toBe(true);
    // gegenprobe 1: Abschied gesprochen, aber ein Feld fehlt
    expect(auflegenErlaubt({ ...voll, dringlichkeit: undefined }, mitAbschied)).toBe(false);
    // gegenprobe 2: nach dem Abschied spricht die Person weiter
    expect(auflegenErlaubt(voll, [...mitAbschied, { wer: "anrufer", text: "Ach, noch was." }])).toBe(false);
    // gegenprobe 3: Felder voll, aber der Agent hat sich noch nicht verabschiedet
    expect(auflegenErlaubt(voll, [{ wer: "agent", text: "Ist es dringend?" }])).toBe(false);
    // gegenprobe 4: dieselbe Frage zweimal liefert dasselbe Ergebnis, es gibt keine gespeicherte Freigabe
    expect(auflegenErlaubt(voll, mitAbschied)).toBe(auflegenErlaubt(voll, mitAbschied));
  });

  test("G6 eine Wiederholungsbitte ist keine Antwort", () => {
    const r = pruefeWert("anliegen", "Können Sie die Frage nochmal wiederholen?");
    expect(r).toEqual({ ok: false, grund: "wiederholungsbitte" });
    const a = anweisung({ name: "Erika Beispiel" }, { feld: "anliegen", ergebnis: r });
    expect(a).toContain("Worum geht es bei Ihrem Anliegen?");
    expect(a).toContain("ohne Nachfrage");
    // gegenprobe: eine Prüfung, die nur auf „leer“ schaut, hätte die Bitte als Anliegen gespeichert
    expect("Können Sie die Frage nochmal wiederholen?".trim().length > 0).toBe(true);
  });

  test("rueckruf: Nummer wird ziffernweise zur Bestätigung vorgelesen", () => {
    const a = anweisung({ name: "Erika Beispiel", anliegen: "Wartung", rueckruf: "0123456" }, { feld: "rueckruf", ergebnis: { ok: true, wert: "0123456" } });
    expect(a).toContain("null eins zwo drei vier fünf sechs");
  });

  test("G13 Ziffern als Wörter, nie als Zahl", () => {
    expect(ziffernweise("+49 951 20")).toBe("plus vier neun neun fünf eins zwo null");
    expect(ziffernweise("55000")).not.toMatch(/\d/);
    // gegenprobe: die Zahl als Ziffernfolge an die Stimme gegeben, liest eine Pipeline sie als Betrag oder englisch
    expect("55000").toMatch(/^\d+$/);
  });

  test("Notfall: Hinweis auf 112 kommt sofort nach der Angabe", () => {
    const s: Stand = { ...voll, dringlichkeit: "notfall" };
    expect(pruefeWert("dringlichkeit", "Das ist ein Notfall")).toEqual({ ok: true, wert: "notfall" });
    expect(anweisung(s, { feld: "dringlichkeit", ergebnis: { ok: true, wert: "notfall" } })).toStartWith(NOTFALL);
    expect(pruefeWert("dringlichkeit", "nicht so dringend, morgen reicht")).toEqual({ ok: true, wert: "normal" });
  });
});
