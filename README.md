# voice-agent-kit

Ein Lern-Kit für deutsche Telefon-Voice-Agenten und ein schlanker Referenz-Agent, an dem 32 der 44 Gotchas des Kits als Test mit Gegenprobe greifen.

Das Kit ist aus dem Bau eines eigenen deutschen Telefon-Agenten auf [Vapi](https://vapi.ai) entstanden: drei Wochen, mehrere Hundert Test- und Live-Calls, 76 dokumentierte Fehler. Was davon übertragbar ist, steht hier als Regeln, Defaults und 44 Gotchas (dokumentierte Fehler), jeweils mit Ursache und Wächter-Idee, also dem Test, der den Rückfall fangen würde. Die Rohdaten der eigenen Messungen liegen nicht im Repo; Werte, die nur auf ihnen beruhen, tragen die Belegstufe MED oder LOW. Der Referenz-Agent ist ein deutscher Anrufbeantworter: Er nimmt Name, Anliegen, Rückrufnummer und Dringlichkeit auf und leitet die Nachricht per Webhook weiter. Ein Mail-Ausgang liegt als Baustein bei.

**Die eine Regel, aus der alles folgt:** Zustand und Ablauf gehören in den Server, die Sprechweise in den Prompt. Ein Prompt ist eine Wahrscheinlichkeit. Was garantiert, gezählt oder geprüft sein muss, gehört in Code. Begründung und Quellen: [kit/regeln.md](kit/regeln.md).

## Was drin ist

| Teil | Datei | Wofür |
|---|---|---|
| Regeln | [kit/regeln.md](kit/regeln.md) | Sieben Regeln mit Belegstufe und Quellen, Kernregel zuerst |
| Stellschrauben | [kit/stellschrauben.md](kit/stellschrauben.md) | Defaults für Modell, Endpointing, Barge-in, Stimme, Transcriber, Prompt-Budget, Dauer, Stille, je mit Quelle und dem, was ihr selbst messen müsst |
| Gotchas | [kit/gotchas.md](kit/gotchas.md) | 44 Fehler mit Symptom, Ursache, Regel, Wächter-Idee, Geltung (neutral oder Vapi) und Test |
| Replay | [kit/replay.md](kit/replay.md) | Wie eine Prompt-Änderung offline gegen echten Gesprächskontext gemessen wird, mit Kontrollarm, Wilson-Spannen und Kostendeckel |
| Szenarien | [kit/szenarien.json](kit/szenarien.json) | Acht synthetische Testanrufe, je eine Fehlerklasse, als Daten für eigene Simulationen; die Tests prüfen nur ihre Struktur |
| Einsatz | [kit/einsatz.md](kit/einsatz.md) | Prüfpunkte für den Betrieb an einer Telefonanlage: Anbindung, Kosten, DSGVO |
| Referenz-Agent | [agent/](agent/) | Server, Assistant-Config als Code, Replay-Werkzeug, Tests |

## Schnellstart

Voraussetzung: [Bun](https://bun.sh) ab 1.4. Es gibt keine Abhängigkeiten zu installieren.

```bash
bun test
```

Das prüft den Agenten (Ablauf, Endpointing, Config, Weiterleitung, Server, Messung, Replay) und das Kit selbst: dass jede Gotcha mit Testangabe auf einen echten Test zeigt, dass jeder dieser Tests eine Gegenprobe hat und dass dieses README jede Gotcha-ID nennt.

Den Server lokal starten und prüfen. Das Secret einmal erzeugen und aufheben, denselben Wert hinterlegt ihr später bei Vapi:

```bash
export WEBHOOK_SECRET=$(openssl rand -hex 24)
```

```bash
bun agent/src/main.ts
```

```bash
curl -s localhost:3000/health
```

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/webhook -H "x-webhook-secret: $WEBHOOK_SECRET" -d '{"message":{"type":"status-update"}}'
```

`/health` antwortet mit 200, der Webhook mit dem richtigen Secret ebenfalls, ohne Secret mit 401.

## Begriffe

| Begriff | Bedeutung |
|---|---|
| Endpointing | Die Entscheidung, wann die Person fertig gesprochen hat und der Agent antworten darf |
| Barge-in | Die Person spricht, während der Agent noch redet; der Agent hört dann auf oder nicht |
| Live-Control-URL | Eine URL je laufendem Call, über die der Server den Agenten stumm schalten oder auflegen kann |
| Gegenprobe | Teil eines Tests: dieselbe Prüfung gegen eine nachgebaute alte, fehlerhafte Variante, die rot werden muss |
| Wilson-Spanne | Ein 95-%-Vertrauensbereich für eine Trefferquote, der auch bei kleinen Stichproben (10 Läufe) hält |

## Wie der Agent arbeitet

```
Anrufer ──► Vapi (Transcriber → Modell → Stimme) ──► Webhook-Server
                     ▲                                  │
                     └── Tool-Ergebnis: nächste Anweisung┘
```

- Das Modell hat genau ein Tool, `speichern(feld, wert)`. Der Server prüft den Wert, legt ihn im Gesprächsstand ab und antwortet mit der nächsten Anweisung: welche Frage jetzt dran ist, welche danach offen sind, oder der feste Abschiedssatz. Das steht in [agent/src/ablauf.ts](agent/src/ablauf.ts).

- Das Modell kann nicht auflegen. Der Server legt über die Live-Control-URL auf, sobald alle vier Felder da sind und der Abschiedssatz des Agenten die letzte Äußerung im Gespräch ist, höchstens gefolgt von einem kurzen Gruß wie „Tschüss“. Sagt die Person danach noch etwas anderes, bleibt die Leitung offen. Die Prüfung ist zustandslos und läuft bei jedem Update neu (G5, G19, G28).

- Die Wartezeit bis zur Antwort entscheidet der Server je Antworttyp: kurz nach einer Faktenantwort, lang nach „ähm“ oder einem offenen „und“. Siehe [agent/src/endpointing.ts](agent/src/endpointing.ts).

- Nennt die Person einen Notfall (Gas, Feuer, Verletzte), verweist der Agent sofort auf die 112 und nimmt das Anliegen weiter auf. Die Erkennung ist eine Wortliste, kein Klassifikator.

- Nach dem Gespräch geht die Nachricht an alle Ausgänge. Fehlt ein Feld, steht das in der Nachricht, damit niemand eine halbe Nachricht für vollständig hält. Siehe [agent/src/weiterleitung.ts](agent/src/weiterleitung.ts).

## Betrieb

Umgebungsvariablen des Servers:

| Variable | Pflicht | Bedeutung |
|---|---|---|
| `WEBHOOK_SECRET` | ja, mindestens 16 Zeichen | Erwarteter Wert im Header `x-webhook-secret`. Ohne gültiges Secret startet der Server nicht (G22). |
| `PORT` | nein, Default 3000 | Port des Servers |
| `WEITERLEITUNG_URL` | praktisch ja | Ziel für die fertige Nachricht als JSON-POST (Ticket-System, Chat-Webhook, eigener Dienst). Fehlt sie, startet der Server mit einer Warnung, und Nachrichten gehen verloren. |
| `CONTROL_TOKEN` | ja, sonst legt der Server nie auf | Bearer-Token für die Live-Control-URL. Die Config schaltet die Authentifizierung dort immer ein. Welcher Vapi-Schlüssel hier gilt, steht in der Vapi-Doku zu Call Control; im Repo ist das **nicht belegt**. |

Die Assistant-Config entsteht aus Code, nicht im Dashboard:

1. Bei Vapi eine Server-Credential anlegen, die den Header `x-webhook-secret` mit eurem `WEBHOOK_SECRET` setzt, und ihre ID notieren.

2. Den Body erzeugen:

```bash
bun agent/scripts/assistant-json.ts --firma "Muster GmbH" --server-url https://example.org/webhook --credential-id <id> > assistant.json
```

3. `assistant.json` an die Assistant-API von Vapi schicken (`POST /assistant`, Bearer-Token im Header) und der Nummer zuordnen. Feldnamen und Defaults vorher gegen die aktuelle API-Referenz prüfen.

**Mail statt oder neben Webhook:** `mailAusgang(transport, an, von)` in [agent/src/weiterleitung.ts](agent/src/weiterleitung.ts) nimmt einen beliebigen Transport (SMTP-Client, Mail-API) als Funktion und ist getestet. Verdrahtet ist er nicht, weil das Repo keine Abhängigkeit mitbringt: In [agent/src/main.ts](agent/src/main.ts) neben dem Webhook-Ausgang in die Liste `ausgaenge` hängen. Der Betreff wird von Zeilenumbrüchen befreit (G32).

## SIP und Telefonanlage

Der Agent soll an einer bestehenden Telefonanlage hängen, nicht an einer neuen Nummer. Zwei übliche Wege: Die Anlage leitet bei „keine Antwort“ oder außerhalb der Geschäftszeiten auf eine bei Vapi importierte Nummer weiter, oder eine Regel der Anlage zeigt per SIP auf Vapi ([SIP-Doku](https://docs.vapi.ai/advanced/sip)).

Ob eine konkrete Anlage das kann, was es pro Minute kostet und ob der Datenpfad DSGVO-tauglich ist, ist hier **nicht belegt**. Die Prüfpunkte stehen in [kit/einsatz.md](kit/einsatz.md).

## Replay: Prompt-Änderungen messen statt hoffen

```bash
OPENAI_BASE_URL=https://api.openai.com/v1 OPENAI_API_KEY=... bun agent/scripts/replay.ts \
  --verlauf verlauf.json --bis "wiederholen" --n 10 \
  --max-usd 0.50 --usd-pro-aufruf 0.002 --erwartet "Unter welcher Nummer" \
  alt.txt neu.txt
```

- `verlauf.json` ist das Transkript eines echten Calls als Liste `[{ "role": "assistant" | "user", "content": "…" }]`. `--bis` schneidet es nach der ersten Anrufer-Äußerung, die auf den Regex passt.

- `alt.txt` und `neu.txt` sind System-Prompts als Text. Der erste ist immer die Kontrolle.

- Ein Arm heißt nur besser, wenn die 95-%-Spannen sich nicht überlappen.

- Liegt die Kostenschätzung über `--max-usd`, startet nichts. Die Schätzung rechnet ohne Wiederholungen bei 429 oder 5xx; bis zu vier Versuche je Aufruf sind möglich, also den Deckel mit Puffer setzen.

Verfahren und ein Beispiel aus dem Ursprungsprojekt: [kit/replay.md](kit/replay.md). Dessen Verlauf und Prompts liegen nicht im Repo.

## Gotchas nach Klasse

Alle 44 stehen mit Ursache und Regel in [kit/gotchas.md](kit/gotchas.md). G1 bis G32 haben einen Test mit Gegenprobe, G33 bis G44 sind Regeln für Messarbeit, die sich nicht im Agenten-Code festhalten lassen.

| Klasse | IDs |
|---|---|
| Ablauf und Gesprächsstand | G1, G2, G3, G4, G5, G6, G19 |
| Turn-Taking und Endpointing | G7, G8, G9, G10, G11, G12, G17 |
| Zahlen und Stimme | G13, G14, G15, G16, G37, G38 |
| Plattform-Defaults und Config | G18, G27, G41, G42 |
| Server und Betrieb | G20, G21, G22, G28, G29, G30, G31, G32, G40 |
| Messung und Belege | G23, G24, G25, G26, G33, G34, G35, G36, G39, G43, G44 |

## Grenzen

- Der Referenz-Agent ist mit Tests belegt, nicht mit Live-Calls aus diesem Repo. Wer ihn einsetzt, misst Endpointing und Barge-in an echten Anrufern neu.

- Die Wartezeiten sind an einem anderen deutschen Telefon-Agenten gemessen. Für einen Anrufbeantworter sind sie ein Startpunkt; die 2 Sekunden nach Nummernfragen sind unbelegt.

- Kosten, DSGVO und Anbindung an eine konkrete Telefonanlage sind offene Prüfpunkte, keine Ergebnisse.

- Feldnamen folgen Vapi. Die Regeln selbst gelten für jede Plattform, die Webhooks oder Tool-Aufrufe zwischen den Turns erlaubt.

## Hygiene

`test/hygiene.test.ts` prüft, dass keine privaten Pfade oder IDs im Repo stehen, dass der Server-Code nur eigene Dateien und `node:`-Module importiert und dass jedes Skript mit bezahltem Aufruf über den Kostendeckel läuft. Eine zusätzliche Wortliste mit Namen, die nicht ins Repo gehören, liest der Test aus `$VOICE_KIT_SPERRLISTE` oder `~/.config/voice-agent-kit/sperrliste.txt`, also bewusst von außerhalb des Repos.
