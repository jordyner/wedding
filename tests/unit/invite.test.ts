import { afterEach, describe, expect, it, vi } from "vitest";
import { gateDisabled, inviteToken, isValidCode, isValidCookie } from "@/lib/invite";

afterEach(() => vi.unstubAllEnvs());

describe("invitation key", () => {
  it("accepts the configured code and its cookie, nothing else", () => {
    vi.stubEnv("INVITE_CODE", "jaro27");
    expect(isValidCode("jaro27")).toBe(true);
    expect(isValidCode("jaro28")).toBe(false);
    expect(isValidCode("")).toBe(false);
    expect(isValidCookie(inviteToken("jaro27"))).toBe(true);
    expect(isValidCookie(inviteToken("jaro28"))).toBe(false);
    expect(isValidCookie("jaro27")).toBe(false);
  });

  it("never stores the code itself in the cookie", () => {
    expect(inviteToken("jaro27")).not.toContain("jaro27");
  });

  it("changing the code signs every browser out", () => {
    vi.stubEnv("INVITE_CODE", "jaro27");
    const old = inviteToken("jaro27");
    vi.stubEnv("INVITE_CODE", "leto28");
    expect(isValidCookie(old)).toBe(false);
  });

  it("stays locked in production when no code is configured", () => {
    vi.stubEnv("INVITE_CODE", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(gateDisabled()).toBe(false);
    expect(isValidCode("anything")).toBe(false);
    vi.stubEnv("NODE_ENV", "development");
    expect(gateDisabled()).toBe(true);
  });
});
