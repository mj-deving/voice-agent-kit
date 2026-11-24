import { describe, expect, test } from "bun:test";
import { antworttyp, DENKT_NOCH, lesen, wartezeit } from "../src/endpointing";

const OFFEN = "Worum geht es bei Ihrem Anliegen?";

describe("Endpointing", () => {
  test("G7 endet die Antwort auf Bindewort oder Füllwort, wird gewartet", () => {
    expect(antworttyp(OFFEN, "Es geht um die Heizung, und").typ).toBe("fuellwort");
    expect(antworttyp(OFFEN, "Es geht um die Heizung, weil").s).toBe(4);
    // gegenprobe: dieselbe Antwort ohne Bindewort am Ende gilt nicht als Denkpause
    expect(antworttyp(OFFEN, "Es geht um die Heizung.").typ).not.toBe("fuellwort");
  });

  test("G8 ein Artikel ohne Satzzeichen am Ende beendet keine Antwort", () => {
    expect(antworttyp(OFFEN, "Ich habe ein Problem mit der").typ).toBe("fuellwort");
    // gegenprobe: mit Punkt ist es ein Satzende, kein Füllwort
    expect(antworttyp(OFFEN, "Genau das.").typ).not.toBe("fuellwort");
  });

  test("G9 Wörter zählen ab der letzten Agenten-Äußerung", () => {
    const verlauf = [
      { role: "bot", message: OFFEN },
      { role: "user", message: "Ich habe seit gestern ein Problem mit der Anlage im Keller, sie macht Geräusche und läuft nicht." },
      { role: "bot", message: "Verstehe, erzählen Sie gern weiter." },
      { role: "user", message: "Kurz." },
    ];
    expect(lesen(verlauf).antwort).toBe("Kurz.");
    expect(wartezeit(verlauf).typ).toBe("offen-kurz");
    // gegenprobe: zählt man ab der ersten Frage, wirkt „Kurz.“ wie das Ende einer langen Antwort
    const seitFrage = verlauf.filter((m) => m.role === "user").map((m) => m.message).join(" ");
    expect(antworttyp(OFFEN, seitFrage).typ).toBe("offen-satzende");
  });

  test("G10 eine Agenten-Frage aus mehreren bot-Stücken wird zusammen gelesen", () => {
    const verlauf = [{ role: "bot", message: "Danke." }, { role: "bot", message: "Unter welcher Nummer können wir Sie zurückrufen?" }, { role: "user", message: "Null eins" }];
    expect(lesen(verlauf).frage).toContain("Danke. Unter welcher Nummer");
    expect(wartezeit(verlauf).typ).toBe("nummer");
    // gegenprobe: nur das letzte Stück gelesen, fehlt bei „Danke.“ als letztem Stück die Frage ganz
    const nurLetztes = [{ role: "bot", message: "Unter welcher Nummer?" }, { role: "bot", message: "Danke." }].at(-1)!.message;
    expect(nurLetztes).not.toContain("Nummer");
  });

  test("G11 kein \\b vor Umlauten", () => {
    expect(DENKT_NOCH.test("Also ähm")).toBe(true);
    // gegenprobe: mit \b greift das Muster bei „ähm“ nie, weil \b in JavaScript nur ASCII kennt
    expect(/\b(ähm)\s*$/i.test("Also ähm")).toBe(false);
  });

  test("G12 eine Faktenantwort mit Satzende wechselt schnell, eine offene erst nach langer Antwort", () => {
    expect(antworttyp("Wie ist Ihr Name?", "Erika Beispiel.").s).toBe(0.25);
    expect(antworttyp("Wie ist Ihr Name?", "Erika").s).toBe(1.5);
    expect(antworttyp(OFFEN, "Die Heizung.").s).toBe(3);
    // gegenprobe: eine feste Wartezeit für alles wäre entweder für den Namen zu langsam oder für das Anliegen zu ungeduldig
    expect(antworttyp("Wie ist Ihr Name?", "Erika Beispiel.").s).not.toBe(antworttyp(OFFEN, "Die Heizung.").s);
  });
});
