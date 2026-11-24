// Weiterleitung nach dem Anruf: eine Nachricht, beliebig viele Ausgänge hinter derselben Schnittstelle.
import { offen, type Stand } from "./ablauf";

export type Nachricht = { callId: string; vollstaendig: boolean; fehlt: string[]; name?: string; anliegen?: string; rueckruf?: string; dringlichkeit?: string; zusammenfassung: string };
export type Ausgang = (n: Nachricht) => Promise<void>;

export function nachricht(callId: string, stand: Stand): Nachricht {
  const fehlt = offen(stand);
  const kopf = stand.dringlichkeit === "notfall" ? "NOTFALL gemeldet" : stand.dringlichkeit === "dringend" ? "Dringender Rückruf" : "Rückruf";
  const zusammenfassung = [
    `${kopf}: ${stand.name ?? "(Name fehlt)"}, ${stand.rueckruf ?? "(Nummer fehlt)"}.`,
    `Anliegen: ${stand.anliegen ?? "(fehlt)"}`,
    fehlt.length ? `Gespräch unvollständig, es fehlt: ${fehlt.join(", ")}.` : "",
  ].filter(Boolean).join("\n");
  return { callId, vollstaendig: !fehlt.length, fehlt, ...stand, zusammenfassung };
}

/** JSON per POST. Ein Status außerhalb 2xx ist ein Fehler, kein Erfolg (G20: Wirkung am Ziel zählt). */
export const webhookAusgang = (url: string, f: typeof fetch = fetch): Ausgang => async (n) => {
  const r = await f(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(n) });
  if (!r.ok) throw new Error(`Webhook ${r.status}`);
};

export type Mail = { an: string; von: string; betreff: string; text: string };
/** G32: Anrufertext landet nie roh in einem Header. Zeilenumbrüche im Betreff würden neue Header einschleusen. */
export const betreffSicher = (s: string) => s.replace(/[\r\n\u0000-\u001f]+/g, " ").slice(0, 120);
/** Mail über einen beliebigen Transport (SMTP-Client, Mail-API). Der Transport ist die einzige Abhängigkeit nach außen. */
export const mailAusgang = (transport: (m: Mail) => Promise<void>, an: string, von: string): Ausgang => (n) =>
  transport({ an, von, betreff: betreffSicher(`${n.dringlichkeit === "normal" || !n.dringlichkeit ? "Rückruf" : "DRINGEND"}: ${n.name ?? "Unbekannt"}`), text: n.zusammenfassung });

/** Alle Ausgänge, keiner blockiert den anderen. Fehler werden zurückgegeben, nie verschluckt. */
export async function weiterleiten(n: Nachricht, ausgaenge: Ausgang[]): Promise<string[]> {
  const r = await Promise.allSettled(ausgaenge.map((a) => a(n)));
  return r.flatMap((x) => (x.status === "rejected" ? [String((x.reason as Error)?.message ?? x.reason)] : []));
}
