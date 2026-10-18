import { describe, expect, it } from "vitest";
import { emailKey, nameKey, validateRsvp } from "@/lib/rsvp";

const base = { fullName: "Jiří Jordán", email: "jiri@example.com", attendance: "yes", accommodation: "both" };

describe("validateRsvp", () => {
  it("accepts a complete affirmative answer", () => {
    expect(validateRsvp(base)).toEqual({ ok: true, value: base });
  });

  it("requires every field and explains in Czech", () => {
    const r = validateRsvp({});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(["attendance", "email", "fullName"]);
      expect(r.errors.fullName).toMatch(/jméno/i);
    }
  });

  it("requires an explicit accommodation choice when attending", () => {
    const r = validateRsvp({ ...base, accommodation: undefined });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.accommodation).toBeDefined();
  });

  it.each(["no", "undecided"])("discards a stale accommodation for %s", (attendance) => {
    const r = validateRsvp({ ...base, attendance, accommodation: "both" });
    expect(r.ok && r.value.accommodation).toBe(null);
  });

  it.each(["none", "first", "second", "both"])("accepts accommodation %s", (accommodation) => {
    expect(validateRsvp({ ...base, accommodation }).ok).toBe(true);
  });

  it.each(["plain", "a@b", "a b@c.cz", "x".repeat(250) + "@a.cz"])("rejects email %s", (email) => {
    const r = validateRsvp({ ...base, email });
    expect(!r.ok && r.errors.email).toBeTruthy();
  });

  it("rejects unknown attendance and accommodation values", () => {
    expect(validateRsvp({ ...base, attendance: "maybe" }).ok).toBe(false);
    expect(validateRsvp({ ...base, accommodation: "three" }).ok).toBe(false);
  });

  it("normalises whitespace and limits name length, rejecting control characters", () => {
    const r = validateRsvp({ ...base, fullName: "  Jiří   Jordán " });
    expect(r.ok && r.value.fullName).toBe("Jiří Jordán");
    expect(validateRsvp({ ...base, fullName: "x".repeat(121) }).ok).toBe(false);
    expect(validateRsvp({ ...base, fullName: "Jiří\u0000Jordán" }).ok).toBe(false);
    expect(validateRsvp({ ...base, fullName: "Jiří‮Jordán" }).ok).toBe(false);
  });

  it("treats non-string input as invalid instead of crashing", () => {
    expect(validateRsvp({ ...base, fullName: { $ne: 1 }, email: ["a@b.cz"] }).ok).toBe(false);
  });

  it("builds case- and accent-insensitive identity keys", () => {
    expect(nameKey("Jiří  JORDÁN")).toBe(nameKey("jiri jordan"));
    expect(emailKey(" Jiri@Example.COM ")).toBe("jiri@example.com");
  });
});
