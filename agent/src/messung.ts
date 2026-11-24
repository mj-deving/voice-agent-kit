// Messwerkzeuge: Kostendeckel, Spannen, Gate und Config-Vergleich. Anbieter-neutral, ohne Netzwerk außer `mitWiederholung`.

/** G23: Jeder bezahlte Lauf hat einen Deckel und stoppt vor dem ersten Request, wenn die Schätzung darüber liegt. */
export async function mitDeckel<T>(d: { maxUsd?: number; schaetzungUsd: number }, start: () => Promise<T>): Promise<T> {
  if (!(typeof d.maxUsd === "number" && d.maxUsd > 0)) throw new Error("Kein Kostendeckel gesetzt (--max-usd).");
  if (!(d.schaetzungUsd <= d.maxUsd)) throw new Error(`Schätzung ${d.schaetzungUsd.toFixed(2)} $ liegt über dem Deckel ${d.maxUsd} $.`);
  return start();
}

/** Wilson-Intervall (95 %) für eine Trefferquote. */
export function spanne(treffer: number, n: number): { lo: number; hi: number } {
  if (n === 0) return { lo: 0, hi: 1 };
  const z = 1.96, p = treffer / n, nenner = 1 + (z * z) / n;
  const mitte = (p + (z * z) / (2 * n)) / nenner, rand = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / nenner;
  return { lo: Math.max(0, mitte - rand), hi: Math.min(1, mitte + rand) };
}

/** G24: „Besser“ oder „schlechter“ nur bei getrennten Spannen und mindestens zwei Läufen je Arm. */
export function vergleich(neu: { treffer: number; n: number }, kontrolle: { treffer: number; n: number }) {
  if (neu.n < 2 || kontrolle.n < 2) return "zu wenig Läufe" as const;
  const a = spanne(neu.treffer, neu.n), b = spanne(kontrolle.treffer, kontrolle.n);
  return a.lo > b.hi ? ("besser" as const) : a.hi < b.lo ? ("schlechter" as const) : ("nicht unterscheidbar" as const);
}

/** G25: Ein Einwurf (Agent fällt ins Wort) macht das Gate rot, egal wie schnell der Arm ist. */
export const gate = (arm: { einwuerfe: number; medianS: number; zielS: number }) =>
  arm.einwuerfe === 0 && arm.medianS <= arm.zielS ? ("gruen" as const) : ("rot" as const);

/** G26: Eine Messung zählt nur, wenn die Plattform jede Soll-Einstellung des Arms auch übernommen hat (gelesen am Call). */
export function uebernommen(soll: unknown, ist: unknown, pfad = ""): string[] {
  if (soll && typeof soll === "object" && !Array.isArray(soll))
    return Object.entries(soll).flatMap(([k, v]) => uebernommen(v, (ist as any)?.[k], `${pfad}.${k}`));
  return JSON.stringify(soll) === JSON.stringify(ist) ? [] : [`${pfad || "."}: soll ${JSON.stringify(soll)}, ist ${JSON.stringify(ist)}`];
}

/** G27: Config-Diff in beide Richtungen. Ein Feld oder Array-Element, das nur im Konto steht, ist auch eine Abweichung. */
export function abweichungen(soll: unknown, ist: unknown, pfad = ""): string[] {
  const obj = (x: unknown) => x !== null && typeof x === "object";
  if (Array.isArray(soll) && Array.isArray(ist)) {
    const laenge = soll.length === ist.length ? [] : [`${pfad}: Länge soll ${soll.length}, ist ${ist.length}`];
    return [...laenge, ...Array.from({ length: Math.max(soll.length, ist.length) }, (_, i) => abweichungen(soll[i], ist[i], `${pfad}[${i}]`)).flat()];
  }
  if (obj(soll) && obj(ist) && !Array.isArray(soll) && !Array.isArray(ist)) {
    const keys = new Set([...Object.keys(soll as object), ...Object.keys(ist as object)]);
    return [...keys].flatMap((k) => abweichungen((soll as any)[k], (ist as any)[k], `${pfad}.${k}`));
  }
  return JSON.stringify(soll) === JSON.stringify(ist) ? [] : [`${pfad || "."}: soll ${JSON.stringify(soll)}, ist ${JSON.stringify(ist)}`];
}

/** G29: 429 und 5xx werden mit Pause wiederholt; ein retry-after des Servers gilt. */
export async function mitWiederholung(anfrage: () => Promise<Response>, o: { versuche?: number; warte?: (ms: number) => Promise<void> } = {}) {
  const versuche = o.versuche ?? 4, warte = o.warte ?? ((ms: number) => Bun.sleep(ms));
  for (let i = 1; ; i++) {
    const r = await anfrage();
    if ((r.status !== 429 && r.status < 500) || i >= versuche) return r;
    const ra = Number(r.headers.get("retry-after"));
    await warte(Number.isFinite(ra) && ra > 0 ? ra * 1000 : 500 * 2 ** (i - 1));
  }
}
