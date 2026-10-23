import { describe, expect, it } from "vitest";
import { emailKey, nameKey, validateRsvp } from "@/lib/rsvp";

const base = { fullName: "Jiří Jordán", email: "jiri@example.com", attendance: "yes", accommodation: null };

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

  it.each(["yes", "no", "undecided"])("needs no accommodation and stores none for %s", (attendance) => {
    const r = validateRsvp({ ...base, attendance, accommodation: undefined });
    expect(r.ok && r.value.accommodation).toBe(null);
    const sent = validateRsvp({ ...base, attendance, accommodation: "both" });
    expect(sent.ok && sent.value.accommodation).toBe(null);
  });

  it.each(["plain", "a@b", "a b@c.cz", "x".repeat(250) + "@a.cz"])("rejects email %s", (email) => {
    const r = validateRsvp({ ...base, email });
    expect(!r.ok && r.errors.email).toBeTruthy();
  });

  it("rejects unknown attendance values", () => {
    expect(validateRsvp({ ...base, attendance: "maybe" }).ok).toBe(false);
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
