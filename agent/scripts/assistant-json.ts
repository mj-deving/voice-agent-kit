#!/usr/bin/env bun
// Gibt den Assistant-Body als JSON aus, zum Anlegen per API oder zum Vergleich mit dem Konto (agent/src/messung.ts abweichungen).
// Aufruf: bun agent/scripts/assistant-json.ts --firma "Muster GmbH" --server-url https://… --credential-id cred_…
import { parseArgs } from "node:util";
import { buildAssistant } from "../src/assistant";

const { values: v } = parseArgs({ options: { firma: { type: "string" }, "server-url": { type: "string" }, "credential-id": { type: "string" } } });
if (!v.firma || !v["server-url"] || !v["credential-id"]) throw new Error("Pflicht: --firma, --server-url, --credential-id");
console.log(JSON.stringify(buildAssistant({ firma: v.firma, serverUrl: v["server-url"], credentialId: v["credential-id"] }), null, 2));
