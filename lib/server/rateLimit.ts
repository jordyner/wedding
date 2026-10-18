import type { Db } from "./db";

/**
 * Fixed-window counter stored in Postgres. Good enough for a wedding-sized site and
 * needs no extra service. Returns true when the request is within the limit.
 */
export async function hit(db: Db, bucket: string, limit: number, windowSeconds: number): Promise<boolean> {
  const { rows } = await db.query<{ hits: number }>(
    `insert into rate_limits (bucket, window_start, hits)
     values ($1, to_timestamp(floor(extract(epoch from now()) / $2) * $2), 1)
     on conflict (bucket, window_start) do update set hits = rate_limits.hits + 1
     returning hits`,
    [bucket, windowSeconds],
  );
  if (Math.random() < 0.02) {
    await db.query(`delete from rate_limits where window_start < now() - interval '2 days'`);
  }
  return Number(rows[0].hits) <= limit;
}

export const LIMITS = {
  /** New submissions from one network per hour (families often share Wi-Fi). */
  submitPerIp: { limit: 30, window: 3600 },
  /** Link emails to one inbox per hour, across submissions and recovery. */
  emailsPerInbox: { limit: 6, window: 3600 },
  /** Edits through one link per hour. */
  editsPerToken: { limit: 40, window: 3600 },
  /** Recovery requests from one network per hour. */
  recoverPerIp: { limit: 10, window: 3600 },
} as const;
