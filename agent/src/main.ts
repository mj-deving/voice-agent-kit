#!/usr/bin/env bun
// Startet den Webhook-Server. Konfiguration nur aus der Umgebung (siehe README § Betrieb).
import { erstelleServer, konfiguration } from "./server";
import { webhookAusgang, type Ausgang } from "./weiterleitung";

const k = konfiguration(process.env);
const ausgaenge: Ausgang[] = k.weiterleitungUrl ? [webhookAusgang(k.weiterleitungUrl)] : [];
if (!ausgaenge.length) console.error("WEITERLEITUNG_URL fehlt: Nachrichten werden nirgends hin weitergeleitet.");

// G21, zweites Netz: ein verlorenes Promise loggt, statt den Prozess samt aller laufenden Gespräche zu beenden.
process.on("unhandledRejection", (e) => console.error(`unhandledRejection: ${(e as Error)?.message ?? e}`));

const handle = erstelleServer({ secret: k.secret, ausgaenge, controlToken: k.controlToken });
Bun.serve({ port: k.port, fetch: handle });
console.error(`Anrufbeantworter-Server auf Port ${k.port}`);
