// Gesprächsablauf des Anrufbeantworters. Der Server entscheidet, welche Frage als Nächstes kommt, ob ein Wert taugt
// und wann aufgelegt werden darf. Das Modell formuliert nur und meldet Werte über das Tool `speichern` (kit/regeln.md, R1).

export type Feld = "name" | "anliegen" | "rueckruf" | "dringlichkeit";
export type Stand = Partial<Record<Feld, string>>;

export const FELDER: { feld: Feld; frage: string }[] = [
  { feld: "name", frage: "Wie ist Ihr Name?" },
  { feld: "anliegen", frage: "Worum geht es bei Ihrem Anliegen?" },
  { feld: "rueckruf", frage: "Unter welcher Nummer können wir Sie zurückrufen?" },
  { feld: "dringlichkeit", frage: "Ist es dringend, oder reicht ein Rückruf am nächsten Werktag?" },
];

/** Der feste Abschiedssatz. Aufgelegt wird erst, wenn der Agent ihn gesprochen hat (G5). */
export const ABSCHLUSS = "Danke, ich habe alles notiert und gebe es weiter. Sie werden zurückgerufen. Auf Wiederhören!";
export const NOTFALL = "Sag zuerst: Bei einem Notfall wählen Sie bitte sofort die eins eins zwei. Dieser Anrufbeantworter wird nicht laufend abgehört.";

const ZIFFERN = ["null", "eins", "zwo", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun"];
const ZIFFERWORT: Record<string, string> = { ein: "1", zwei: "2", ...Object.fromEntries(ZIFFERN.map((w, i) => [w, String(i)])) };
/** Gesprochene Ziffern („null eins zwo …“) in Ziffern wandeln; Transcriber liefern Nummern mal so, mal so. */
const zuZiffern = (s: string) => s.replace(/\p{L}+/gu, (w) => ZIFFERWORT[w.toLowerCase()] ?? w);

/** G13: Ziffern als Wörter, damit keine Sprach-Pipeline eine Nummer als Betrag oder englisch liest. „+“ wird „plus“. */
export function ziffernweise(nummer: string): string {
  return [...nummer].flatMap((z) => (z === "+" ? ["plus"] : /\d/.test(z) ? [ZIFFERN[Number(z)]] : [])).join(" ");
}

/** G6: Eine Bitte um Wiederholung ist keine Antwort. */
// Nur Formulierungen einer Bitte. Ein bloßes „noch einmal“ steht auch in echten Anliegen („schon wieder, noch einmal ausgefallen“).
const WIEDERHOLUNG = /(wiederholen|wie bitte|nicht verstanden|was war die frage|(sagen|fragen) sie (das |die frage )?noch ?(ein)?mal|^noch ?(ein)?mal,? bitte)/i;
export const istWiederholungsbitte = (text: string) => WIEDERHOLUNG.test(text);

// ponytail: Wortliste, kein Klassifikator; deckt die häufigen Fälle, nicht jede Formulierung.
const NOTFALL_WORTE = /notfall|lebensgefahr|brennt|feuer|rauch|(^|[^\p{L}])gas(?!t)|verletzt|bewusstlos|unfall/iu;

type Pruefung ={ ok: true; wert: string } | { ok: false; grund: string };
const STEUERZEICHEN = /[\u0000-\u001f\u007f]/g;

/** Wert für ein Feld prüfen und normalisieren. Der Server nimmt nur, was hier durchkommt. */
export function pruefeWert(feld: Feld, roh: string): Pruefung {
  const wert = roh.replace(STEUERZEICHEN, " ").replace(/\s+/g, " ").trim().slice(0, 500);
  if (!wert) return { ok: false, grund: "leer" };
  if (istWiederholungsbitte(wert)) return { ok: false, grund: "wiederholungsbitte" };
  if (feld === "rueckruf") {
    const nummer = zuZiffern(wert).replace(/(?!^\+)[^\d]/g, "");
    const ziffern = nummer.replace("+", "").length;
    return ziffern >= 6 && ziffern <= 15 ? { ok: true, wert: nummer } : { ok: false, grund: "nummer-unvollstaendig" };
  }
  if (feld === "dringlichkeit") {
    if (NOTFALL_WORTE.test(wert)) return { ok: true, wert: "notfall" };
    if (/(nicht|kein)\w* (so )?(dringend|eilig)|nächste|morgen|reicht|egal/i.test(wert)) return { ok: true, wert: "normal" };
    return /dringend|eilig|sofort|heute|schnell|ja/i.test(wert) ? { ok: true, wert: "dringend" } : { ok: true, wert: "normal" };
  }
  return { ok: true, wert };
}

const frage = (feld: Feld) => FELDER.find((f) => f.feld === feld)!.frage;
export const offen = (stand: Stand) => FELDER.filter((f) => !stand[f.feld]).map((f) => f.feld);

/** Anweisung an das Modell nach jedem Tool-Aufruf. G2: nennt immer alle offenen Felder und verbietet andere Fragen. */
export function anweisung(stand: Stand, zuletzt?: { feld: Feld; ergebnis: Pruefung }): string {
  const teile: string[] = [];
  if (zuletzt && !zuletzt.ergebnis.ok) {
    if (zuletzt.ergebnis.grund === "wiederholungsbitte")
      return `Das war keine Antwort, sondern eine Bitte um Wiederholung. Sprich nur diese Frage noch einmal, ohne Nachfrage und ohne Zusatz: ${frage(zuletzt.feld)}`;
    if (zuletzt.ergebnis.grund === "nummer-unvollstaendig")
      return "Die Nummer ist unvollständig. Bitte die Person, die ganze Rückrufnummer noch einmal langsam zu nennen, mit Vorwahl.";
    return `Der Wert war leer. Stelle die Frage noch einmal: ${frage(zuletzt.feld)}`;
  }
  // R7: Notfall-Hinweis, sobald ein Notfall-Wort im Anliegen oder in der Dringlichkeit steht, nicht erst am Ende.
  const notfallJetzt = (zuletzt?.feld === "anliegen" && NOTFALL_WORTE.test(stand.anliegen ?? "")) || (zuletzt?.feld === "dringlichkeit" && stand.dringlichkeit === "notfall");
  if (notfallJetzt) teile.push(NOTFALL);
  if (zuletzt?.feld === "rueckruf" && stand.rueckruf) teile.push(`Lies die Nummer genau so zur Bestätigung vor: ${ziffernweise(stand.rueckruf)}. Korrigiert die Person sie, rufe speichern erneut auf.`);
  const rest = offen(stand);
  if (!rest.length) {
    teile.push(`Alles ist notiert. Fragt die Person nichts mehr, sag wörtlich nur diesen Satz: ${ABSCHLUSS}`);
    return teile.join("\n");
  }
  teile.push(`Stelle jetzt nur diese Frage: ${frage(rest[0])}`);
  teile.push(`Noch offen, in dieser Reihenfolge, nur zur Orientierung: ${rest.join(", ")}. Stelle keine Frage, die nicht in dieser Liste steht.`);
  return teile.join("\n");
}

export type Turn = { wer: "agent" | "anrufer"; text: string };

const worte = (s: string) => new Set(s.toLowerCase().match(/[\p{L}\d]+/gu) ?? []);
/** Anteil der Wörter von `soll`, die in `text` vorkommen. */
export const anteil = (soll: string, text: string) => {
  const s = [...worte(soll)], t = worte(text);
  return s.length ? s.filter((w) => t.has(w)).length / s.length : 0;
};

/** G5: Auflegen ist eine reine Prüfung, bei jedem Update neu gerechnet, ohne gespeicherte Freigabe.
 *  Wahr nur, wenn alle Felder da sind und der Abschiedssatz des Agenten die letzte Äußerung ist,
 *  höchstens gefolgt von einem kurzen Gruß der Person („Tschüss“). Alles andere nach dem Abschied hält die Leitung offen. */
const GRUSS = /^(tschüss|tschau|ciao|danke( schön| ihnen)?|auf wiederhören|wiederhören|ok(ay)?|alles klar|bis dann)[\s.,!]*(tschüss|danke|auf wiederhören|wiederhören)?[\s.,!]*$/i;
export function auflegenErlaubt(stand: Stand, verlauf: Turn[]): boolean {
  const rest = verlauf.at(-1)?.wer === "anrufer" && GRUSS.test(verlauf.at(-1)!.text.trim()) ? verlauf.slice(0, -1) : verlauf;
  const letzter = rest.at(-1);
  return offen(stand).length === 0 && letzter?.wer === "agent" && anteil(ABSCHLUSS, letzter.text) >= 0.8;
}
