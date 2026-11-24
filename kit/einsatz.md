# Einsatz an einer Telefonanlage: Prüfpunkte

Dieser Abschnitt beschreibt, was vor einem echten Pilot geprüft werden muss. **Keiner der drei Punkte ist hier belegt.** Die Zahlen und Quellen sind Ausgangspunkte für die eigene Prüfung, kein Ergebnis.

## Anbindung

Der Agent hängt an der bestehenden Telefonanlage, nicht an einer neuen Nummer. Zwei übliche Wege:

1. **Weiterleitung bei „keine Antwort“ oder außerhalb der Geschäftszeiten** auf eine Nummer, die bei der Voice-Plattform importiert ist.
2. **SIP-Trunk oder SIP-URI** der Plattform als Ziel einer Regel in der Telefonanlage. Vapi beschreibt SIP-Anbindung unter https://docs.vapi.ai/advanced/sip; ob eine konkrete Anlage (zum Beispiel 3CX) dorthin weiterleiten kann und welche Codecs sie aushandelt, ist je Anlage zu prüfen.

Prüfpunkt **Anbindung**: ein Testanruf über die Anlage, der beim Agenten ankommt, mit Rufnummer des Anrufers im Call-Objekt und sauberem Auflegen auf beiden Seiten. Offen.

## Kosten

Rechnung je Minute, gegen die Alternative (etwa ein kostenpflichtiges Add-on der Telefonanlage):

```
Kosten pro Jahr = Anrufe pro Monat × 12 × mittlere Dauer in Minuten × Preis pro Minute
```

Preise laut Vapi-Preisseite, Stand Recherche 2026-11 (vor Einsatz neu lesen): Plattform 0,05 $/min; Beispielrechnung Deepgram + OpenAI + ElevenLabs rund 0,08 bis 0,13 $/min; Vapi-SIP-Transport ohne Aufpreis. Bei niedriger Frequenz entscheidet oft eine Grundgebühr (Nummer, Plan) mehr als der Minutenpreis.

Prüfpunkt **Kosten**: Rechnung mit echten Anrufzahlen aus der Anlage und aktuellen Preisen, jeder Preis mit Quelle und Datum. Offen.

## DSGVO

- **Region:** Vapi bietet eine EU-Region (`api.eu.vapi.ai`, eigene SIP-Endpunkte), laut Doku nur mit einem höheren Supportpaket: https://docs.vapi.ai/security-and-privacy/eu-region. Transcriber, Modell und Stimme brauchen je eigene EU-Endpunkte; ob alle drei im EU-Pfad laufen, ist je Anbieter zu prüfen.
- **Ansage:** Der Agent sagt im ersten Satz, dass er ein digitaler Anrufbeantworter ist und transkribiert. Die Audio-Aufnahme ist im Referenz-Agenten aus (`artifactPlan.recordingEnabled: false`). Eine Aufnahme ohne Einwilligung berührt in Deutschland § 201 StGB.
- **Zweck und Löschfrist:** Die weitergeleitete Nachricht dient dem Rückruf. Löschfrist für Transkripte bei der Plattform und für die Nachricht im Postfach festlegen und technisch umsetzen.
- **Verträge:** Auftragsverarbeitungsvertrag mit der Plattform und den Unteranbietern; Liste der Unterauftragsverarbeiter prüfen.

Prüfpunkt **DSGVO**: EU-Pfad je Komponente belegt, Ansage im Live-Call gehört, Löschfrist gesetzt und an einem Beispiel nachgeprüft, AVV abgeschlossen. Offen.
