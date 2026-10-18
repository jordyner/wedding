/**
 * Local Postgres for development and tests: PGlite (real Postgres compiled to WASM)
 * behind a wire-protocol socket, so the app talks to it with the same `pg` driver it
 * uses for Neon in production.
 *
 *   npm run db:local                 persistent, port 54329, data in .data/pglite
 *   LOCAL_DB_MEMORY=1 PORT=54330 ... throwaway, used by Playwright
 */
import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { schemaSql } from "../lib/server/schema.ts";

const port = Number(process.env.PORT ?? 54329);
const memory = process.env.LOCAL_DB_MEMORY === "1";
if (!memory) mkdirSync(".data", { recursive: true });

const db = await PGlite.create(memory ? undefined : ".data/pglite");
await db.exec(schemaSql);

const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 8 });
await server.start();
console.log(`Local Postgres ready: postgres://postgres@127.0.0.1:${port}/postgres`);

async function shutdown() {
  await server.stop();
  await db.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
