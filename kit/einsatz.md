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

## EU-Betrieb

Ein Telefon-Agent ist eine Kette aus fünf Gliedern. „Läuft in der EU“ gilt erst, wenn jedes Glied einzeln belegt ist. Stand der Quellen: Recherche 2026-11; vor einem Einsatz neu lesen.

| Glied | EU-Option | Grenze oder offen | Quelle |
|---|---|---|---|
| Orchestrierung (Vapi) | EU-Region mit eigenen Endpunkten `api.eu.vapi.ai`, `dashboard.eu.vapi.ai`, `sip.eu.vapi.ai` und festen EU-Egress-IPs. Jede Organisation gehört genau einer Region. | Nur mit dem höchsten Supportpaket (Premier, über Sales). Ohne dieses Paket verarbeitet Vapi in den USA; Übermittlung laut Vapi über Standardvertragsklauseln. Endpointing, Unterbrechung und Füllsätze laufen immer auf Vapis Infrastruktur, auch mit eigenen Anbietern dahinter. | https://docs.vapi.ai/security-and-privacy/eu-region, https://docs.vapi.ai/billing/pricing-and-success-packages, https://vapi.ai/privacy, https://docs.vapi.ai/security-and-privacy/GDPR, https://docs.vapi.ai/security-and-privacy/data-flow |
| Telefonie | Eigener SIP-Trunk auf `sip.eu.vapi.ai`; mit einem EU-Carrier bleibt der Telefonie-Teil in eigener Hand (eigene Ableitung). | Ob über Vapi gekaufte Nummern oder Twilio/Telnyx im EU-Pfad terminieren: **unbelegt**. | https://docs.vapi.ai/security-and-privacy/eu-region |
| Transcriber und Endpointing | Deepgram hat einen EU-Endpunkt (`api.eu.deepgram.com`); die Vapi-Credential hat ein Feld `apiUrl`. Speechmatics ist in Vapi mit Region `eu` dokumentiert. Die Endpointing-Entscheidung des Referenz-Agenten fällt auf dem eigenen Server (`custom-endpointing-model`), dessen Standort ihr wählt. | Ob Vapi über `apiUrl` tatsächlich Deepgrams EU-Endpunkt nutzt: **unbelegt**. Eine deutsche Wortfehlerrate je Anbieter fehlt (siehe [stellschrauben.md](stellschrauben.md)). | https://developers.deepgram.com/docs/deploy-eu-endpoint, https://docs.vapi.ai/providers/transcriber/speechmatics, https://docs.vapi.ai/api-reference/assistants/create |
| Sprachmodell | Azure OpenAI „Data Zone Standard EU“ (EU Data Boundary samt EFTA); AWS Bedrock in `eu-central-1` über das EU-Geo-Profil, Aufbewahrung abschaltbar; OpenAI über `eu.api.openai.com` mit regionaler Speicherung und Inferenz. Andere Endpunkte bindet Vapi über `custom-llm` (OpenAI-kompatible URL) an. | Azure bietet in Frankfurt regional kein Chat-Modell, nur die Data Zone. OpenAI EU braucht Freigabe durch Sales, eine Vereinbarung zur Aufbewahrung und kostet laut Anbieter 10 % Aufschlag. Anthropic direkt bietet keine EU-Inferenz. OpenRouter EU nur für Business- und Enterprise-Konten. Ein Modellwechsel für den EU-Pfad läuft über R6 wie jeder andere. | https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/deployment-types, https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure-region-availability, https://docs.aws.amazon.com/bedrock/latest/userguide/geographic-cross-region-inference.html, https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html, https://learn.microsoft.com/en-us/azure/ai-foundry/responsible-ai/openai/data-privacy, https://developers.openai.com/api/docs/guides/your-data, https://platform.claude.com/docs/en/manage-claude/data-residency, https://openrouter.ai/docs/features/privacy-and-logging, https://docs.vapi.ai/customization/custom-llm/using-your-server |
| Stimme (TTS) | ElevenLabs EU-Residenz über `https://api.eu.residency.elevenlabs.io`, gesetzt im Feld `apiUrl` einer eigenen Vapi-Credential. | Welcher ElevenLabs-Plan EU-Residenz enthält: **unbelegt**, die Preisseite nennt es nicht. | https://docs.vapi.ai/api-reference/assistants/create, https://elevenlabs.io/pricing/api |

Quer zu allen Gliedern:

- Speicherort EU heißt nicht, dass US-Behörden keinen Zugriff haben: Der CLOUD Act erfasst Daten bei US-Anbietern unabhängig vom Speicherort. https://www.law.cornell.edu/uscode/text/18/2713
- Ob die Unterauftragsverarbeiter einer Plattform im EU-Setup in der EU verarbeiten, ist je Anbieter **unbelegt** und gehört in die AVV-Prüfung.
- Wie viel Latenz die EU-Region kostet, ist **unbelegt**; vor dem Umzug messen wie jede andere Stellschraube.
- Vapis eigenes Transkript lässt sich abschalten (`artifactPlan.transcriptPlan.enabled: false`); der Referenz-Agent braucht es nicht, weil der Server die Felder selbst hält. https://docs.vapi.ai/security-and-privacy/data-flow

Prüfpunkt **EU-Betrieb**: für jedes der fünf Glieder Endpunkt, Vertrag und eine Probe (ein Testcall, dessen Logs beim Anbieter die Region zeigen). Offen.

## DSGVO

- **Region:** Wo jedes Glied der Kette verarbeitet, steht im Abschnitt [EU-Betrieb](#eu-betrieb).
- **Ansage:** Der Agent sagt im ersten Satz, dass er ein digitaler Anrufbeantworter ist und transkribiert. Die Audio-Aufnahme ist im Referenz-Agenten aus (`artifactPlan.recordingEnabled: false`). Eine Aufnahme ohne Einwilligung berührt in Deutschland § 201 StGB.
- **Zweck und Löschfrist:** Die weitergeleitete Nachricht dient dem Rückruf. Löschfrist für Transkripte bei der Plattform und für die Nachricht im Postfach festlegen und technisch umsetzen.
- **Verträge:** Auftragsverarbeitungsvertrag mit der Plattform und den Unteranbietern; Liste der Unterauftragsverarbeiter prüfen.

Prüfpunkt **DSGVO**: EU-Pfad je Komponente belegt, Ansage im Live-Call gehört, Löschfrist gesetzt und an einem Beispiel nachgeprüft, AVV abgeschlossen. Offen.
