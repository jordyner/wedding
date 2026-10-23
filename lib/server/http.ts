import "server-only";
import { after, NextResponse } from "next/server";
import { getDb, StorageUnavailableError } from "./db";
import { getMailer } from "./mailer";
import type { Deps, OnSaved } from "./rsvpService";
import { pushToSheet, sheetConfigured } from "./sheet";

const MAX_BODY_BYTES = 4_096;

export const noStore = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: noStore });
}

export function siteUrl(): string {
  if (process.env.PUBLIC_SITE_URL) return process.env.PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export function deps(): Deps {
  return { db: getDb(), mailer: getMailer(), siteUrl: siteUrl(), onSaved: sheetHook() };
}

/** Mirrors saved answers to the Google Sheet after the response is sent (see lib/server/sheet.ts). */
export function sheetHook(): OnSaved | undefined {
  if (!sheetConfigured()) {
    console.warn("[sheet] not configured: GOOGLE_SHEET_WEBHOOK_URL or GOOGLE_SHEET_SECRET is missing");
    return undefined;
  }
  return (r) => after(() => pushToSheet(r));
}

/** Network identity for rate limiting. Vercel sets x-forwarded-for; the value is hashed before storage. */
export function clientKey(req: Request): string {
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/**
 * Parses a small JSON body from a same-origin browser request.
 * Returns null for anything else; the caller answers 400/403.
 */
export async function readJson(req: Request): Promise<Record<string, unknown> | "forbidden" | null> {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin) {
    try {
      if (new URL(origin).host !== host) return "forbidden";
    } catch {
      return "forbidden";
    }
  }
  if (!req.headers.get("content-type")?.includes("application/json")) return null;
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return null;
  try {
    const body = JSON.parse(text);
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

/** Honeypot: a visually hidden field people never fill in. */
export function looksAutomated(body: Record<string, unknown>): boolean {
  return typeof body.website === "string" && body.website.trim() !== "";
}

export function storageError(err: unknown) {
  // Log the failure class only: never request bodies, emails, or tokens.
  console.error("[rsvp] storage error:", err instanceof StorageUnavailableError ? "not configured" : (err as Error)?.message);
  return json({ status: "error", reason: "storage" }, 503);
}
