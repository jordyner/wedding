/** Applies lib/server/schema.ts to DATABASE_URL. Safe to run repeatedly. */
import { Client } from "pg";
import { schemaSql } from "../lib/server/schema.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (put it in .env.local or the environment).");
  process.exit(1);
}

const client = new Client({ connectionString: url });
await client.connect();
await client.query(schemaSql);
await client.end();
console.log("Schema is up to date.");
