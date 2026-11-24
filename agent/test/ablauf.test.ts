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
    // gesprochene Ziffern, wie Transcriber sie oft liefern
    expect(pruefeWert("rueckruf", "Null eins zwei drei, vier fünf sechs sieben acht neun null.")).toEqual({ ok: true, wert: "01234567890" });
    expect(anweisung({}, { feld: "rueckruf", ergebnis: { ok: false, grund: "nummer-unvollstaendig" } })).toContain("unvollständig");
    // gegenprobe: dieselbe Prüfung gegen die alte Variante, die jeden nicht-leeren Wert nahm, lässt „0123 4“ durch
    const alt = (_f: string, w: string) => ({ ok: true as const, wert: w.trim() });
    expect(alt("rueckruf", "0123 4").ok).toBe(true);
    expect(pruefeWert("rueckruf", "0123 4").ok).toBe(false);
    // gegenprobe 2: die alte Nummernprüfung ohne Wortwandlung lehnte gesprochene Ziffern ab
    const altNummer = (w: string) => w.replace(/[^\d]/g, "").length >= 6;
    expect(altNummer("null eins zwei drei vier fünf sechs")).toBe(false);
    expect(pruefeWert("rueckruf", "null eins zwei drei vier fünf sechs").ok).toBe(true);
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
    // ein kurzer Gruß nach dem Abschied hält die Leitung nicht offen
    expect(auflegenErlaubt(voll, [...mitAbschied, { wer: "anrufer", text: "Tschüss!" }])).toBe(true);
    expect(auflegenErlaubt(voll, [...mitAbschied, { wer: "anrufer", text: "Danke, auf Wiederhören." }])).toBe(true);
  });

  test("G6 eine Wiederholungsbitte ist keine Antwort", () => {
    const r = pruefeWert("anliegen", "Können Sie die Frage nochmal wiederholen?");
    expect(r).toEqual({ ok: false, grund: "wiederholungsbitte" });
    const a = anweisung({ name: "Erika Beispiel" }, { feld: "anliegen", ergebnis: r });
    expect(a).toContain("Worum geht es bei Ihrem Anliegen?");
    expect(a).toContain("ohne Nachfrage");
    expect(pruefeWert("anliegen", "Sagen Sie das noch mal?").ok).toBe(false);
    // ein „noch einmal“ im echten Anliegen ist keine Bitte
    expect(pruefeWert("anliegen", "Die Heizung ist noch einmal ausgefallen.").ok).toBe(true);
    // gegenprobe: dieselbe Prüfung gegen die alte Variante, die nur „leer“ ablehnte, speichert die Bitte als Anliegen
    const alt = (w: string) => (w.trim() ? { ok: true } : { ok: false });
    expect(alt("Können Sie die Frage nochmal wiederholen?").ok).toBe(true);
    // gegenprobe 2: das alte, zu breite Muster lehnte ein echtes Anliegen ab
    expect(/(noch ?mal|noch einmal)/i.test("Die Heizung ist noch einmal ausgefallen.")).toBe(true);
  });

  test("rueckruf: Nummer wird ziffernweise zur Bestätigung vorgelesen", () => {
    const a = anweisung({ name: "Erika Beispiel", anliegen: "Wartung", rueckruf: "0123456" }, { feld: "rueckruf", ergebnis: { ok: true, wert: "0123456" } });
    expect(a).toContain("null eins zwo drei vier fünf sechs");
  });

  test("G13 Ziffern als Wörter, nie als Zahl", () => {
    expect(ziffernweise("+49 951 20")).toBe("plus vier neun neun fünf eins zwo null");
    expect(ziffernweise("55000")).not.toMatch(/\d/);
    // Jeder feste Satz, den der Agent wörtlich spricht, ist ziffernfrei.
    const gesprochen = [ABSCHLUSS, NOTFALL, ...FELDER.map((f) => f.frage)];
    const ohneZiffern = (saetze: string[]) => saetze.every((s) => !/\d/.test(s));
    expect(ohneZiffern(gesprochen)).toBe(true);
    // gegenprobe: dieselbe Prüfung gegen den alten Notfall-Satz mit „112“ schlägt an
    expect(ohneZiffern([...gesprochen, "Bei einem Notfall wählen Sie bitte sofort die 112."])).toBe(false);
  });

  test("Notfall: Hinweis auf 112 kommt sofort nach der Angabe", () => {
    const s: Stand = { ...voll, dringlichkeit: "notfall" };
    expect(pruefeWert("dringlichkeit", "Das ist ein Notfall")).toEqual({ ok: true, wert: "notfall" });
    expect(anweisung(s, { feld: "dringlichkeit", ergebnis: { ok: true, wert: "notfall" } })).toStartWith(NOTFALL);
    expect(pruefeWert("dringlichkeit", "nicht so dringend, morgen reicht")).toEqual({ ok: true, wert: "normal" });
    // schon im Anliegen erkannt, nicht erst bei der letzten Frage
    const gas: Stand = { name: "Max Muster", anliegen: "Bei uns riecht es nach Gas." };
    expect(anweisung(gas, { feld: "anliegen", ergebnis: { ok: true, wert: gas.anliegen! } })).toStartWith(NOTFALL);
    const wartung: Stand = { name: "Max Muster", anliegen: "Wartung der Heizung." };
    expect(anweisung(wartung, { feld: "anliegen", ergebnis: { ok: true, wert: wartung.anliegen! } })).not.toContain("eins eins zwei");
  });
});
