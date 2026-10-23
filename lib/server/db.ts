import "server-only";
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";

/** Minimal query interface, implemented by `pg` in the app and by PGlite in unit tests. */
export type Db = {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
};

export class StorageUnavailableError extends Error {}

let pool: Pool | null = null;

export function getDb(): Db {
  // DATABASE_URL is what Vercel's Neon integration sets; POSTGRES_URL is its older name.
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) throw new StorageUnavailableError("DATABASE_URL is not configured");
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      max: Number(process.env.DB_POOL_MAX ?? 3),
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 8_000,
    });
    // Lets Vercel Fluid compute close idle connections before a function instance is suspended.
    attachDatabasePool(pool);
  }
  return pool;
}
