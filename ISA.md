---
phase: climbing
progress: 33/36
milestone: v1
milestone_progress: 33/33
name: "Voice Agent Kit"
task: "Lern-Kit und deutscher Anrufbeantworter-Agent auf Vapi"
slug: voice-agent-kit
started: 2026-11-24T09:57:26Z
updated: 2026-11-24T10:18:15Z
principal_stated_goal: null
---

# Voice Agent Kit

## Ideal State

### L3 · One sentence

Wer einen deutschen Voice-Agenten baut, findet hier in einer Stunde, wofür wir Wochen gebraucht haben: belegte Regeln, Defaults und Gotchas samt Wächter-Tests, und einen schlanken deutschen Anrufbeantworter-Agenten, an dem jede Regel als grüner Test sichtbar greift.

### L2 · Summary

Ein öffentliches Repo, das gelernte Voice-Agent-Praxis in prüfbare Form bringt: Kit zum Lesen, Agent zum Ausführen.

- Für Builder: Regeln, Defaults je Stellschraube und Gotchas mit Ursache, anbieter-neutral, jede Zeile mit Quelle oder als unbelegt markiert.
- Für Skeptiker: jedes übertragbare Gotcha hat im Anrufbeantworter-Agenten einen Test, der rot wird, wenn man den Fehler wieder einbaut.
- Für Prompt-Tüftler: ein Replay- und Messverfahren, mit dem eine Prompt-Änderung offline gegen echten Kontext gemessen wird statt gefühlt.
- Für das Profil des Autors: ein Fremder liest README und Code in zehn Minuten und sieht AI-Engineering-Seniority, ohne Kontext aus dem Ursprungsprojekt.

### L1 · Full articulation

Das Repo hat zwei Teile. **Das Kit** (`kit/`) destilliert, was ein deutscher Voice-Agent auf einer Plattform wie Vapi, Retell, ElevenLabs Agents oder Pipecat braucht. Die Kernregel steht vorn: Zustand und Ablauf gehören in den Server, Sprechweise gehört in den Prompt, und jede Prompt-Änderung wird gegen feste Szenarien gemessen. Daneben stehen Defaults je Stellschraube (Gesprächsmodell, Endpointing und Turn-Taking, Barge-in, Stimme und TTS, Transcriber, Prompt-Budget, Gesprächsdauer, Stille), jeweils mit Wert, Quelle, Belegstufe und dem Hinweis, was man selbst messen muss. Die Gotchas sind Zeilen mit Symptom, Ursache, Regel und Wächter-Idee. Das Replay- und Messverfahren beschreibt, wie man einen Gesprächskontext bis zum kritischen Turn schneidet, je Prompt-Fassung N Antworten zieht, mit Kontrollarm vergleicht und erst bei getrennten Spannen von „besser“ spricht. Die Testszenarien sind als Daten abgelegt, die jeder für seinen Agenten übernehmen kann.

**Der Referenz-Agent** (`agent/`) ist ein generischer deutscher Anrufbeantworter. Er nimmt Name, Anliegen, Rückrufnummer und Dringlichkeit auf, liest die Nummer zur Bestätigung zurück, fasst das Anliegen zusammen und leitet das Ergebnis per Webhook oder Mail weiter. Er kann an einer Telefonanlage hängen, etwa per SIP-Weiterleitung bei „keine Antwort“ oder außerhalb der Geschäftszeiten. Ein kleiner Bun-Server hält den Gesprächsstand, entscheidet die nächste Frage, Nachfrage und Auflegen und regelt die Wartezeit je Antwort. Der Prompt trägt nur Rolle, Ton, Kürze, Guardrails und Tool-Nutzung und hat ein gemessenes Budget. Die Assistant-Config ist Code und wird offline gegen die Kit-Regeln getestet. Jedes übertragbare Gotcha hat einen Test, der den Fehler als rote Gegenprobe zeigt. Echte Calls sind möglich, aber nicht nötig: `bun test` beweist alles offline.

Alle Daten im Repo sind synthetisch. Das Repo erwähnt das Ursprungsprojekt nur als „ein eigener deutscher Telefon-Agent“, ohne Firmennamen, interne Pfade oder Call-IDs.

## Problem

Das Ursprungsprojekt enthält 76 belegte Fehler und Praxiszeilen, ist aber nicht veröffentlichbar (zurückgehaltene Testdaten und Auftragsunterlagen in der Historie, Hunderte Commits mit internen Pfaden). Ohne Neubau bleibt das Gelernte privat.

## Out of Scope

- Kein GitHub-Remote, keine Veröffentlichung ohne ausdrückliches Go des Autors.
- Keine echten Vapi-Calls im Bau; der Live-Sync ist optional und braucht das Go des Autors plus Kostendeckel.
- Kein Evaluator, kein Golden-Set, keine Slack- oder n8n-Strecke, keine Bewertungsseite.
- Kein Squad mit Einwilligungs-Mitglied (Consent-Muster wird im Kit nur beschrieben).

## Constraints

- Das private Quellprojekt wird nur gelesen; nichts daraus wird ohne Sichtung kopiert.
- Nie gelesen oder kopiert: zurückgehaltene Testdaten und Auftragsunterlagen des Ursprungsprojekts.
- Keine Ticket-IDs, keine internen Pfade, keine Call-IDs, keine echten Personendaten im Repo.
- Secrets nur zur Laufzeit über die Umgebung; im Repo nur Platzhalter.
- Bun und TypeScript, keine On-demand-Runner (bunx, npx).

## Criteria

**Repo und Hygiene**

- [x] ISC-1: `bun test` im Repo-Root endet mit 0 fehlgeschlagenen Tests.
- [x] ISC-2: trufflehog filesystem über das Repo meldet 0 Funde.
- [x] ISC-3: trufflehog git über die lokale Historie meldet 0 Funde.
- [x] ISC-4: Anti: Repo enthält keinen Ursprungs-Firmennamen, keine Call-ID, keinen internen Pfad.
- [x] ISC-5: Anti: Repo hat keinen git-Remote konfiguriert.
- [x] ISC-6: Lokale Historie besteht aus thematisch sauberen Commits mit klaren Messages.
- [x] ISC-7: Anti: Kein Test oder Skript startet einen bezahlten Call ohne Kostendeckel.

**Kit**

- [x] ISC-8: `kit/regeln.md` stellt die Kernregel Server gegen Prompt mit Quellen vorn.
- [x] ISC-9: `kit/stellschrauben.md` nennt je Stellschraube Default, Quelle, Belegstufe, Messhinweis.
- [x] ISC-10: Stellschrauben decken Modell, Endpointing, Barge-in, Stimme, Transcriber, Prompt-Budget, Dauer, Stille.
- [x] ISC-11: `kit/gotchas.md` hat je Zeile Symptom, Ursache, Regel, Wächter-Idee.
- [x] ISC-12: Jede Gotcha-Zeile ist anbieter-neutral formuliert oder als anbieterspezifisch markiert.
- [x] ISC-13: `kit/replay.md` beschreibt Schnitt, N Ziehungen, Kontrollarm und Spannen-Regel.
- [x] ISC-14: `kit/szenarien.json` enthält die Testszenarien als maschinenlesbare synthetische Daten.
- [x] ISC-15: Anti: Keine Kit-Zeile behauptet einen Wert ohne Quelle oder „unbelegt“-Marke.

**Referenz-Agent**

- [x] ISC-16: Server entscheidet nächste Frage, Nachfrage und Auflegen ohne Modellaufruf.
- [x] ISC-17: Auflegen ist eine zustandslose Prüfung über den aktuellen Gesprächsstand.
- [x] ISC-18: Server wählt die Wartezeit je Antwort aus Frage- und Antworttyp.
- [x] ISC-19: Assistant-Config ist ein Build-Ergebnis aus Code, offline testbar.
- [x] ISC-20: System-Prompt bleibt unter dem im Test festgelegten Budget.
- [x] ISC-21: Replay-Werkzeug läuft gegen jeden OpenAI-kompatiblen Endpunkt mit Kontrollarm.
- [x] ISC-22: Jedes als übertragbar markierte Gotcha hat genau benannten Wächter-Test im Agenten.
- [x] ISC-23: Jeder Wächter-Test hat eine Gegenprobe, die den Fehler wieder einbaut und rot zeigt.
- [x] ISC-24: Anti: Ein fehlendes Webhook-Secret lässt den Server ablehnen statt offen starten.

**README und ISA**

- [x] ISC-25: README erklärt Kit, Agent, Schnellstart und Grenzen für Fremde ohne Vorwissen.
- [x] ISC-26: README verweist je Gotcha-Klasse auf Kit-Zeile und Wächter-Test.
- [x] ISC-27: Anti: README verspricht kein Live-Ergebnis, das nicht offline belegt ist.

**Anrufbeantworter**

- [x] ISC-28: Gespräch erfasst Name, Anliegen, Rückrufnummer und Dringlichkeit als Pflichtfelder.
- [x] ISC-29: Agent liest die Rückrufnummer ziffernweise zur Bestätigung zurück.
- [x] ISC-30: Nach Auflegen geht eine Zusammenfassung per Webhook an die konfigurierte URL.
- [x] ISC-31: Mail-Weiterleitung ist als zweiter Ausgang hinter derselben Schnittstelle konfigurierbar.
- [x] ISC-32: README beschreibt die Anbindung per SIP-Weiterleitung bei keiner Antwort.
- [x] ISC-33: Anti: Repo enthält keinen Namen und keine Daten eines späteren Einsatzkunden.

**Pilot-Abnahme (Meilenstein pilot, offen, nicht belegt)**

- [ ] ISC-34: Kostenrechnung Minutenpreis gegen die Kosten des bisherigen Telefonanlagen-Add-ons liegt vor.
- [ ] ISC-35: DSGVO-Pfad mit EU-Region, Aufzeichnungsansage und Löschfrist ist geprüft.
- [ ] ISC-36: Weiterleitung aus 3CX an den Agenten ist mit einem Testanruf belegt.

## Test Strategy

| isc | type | check | threshold | tool | anchors_to |
|---|---|---|---|---|---|
| ISC-1 | bash | ganze Suite grün | 0 fail | bun test | literal |
| ISC-2 | bash | Dateibaum ohne Fund | 0 Funde | trufflehog filesystem . --fail | literal |
| ISC-3 | bash | Historie ohne Fund | 0 Funde | trufflehog git file://. --fail | literal |
| ISC-4 | bun-test | Sperrliste über alle Dateien | 0 Treffer | bun test test/hygiene.test.ts -t sperrliste | literal |
| ISC-5 | bash | kein Remote | leer | git remote -v | derived: nichts veröffentlichen |
| ISC-6 | manual | Commit-Folge gelesen | thematisch | git log --oneline | literal |
| ISC-7 | bun-test | Call-Start nur über Deckel | 0 Ausnahmen | bun test test/hygiene.test.ts -t deckel | derived: Kostendeckel |
| ISC-8 | bun-test | Kernregel vorn mit Quellen | vorhanden | bun test test/kit.test.ts -t kernregel | literal |
| ISC-9 | bun-test | Pflichtspalten je Stellschraube | alle gefüllt | bun test test/kit.test.ts -t stellschrauben | literal |
| ISC-10 | bun-test | acht Stellschrauben-Gruppen | 8/8 | bun test test/kit.test.ts -t abdeckung | literal |
| ISC-11 | bun-test | Pflichtspalten je Gotcha | alle gefüllt | bun test test/kit.test.ts -t gotchas | literal |
| ISC-12 | bun-test | neutral oder markiert | jede Zeile | bun test test/kit.test.ts -t neutral | literal |
| ISC-13 | bun-test | vier Verfahrensteile benannt | 4/4 | bun test test/kit.test.ts -t replay | literal |
| ISC-14 | bun-test | Szenarien parsen, synthetisch | valide | bun test test/kit.test.ts -t szenarien | literal |
| ISC-15 | bun-test | keine leere Quelle | 0 leer | bun test test/kit.test.ts -t quelle | derived: Belege vor Behauptung |
| ISC-16 | bun-test | Ablauf ohne Modell | grün | bun test agent/test/ablauf.test.ts | literal |
| ISC-17 | bun-test | Auflegen zustandslos | grün | bun test agent/test/ablauf.test.ts -t Auflegen | derived: Gotcha zustandsloses Auflegen |
| ISC-18 | bun-test | Wartezeit je Typ | grün | bun test agent/test/endpointing.test.ts | literal |
| ISC-19 | bun-test | Config aus Code | grün | bun test agent/test/assistant.test.ts | literal |
| ISC-20 | bun-test | Prompt unter Budget | unter Budget | bun test agent/test/assistant.test.ts -t budget | literal |
| ISC-21 | bun-test | Replay gegen Fake-Endpunkt | grün | bun test agent/test/replay.test.ts | literal |
| ISC-22 | bun-test | Gotcha-IDs gegen Testnamen | 1:1 | bun test test/kit.test.ts -t waechter | literal |
| ISC-23 | bun-test | Gegenprobe je Wächter | rot bei Fehler | bun test test/kit.test.ts -t gegenprobe | derived: Wächter fängt Rückfall |
| ISC-24 | bun-test | Start ohne Secret | Ablehnung | bun test agent/test/server.test.ts -t secret | derived: fail-closed |
| ISC-25 | manual | Fremd-Lesung README | versteht ohne Vorwissen | nicht-geforkter Lese-Agent | literal |
| ISC-26 | bun-test | Verweise auflösbar | alle | bun test test/kit.test.ts -t readme | literal |
| ISC-27 | manual | Versprechen gegen Tests | keine Lücke | nicht-geforkter Lese-Agent | derived: Belege vor Behauptung |
| ISC-28 | bun-test | vier Pflichtfelder vor Abschied | alle gefüllt | bun test agent/test/ablauf.test.ts -t pflichtfelder | literal |
| ISC-29 | bun-test | Nummer ziffernweise zurückgelesen | grün | bun test agent/test/ablauf.test.ts -t rueckruf | derived: Zahlen-Gotchas |
| ISC-30 | bun-test | Webhook gegen lokalen Empfänger | Body angekommen | bun test agent/test/weiterleitung.test.ts -t webhook | literal |
| ISC-31 | bun-test | Mail-Ausgang mit Fake-Transport | Mail erzeugt | bun test agent/test/weiterleitung.test.ts -t mail | literal |
| ISC-32 | bash | SIP-Abschnitt vorhanden | 1+ Treffer | rg -n "SIP" README.md | literal |
| ISC-33 | bun-test | Sperrliste aus Datei außerhalb des Repos | 0 Treffer | bun test test/hygiene.test.ts -t sperrliste | literal |
| ISC-34 | manual | Rechnung mit Quelle je Preis | offen | kit/einsatz.md § Kosten | literal |
| ISC-35 | manual | Prüfung gegen DSGVO-Punkte | offen | kit/einsatz.md § DSGVO | literal |
| ISC-36 | manual | Testanruf über 3CX | offen | Testanruf nach Go mit Kostendeckel | literal |

## Not yet specified

- Zeitpunkt und Ort der Veröffentlichung (GitHub-Repo anlegen und pushen) entscheidet der Autor.

## Decisions

- 2026-11-24 Übertragbare Quellzeilen: 44 Gotchas, G1 bis G32 mit Wächter-Test und Gegenprobe, G33 bis G44 als Regel ohne Test (Messarbeit). Docker-, Slack-, n8n- und Evaluator-Spezifika entfallen.
- 2026-11-24 Evidenz v1: `bun test` 59 pass, 0 fail; trufflehog filesystem und git Exit 0 mit 0 Funden; 0 Remotes; 4 thematische Commits (3e1f8f7, bfacc5c, 289aeb1, 79c799d). Falsifier: vier eingeschleuste Fehler (Gegenprobe entfernt, falsche Testzuordnung, privater Pfad, Fremd-Import) machen je einen Wächter rot. Die Kit- und Hygiene-Kriterien ISC-4, 7 bis 15, 22, 23, 26 und 33 prüfen `test/kit.test.ts` und `test/hygiene.test.ts`; der Sperrlisten-Test fand beim ersten Lauf einen gesperrten Namen im ISA, der Fund ist behoben. ISC-25 und ISC-27 warten auf die Fremd-Lesung.
- 2026-11-24 Fremd-Lesung 1 (nicht-geforkter Sonnet, rund 50 Versprechen geprüft) fand drei Code-Fehler und mehrere Überversprechen. Behoben: Rückrufnummern in Worten werden jetzt in Ziffern gewandelt (vorher abgelehnt); „noch einmal“ im Anliegen gilt nicht mehr als Wiederholungsbitte; ein kurzer Gruß nach dem Abschiedssatz verhindert das Auflegen nicht mehr; Notfall wird schon im Anliegen erkannt (R7); der Notfall-Satz ist ziffernfrei und G13 prüft jetzt jeden festen Sprechsatz. Gegenproben bei G4, G6, G13, G15, G17, G19, G22 richten jetzt dieselbe Prüfung gegen die alte Variante. Doku: README nennt Mail als unverdrahteten Baustein, CONTROL_TOKEN als nötig (Startwarnung ergänzt), Begriffe, verlauf.json-Format, Kostendeckel ohne Retries; Hygiene-Test läuft auch ohne git (ZIP-Fall: 4 pass). Schnellstart per curl geprüft: health 200, Webhook mit Secret 200, ohne 401. `bun test` 60 pass, 0 fail.
- 2026-11-24 Fremd-Lesung 2 (frischer Sonnet, rund 40 Versprechen) fand zwei Schnellstart-Blocker und drei Lücken. Behoben: Server im Hintergrund desselben Terminals (geprüft: health 200, Webhook 200); Tunnel-Hinweis und Credential-Schritt; Begriffe Belegstufe und Arm; Notfall erkennt „Gasleck“ und „Gas strömt“, nicht „Gast“ (Probe); ein fehlgeschlagenes Auflegen wird beim nächsten Update wiederholt (neuer Test, mit alter Variante rot); README sagt ehrlich, dass Endpointing-Zustellung nur offline getestet ist. `bun test` 61 pass, 0 fail. Damit ISC-25 und ISC-27 abgehakt; v1 33/33.

- 2026-11-24 · refined: Use Case ist ein generischer deutscher Anrufbeantworter (Name, Anliegen, Rückrufnummer, Dringlichkeit; Weiterleitung per Webhook oder Mail; SIP-fähig). Anlass: ein eigener Anrufbeantworter als Alternative zu einem kostenpflichtigen Telefonanlagen-Add-on. Eine Einsatzinstanz entsteht später getrennt und privat.
- 2026-11-24 · Die Sperrliste mit Namen, die nicht ins Repo gehören, liegt außerhalb des Repos; der Hygiene-Test liest sie nur, damit das Repo die Namen nicht selbst enthält.  Ohne Datei prüft der Test nur generische Muster und warnt.
- 2026-11-24 · Kosten, DSGVO und Telefonanlagen-Anbindung bleiben offene Prüfpunkte (ISC-34 bis 36); das Kit beschreibt sie als Checkliste und markiert sie nicht als belegt.
- 2026-11-24 · refined: Eine Einsatzinstanz des Anrufbeantworters ist als Pilot geplant. ISC-34 bis 36 sind damit Abnahmekriterien des Pilots (Meilenstein pilot), keine Ideen. Die Instanz selbst entsteht getrennt und privat, nicht in diesem Repo; das Kit bleibt generisch. Meilenstein v1 ist ISC-1 bis 33.

- 2026-11-24 · Veröffentlichungsvorbereitung: Lizenz MIT. Das ISA wird bereinigt mitveröffentlicht, weil es die Arbeitsweise belegt. Die Historie bleibt erhalten; eine Export-Kopie schreibt nur die Autor-Mail auf die GitHub-noreply-Adresse um. Das Arbeits-Repo bleibt unverändert und lokal.

## Articulation Log

### 2026-11-24 09:57 · scaffold
Umfang laut Autor: Lern-Kit plus Referenz-Agent. Restate von L3 und L2 und Use Case vor dem Bau offen.

### 2026-11-24 · Use-Case-Wechsel
Anrufbeantworter als Use Case festgelegt; drei offene Prüfpunkte aufgenommen. L3 und L2 angepasst, Bestätigung durch den Autor weiter offen.

### 2026-11-24 · restate — bestätigt
Autor: „Ja, bauen“ auf L3 und L2 mit Anrufbeantworter als Use Case.
