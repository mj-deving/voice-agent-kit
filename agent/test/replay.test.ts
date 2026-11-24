import { describe, expect, test } from "bun:test";
import { replay, schneiden, type Msg } from "../src/replay";

const verlauf: Msg[] = [
  { role: "assistant", content: "Worum geht es bei Ihrem Anliegen?" },
  { role: "user", content: "Können Sie das wiederholen?" },
  { role: "assistant", content: "Worum geht es bei Ihrem Anliegen?" },
  { role: "user", content: "Um eine Wartung." },
];

describe("Replay", () => {
  test("schneiden bis zur ersten passenden Anrufer-Äußerung, ohne Treffer null", () => {
    expect(schneiden(verlauf, /wiederholen/)).toHaveLength(2);
    expect(schneiden(verlauf, /gibt es nicht/)).toBeNull();
  });

  test("Kontrollarm gegen neuen Prompt an einem OpenAI-kompatiblen Endpunkt", async () => {
    // Lokaler Fake-Endpunkt: der alte Prompt hängt eine Nachfrage an, der neue nicht.
    const server = Bun.serve({
      port: 0,
      fetch: async (req) => {
        const body = (await req.json()) as { messages: Msg[] };
        const neu = body.messages[0].content.includes("NEU");
        return Response.json({ choices: [{ message: { content: neu ? "Worum geht es bei Ihrem Anliegen?" : "Worum geht es? Und seit wann?" } }] });
      },
    });
    try {
      const r = await replay(
        { baseUrl: `http://localhost:${server.port}`, apiKey: "test", model: "fake", temperature: 0.2, maxTokens: 250 },
        [{ name: "alt", system: "ALT" }, { name: "neu", system: "NEU" }],
        schneiden(verlauf, /wiederholen/)!, 6, (a) => !a.includes("seit wann"),
      );
      expect(r.kontrolle).toMatchObject({ name: "alt", treffer: 0, n: 6 });
      expect(r.arme[0]).toMatchObject({ name: "neu", treffer: 6, n: 6, urteil: "besser" });
    } finally { server.stop(true); }
  });

  test("Fehler zählen nicht als Treffer und nicht als Lauf", async () => {
    const f = (async () => new Response("", { status: 400 })) as unknown as typeof fetch;
    const r = await replay({ baseUrl: "http://x", apiKey: "", model: "m", temperature: 0, maxTokens: 10, fetch: f }, [{ name: "a", system: "" }, { name: "b", system: "" }], verlauf, 3, () => true);
    expect(r.kontrolle).toMatchObject({ treffer: 0, n: 0, fehler: 3 });
    expect(r.arme[0].urteil).toBe("zu wenig Läufe");
  });
});
