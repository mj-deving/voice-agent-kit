# Replay- und Messverfahren

Eine Prompt-Änderung wird offline gegen echten Gesprächskontext gemessen, bevor sie live geht. Das kostet Cent und Minuten statt Testanrufe, und es misst genau den Turn, an dem der Fehler passiert ist.

Werkzeug: `agent/scripts/replay.ts` (Kern in `agent/src/replay.ts`, Tests in `agent/test/replay.test.ts`). Es läuft gegen jeden OpenAI-kompatiblen `/chat/completions`-Endpunkt.

## 1. Schnitt

Nimm das Transkript eines echten Calls, in dem der Fehler passiert ist. Schneide den Verlauf bis einschließlich der Anrufer-Äußerung, nach der der Agent falsch reagiert hat (`--bis` als Regex). Ohne Treffer bricht das Werkzeug ab, statt den ganzen Verlauf zu nehmen.

Der Kontext muss dem entsprechen, was das Modell live sah: dieselben Rollen, dieselben Tool-Ergebnisse, derselbe System-Prompt-Rahmen. Ein Replay ohne Tool-Ergebnisse misst ein anderes System (Gotcha G34).

## 2. Ziehungen

Je Prompt-Fassung N Antworten mit dem Live-Modell und der Live-Temperatur ziehen, Default N = 10. Fehler (HTTP 4xx, leere Antwort) zählen weder als Treffer noch als Lauf. 429 und 5xx werden mit Pause wiederholt (G29).

Was ein Treffer ist, steht vor dem Lauf fest (`--erwartet`), nie danach (Regel R5).

## 3. Kontrollarm

Der erste Prompt ist immer der unveränderte Live-Prompt. Ohne Kontrollarm ist ein Treffer von 10 von 10 nichts wert: Vielleicht hätte der alte Prompt auf genau diesem Kontext auch bestanden. Im Beispiel unten änderte ein zusätzlicher Prompt-Satz gegenüber der Kontrolle nichts.

## 4. Spannen

Ein Arm heißt nur dann besser oder schlechter, wenn die 95-%-Spannen (Wilson) der Trefferquoten sich nicht überlappen und jeder Arm mindestens zwei gültige Läufe hat. Sonst lautet das Urteil „nicht unterscheidbar“ (G24). Für Latenz-Unterschiede unter 0,3 s braucht es mindestens sechs Calls je Arm.

## Kosten

Jeder Lauf braucht `--max-usd` und eine Schätzung je Aufruf (`--usd-pro-aufruf`). Liegt die Schätzung über dem Deckel, startet nichts (G23).

## Beispiel aus dem Ursprungsprojekt

Fehler: Auf „Kannst du die Frage wiederholen?“ stellte der Agent die Nachfrage statt der Frage. Replay mit N = 10 und Temperatur 0,2:

| Arm | Ergebnis |
|---|---|
| Kontrolle (alter Prompt) | 10 von 10 stellen die Nachfrage |
| Ein zusätzlicher Satz im Ablauf-Abschnitt | 10 von 10 stellen die Nachfrage |
| Regel ohne „nur … ohne Nachfrage“ | 7 von 10 hängen die Nachfrage an |
| Regel „nur dieselbe Frage, ohne Nachfrage“ | 10 von 10 wiederholen nur die Frage |

Erst der letzte Arm ging live. Der Referenz-Agent setzt dieselbe Regel zusätzlich im Server durch (G6).

## Andere Messungen

- **Turn-Taking:** Einwürfe aus der Stereo-Aufnahme am Turn-Wechsel zählen, nicht aus dem Unterbrechungs-Zähler der Plattform (G17). Ein Gate wird rot bei jedem Einwurf (G25).
- **Config-Arme:** Jeden Call gegen die Soll-Einstellung lesen, bevor er zählt (G26).
- **Reihenfolge:** billige Schicht zuerst. Offline-Replay und Text-Simulation, dann Cent-Proben, große Läufe genau einmal auf der eingefrorenen Konfiguration.
