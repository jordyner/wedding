import { attendanceLabel, type Attendance } from "@/lib/rsvp";

/**
 * Mirrors each saved answer into the hosts' Google Sheet through a small Apps Script
 * web app (integrations/google-sheet.gs). The database stays the source of truth:
 * this runs after the response is sent, and a failure here never affects the guest.
 * Off unless both env vars are set.
 */
export type SavedResponse = {
  id: string;
  fullName: string;
  email: string;
  attendance: Attendance;
  updatedAt: Date | string;
};

const TIMEOUT_MS = 10_000;

export function sheetConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SHEET_WEBHOOK_URL && process.env.GOOGLE_SHEET_SECRET);
}

export async function pushToSheet(r: SavedResponse): Promise<void> {
  const url = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  const secret = process.env.GOOGLE_SHEET_SECRET;
  if (!url || !secret) return;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret,
        id: r.id,
        name: r.fullName,
        email: r.email,
        attendance: attendanceLabel[r.attendance],
        updatedAt: new Date(r.updatedAt).toISOString(),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = (await res.json().catch(() => null)) as { ok?: boolean } | null;
    if (!res.ok || !body?.ok) console.error(`sheet sync failed: HTTP ${res.status}${body ? " (rejected)" : ""}`);
  } catch (err) {
    // No guest data in the log, only what went wrong.
    console.error(`sheet sync failed: ${(err as Error).name}`);
  }
}
