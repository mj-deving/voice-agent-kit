// Wartezeit nach einem Transkript-Stück, je Frage- und Antworttyp. Die Plattform fragt nach jedem neuen Stück, wie lange
// sie warten soll, bevor der Agent spricht (bei Vapi: `call.endpointing.request`, Antwort `timeoutSeconds` 0 bis 15).
// Werte stammen aus einem gemessenen deutschen Telefon-Agenten; für einen Anrufbeantworter sind sie ein Startpunkt (kit/stellschrauben.md).

export type Nachricht = { role?: string; message?: string };

// G11: Wortanfang über Zeilenanfang oder Leerraum, nie `\b`. In JavaScript ist `\b` ASCII und trifft „ähm“ nicht.
export const DENKT_NOCH = /(?:^|\s)(und|weil|also|aber|dass|oder|denn|ähm|äh|hm|zum beispiel)[,.]?\s*$/i;
// G8: Ein Transcriber schreibt ein gesprochenes „Ähm“ manchmal als Artikel. Ein Artikel ohne Satzzeichen beendet keine Antwort.
const ARTIKEL_OFFEN = /(?:^|\s)(der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines)\s*$/i;
export const FAKTENFRAGE = /(name|dringend|eilig|stimmt das|richtig so|passt das)/i;
export const NUMMERNFRAGE = /(nummer|zurückrufen|erreichen)/i;

const bot = (m: Nachricht) => m.role === "bot" || m.role === "assistant";

/** Letzte Agenten-Äußerung und die Antwort seitdem. */
export function lesen(alle: Nachricht[]): { frage: string; antwort: string } {
  const ende = alle.findLastIndex(bot);
  // G10: Eine Agenten-Frage kommt oft in mehreren bot-Stücken. Alle bis zur vorigen Antwort zusammen lesen.
  let start = ende;
  while (start > 0 && bot(alle[start - 1])) start--;
  const frage = alle.slice(start, ende + 1).map((m) => m.message ?? "").join(" ");
  const antwort = alle.slice(ende + 1).filter((m) => m.role === "user").map((m) => m.message ?? "").join(" ").trim();
  return { frage, antwort };
}

export type Antworttyp = "fuellwort" | "nummer" | "fakt-satzende" | "fakt-offen" | "offen-satzende" | "offen-kurz";

/** Antworttyp und Wartezeit in Sekunden, nur aus Regeln. */
export function antworttyp(frage: string, antwort: string): { typ: Antworttyp; s: number } {
  if (DENKT_NOCH.test(antwort) || ARTIKEL_OFFEN.test(antwort)) return { typ: "fuellwort", s: 4 };
  const satzende = /[.!?…]\s*$/.test(antwort);
  // ponytail: Nummern werden in Gruppen diktiert; 2 s ist unbelegt und muss am eigenen Anrufermix gemessen werden.
  if (NUMMERNFRAGE.test(frage)) return { typ: "nummer", s: 2 };
  if (FAKTENFRAGE.test(frage)) return satzende ? { typ: "fakt-satzende", s: 0.25 } : { typ: "fakt-offen", s: 1.5 };
  // G9: Wörter zählen ab der letzten Agenten-Äußerung, nicht ab der ersten Frage.
  const woerter = antwort.split(/\s+/).filter(Boolean).length;
  return satzende && woerter >= 12 ? { typ: "offen-satzende", s: 1.5 } : { typ: "offen-kurz", s: 3 };
}

export const wartezeit = (alle: Nachricht[]) => {
  const { frage, antwort } = lesen(alle);
  return antworttyp(frage, antwort);
};
