import { createHash, randomBytes } from "node:crypto";

/**
 * Edit tokens are 256-bit random values, base64url-encoded (43 characters).
 * Only the SHA-256 hash is stored, so a database leak does not leak working links.
 */
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export function createToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isWellFormedToken(token: unknown): token is string {
  return typeof token === "string" && TOKEN_RE.test(token);
}

/** Short one-way fingerprint for rate-limit buckets (keeps raw IPs and emails out of the table). */
export function fingerprint(value: string): string {
  return createHash("sha256").update(`svatba-rl:${value}`, "utf8").digest("hex").slice(0, 32);
}
