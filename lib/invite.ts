import { createHash, timingSafeEqual } from "node:crypto";

/**
 * The invitation key. Guests get a link like https://svatbajordanovi.cz/pozvanka?k=<code>;
 * the site checks the code once and remembers the browser with a cookie, so the
 * plain address keeps working for them afterwards.
 *
 * The cookie holds a hash of the code, never the code itself, and changing
 * INVITE_CODE logs every browser out.
 */
export const INVITE_PARAM = "k";
export const INVITE_COOKIE = "pozvanka";
/** Browsers cap cookie lifetime at 400 days; long enough to reach the wedding. */
export const INVITE_MAX_AGE = 400 * 24 * 60 * 60;

/** The configured code, or null. Unset in development means the site is open. */
export function inviteCode(): string | null {
  const code = process.env.INVITE_CODE?.trim();
  return code ? code : null;
}

/** Without a code, development stays open and production stays locked (fail closed). */
export function gateDisabled(): boolean {
  return inviteCode() === null && process.env.NODE_ENV !== "production";
}

export function inviteToken(code: string): string {
  return createHash("sha256").update(`svatba-pozvanka:${code}`).digest("hex");
}

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function isValidCode(candidate: string | null | undefined): boolean {
  const code = inviteCode();
  if (!code || !candidate) return false;
  return sameHash(inviteToken(candidate.trim()), inviteToken(code));
}

export function isValidCookie(value: string | undefined): boolean {
  const code = inviteCode();
  if (!code || !value) return false;
  return sameHash(value, inviteToken(code));
}
