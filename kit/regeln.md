# Regeln für deutsche Voice-Agenten

Destilliert aus dem Bau eines eigenen deutschen Telefon-Agenten auf Vapi: drei Wochen, mehrere Hundert Test- und Live-Calls, 76 dokumentierte Fehler und Praxisbefunde. Die Regeln sind anbieter-neutral formuliert. Wo eine Regel nur für eine Plattform gilt, steht das dabei.

Belegstufen: **HIGH** heißt Primärquelle mit expliziter Aussage, **MED** indirekt, Einzelquelle oder eigene Messung, **LOW** Herstellerblog oder eigene Ableitung. „unbelegt“ heißt: niemand hat es gemessen, auch wir nicht.

## R1 · Kernregel: Zustand und Ablauf in den Server, Sprechweise in den Prompt

Ein Prompt ist eine Wahrscheinlichkeit, kein Programm. Was garantiert, gezählt oder geprüft sein muss, gehört in deterministischen Server-Code.

| Gehört in den Server | Gehört in den Prompt |
|---|---|
| Gesprächsstand über mehrere Turns: was beantwortet ist, was fehlt | Rolle und Identität |
| Welche Frage als Nächstes kommt, was übersprungen wird | Ton, Anrede, Kürze, Abwechslung |
| Ob ein Wert taugt (Nummer vollständig, Pflichtfeld da) | Wann welches Tool aufgerufen wird |
| Wann aufgelegt werden darf | Umgang mit Rückfragen, unklarem Audio, Manipulation |
| Wartezeit bis zur Antwort (Endpointing) | Guardrails als eigene Sektion |
| Zählen, Zeiten, Kosten, Weiterleitung | Die Regel, der Server-Anweisung zu folgen |

Der Server greift zwischen den Turns ein: über Tool-Ergebnisse, Endpointing-Antworten und Live-Control. Was im Turn selbst passiert, bleibt beim Prompt.

Quellen:

- Vapi nennt Prompts „probabilistic, not deterministic“ und rät, was das Modell nicht fälschen darf, über Server-Mechanismen abzusichern: https://docs.vapi.ai/prompting-guide [HIGH]
- Lange Prompts mit vielen, sich widersprechenden Anweisungen lassen Modelle den Fokus verlieren: https://docs.vapi.ai/squads [HIGH]
- Anthropic empfiehlt vordefinierte Code-Pfade und programmatische Gates zwischen Schritten für klar definierte Abläufe: https://www.anthropic.com/research/building-effective-agents [HIGH]
- OpenAI Agents SDK: Orchestrierung per Code ist deterministischer, schneller und günstiger: https://openai.github.io/openai-agents-python/multi_agent/ [HIGH]
- Pipecat Flows und Rasa CALM trennen Zustand im Framework vom Formulieren durch das LLM: https://docs.pipecat.ai/pipecat/flows/introduction, https://rasa.com/docs/learn/concepts/calm [HIGH]
- Mit steigender Zahl von Anweisungen sinkt die Befolgung, bei maximaler Dichte schafft das beste Modell 68 %: https://arxiv.org/abs/2507.11538 [HIGH, Übertragung MED]
- System-Prompt-Priorität setzt sich bei Konflikten nicht verlässlich durch: https://arxiv.org/abs/2502.15851 [HIGH]

Gegenstimme: Die Hersteller legen den Ablauf als Default in den Prompt und lagern erst bei nachgewiesener Schwäche aus (LiveKit: https://docs.livekit.io/agents/logic/workflows/). Die strengere Regel hier stützt sich auf eigene Befunde mit mehreren Modellen: Jeder Prompt-Satz gegen einen Ablauffehler wirkte nur teilweise, der Server-Weg vollständig.

## R2 · Jede Prompt-Änderung wird einzeln gemessen

Für jeden neuen Fehler ein weiterer Satz im Prompt: Die Sätze konkurrieren, der Prompt wächst, das Verhalten hält trotzdem nicht. Darum hat der Prompt ein Budget, und eine Änderung zählt erst mit einem Replay-Beleg gegen den alten Stand (siehe `replay.md`). Eine Änderung zur selben Zeit.

Quellen: https://docs.vapi.ai/prompting-guide (Änderungen gegen ein repräsentatives Testset prüfen), https://elevenlabs.io/docs/eleven-agents/best-practices/prompting-guide (eine Änderung zur selben Zeit, über 2.000 Tokens kostet Latenz) [HIGH].

## R3 · Erst die Ursache billig belegen, dann den Fix bauen

Bevor ein Fix gebaut wird: Offline-Replay des echten Kontexts, Latenz je Komponente zerlegen, Plattform-Log des Calls lesen. Zwei Fixes im Ursprungsprojekt zielten auf unbelegte Ursachen und änderten nichts. [MED, eigene Befunde]

## R4 · Erst das Messwerkzeug ausschließen, dann den Agenten beschuldigen

Mehrere „Agentenfehler“ waren Fehler im Messskript: Einwürfe vor dem ersten Wort gezählt, Testskripte, die in starrer Reihenfolge antworteten, ein Simulator mit anderem Modell als live. Ein Simulator-Befund zählt nur, wenn der Simulator die Live-Konfiguration nutzt. [MED, eigene Befunde]

## R5 · Ziele nicht nach Sicht auf Ergebnisse verschieben

Schwellen und Zählregeln werden vor der Messung gesetzt. Eine Neu-Setzung danach wird als solche benannt und begründet. Vor dem Setzen die Untergrenze rechnen: Wartezeit plus Pipeline-Latenz. [MED]

## R6 · Modellwechsel nur über ein Gate

„Neuer“ heißt nicht „besser“. Ein Modellwechsel braucht ganze Gespräche mit allen Pflichtfragen, keine übereifrigen Tool-Aufrufe, keine Einwürfe und eine nicht schlechtere Latenz. Nach jedem Wechsel alle modellabhängigen Werte neu messen (Wartezeiten, Prompt-Fixes, Replays). [MED]

## R7 · Notfälle gehören nicht auf einen Anrufbeantworter

Ein Anrufbeantworter, der „Notfall“ hört, verweist sofort auf die 112 und nimmt das Anliegen trotzdem weiter auf. Die Regel steht im Server (`agent/src/ablauf.ts`), nicht im Prompt. [LOW, eigene Ableitung, unbelegt]
