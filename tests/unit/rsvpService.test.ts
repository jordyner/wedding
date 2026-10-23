import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/server/db";
import type { MailMessage, MailResult, Mailer } from "@/lib/server/mailer";
import { schemaSql } from "@/lib/server/schema";
import { getByToken, recoverLinks, submitRsvp, updateByToken } from "@/lib/server/rsvpService";
import { hashToken, isWellFormedToken } from "@/lib/server/tokens";

class FakeMailer implements Mailer {
  sent: MailMessage[] = [];
  failWith: string | null = null;
  async send(m: MailMessage): Promise<MailResult> {
    if (this.failWith) return { ok: false, error: this.failWith };
    this.sent.push(m);
    return { ok: true, id: `msg_${this.sent.length}` };
  }
  lastToken(): string {
    const m = this.sent.at(-1)!.text.match(/\/odpoved\/([A-Za-z0-9_-]{43})/);
    return m![1];
  }
}

let pg: PGlite;
let db: Db;
let mailer: FakeMailer;
const siteUrl = "https://svatbajordanovi.cz";
const deps = () => ({ db, mailer, siteUrl });
const ip = "203.0.113.7";

const answer = (over: Record<string, unknown> = {}) => ({
  submissionId: randomUUID(),
  fullName: "Jiří Jordán",
  email: "jiri@example.com",
  attendance: "yes",
  accommodation: "both",
  ...over,
});

async function rows() {
  return (await db.query<Record<string, unknown>>("select * from rsvp_responses order by created_at")).rows;
}

beforeEach(async () => {
  pg = await PGlite.create();
  await pg.exec(schemaSql);
  db = { query: (text, params) => pg.query(text, params) as never };
  mailer = new FakeMailer();
});

describe("submitRsvp", () => {
  it("persists the response and emails a private edit link", async () => {
    const res = await submitRsvp(deps(), answer(), ip);
    expect(res).toEqual({ status: "saved", email: "sent" });

    const [row] = await rows();
    expect(row).toMatchObject({ full_name: "Jiří Jordán", attendance: "yes", accommodation: "both", email_status: "sent" });
    expect(row.created_at).toBeInstanceOf(Date);

    const mail = mailer.sent[0];
    expect(mail.to).toBe("jiri@example.com");
    expect(mail.text).toContain("Obě noci");
    expect(mail.html).toContain("Upravit odpověď");
    expect(mail.idempotencyKey).toMatch(/^rsvp\/.+\/confirmation\/1$/);

    // Only the hash is stored, and the URL carries neither name nor email.
    const token = mailer.lastToken();
    expect(isWellFormedToken(token)).toBe(true);
    const stored = (await db.query<{ token_hash: string }>("select token_hash from rsvp_edit_tokens")).rows;
    expect(stored).toEqual([{ token_hash: hashToken(token) }]);
    expect(mail.text).not.toMatch(/odpoved\/[^\s]*jiri/i);
  });

  it("stores each attendance/accommodation combination distinctly", async () => {
    for (const [i, a] of [
      ["yes", "none"],
      ["yes", "first"],
      ["yes", "second"],
      ["yes", "both"],
      ["no", "both"],
      ["undecided", "first"],
    ].entries()) {
      await submitRsvp(deps(), answer({ email: `g${i}@example.com`, attendance: a[0], accommodation: a[1] }), ip);
    }
    const r = await rows();
    expect(r.map((x) => [x.attendance, x.accommodation])).toEqual([
      ["yes", "none"],
      ["yes", "first"],
      ["yes", "second"],
      ["yes", "both"],
      ["no", null],
      ["undecided", null],
    ]);
  });

  it("treats a retried request as the same submission (no duplicate row, no second email)", async () => {
    const body = answer();
    await submitRsvp(deps(), body, ip);
    const again = await submitRsvp(deps(), body, ip);
    expect(again).toEqual({ status: "saved", email: "sent" });
    expect(await rows()).toHaveLength(1);
    expect(mailer.sent).toHaveLength(1);
  });

  it("lets the same person answer again; the latest answer replaces the old one", async () => {
    await submitRsvp(deps(), answer(), ip);
    const res = await submitRsvp(deps(), answer({ fullName: "jiri  JORDAN", email: "JIRI@example.com", attendance: "no" }), ip);
    expect(res).toEqual({ status: "saved", email: "sent" });
    const r = await rows();
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ attendance: "no", accommodation: null });
    expect(mailer.sent).toHaveLength(2);
    expect(mailer.sent.at(-1)!.to).toBe("jiri@example.com");
  });

  it("keeps different guests who share one inbox as separate responses", async () => {
    await submitRsvp(deps(), answer(), ip);
    const res = await submitRsvp(deps(), answer({ fullName: "Eva Jordánová", attendance: "undecided" }), ip);
    expect(res.status).toBe("saved");
    expect(await rows()).toHaveLength(2);
  });

  it("keeps the saved response when email delivery fails, and a retry sends it once", async () => {
    mailer.failWith = "http_500";
    const body = answer();
    expect(await submitRsvp(deps(), body, ip)).toEqual({ status: "saved", email: "failed" });
    const [row] = await rows();
    expect(row).toMatchObject({ email_status: "failed", email_last_error: "http_500", email_attempts: 1 });
    // The token from the failed attempt was discarded.
    expect((await db.query("select * from rsvp_edit_tokens")).rows).toHaveLength(0);

    mailer.failWith = null;
    expect(await submitRsvp(deps(), body, ip)).toEqual({ status: "saved", email: "sent" });
    expect(await submitRsvp(deps(), body, ip)).toEqual({ status: "saved", email: "sent" });
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0].idempotencyKey).toMatch(/\/confirmation\/2$/);
    expect(await rows()).toHaveLength(1);
  });

  it("reports an unconfigured email service as a failure, not a success", async () => {
    mailer.failWith = "not_configured";
    expect(await submitRsvp(deps(), answer(), ip)).toEqual({ status: "saved", email: "failed" });
  });

  it("rejects invalid input and malformed submission ids without storing anything", async () => {
    expect((await submitRsvp(deps(), answer({ email: "nope" }), ip)).status).toBe("invalid");
    expect((await submitRsvp(deps(), answer({ submissionId: "1" }), ip)).status).toBe("error");
    expect(await rows()).toHaveLength(0);
  });

  it("rate limits new submissions per network", async () => {
    let last;
    for (let i = 0; i < 31; i++) last = await submitRsvp(deps(), answer({ email: `p${i}@example.com` }), ip);
    expect(last).toEqual({ status: "rate_limited" });
    expect(await rows()).toHaveLength(30);
    expect((await submitRsvp(deps(), answer({ email: "other@example.com" }), "198.51.100.1")).status).toBe("saved");
  });

  it("caps link emails per inbox", async () => {
    await submitRsvp(deps(), answer(), ip);
    for (let i = 0; i < 8; i++) await submitRsvp(deps(), answer(), ip);
    expect(mailer.sent.length).toBe(6);
  });

  it("surfaces storage failures to the caller instead of claiming success", async () => {
    const broken: Db = { query: async () => Promise.reject(new Error("connection refused")) };
    await expect(submitRsvp({ db: broken, mailer, siteUrl }, answer(), ip)).rejects.toThrow();
    expect(mailer.sent).toHaveLength(0);
  });
});

describe("editing through the private link", () => {
  async function created(over: Record<string, unknown> = {}) {
    await submitRsvp(deps(), answer(over), ip);
    return mailer.lastToken();
  }

  it("loads exactly the associated response", async () => {
    const t1 = await created();
    await created({ fullName: "Eva Jordánová", email: "eva@example.com", attendance: "no" });
    expect(await getByToken(db, t1)).toMatchObject({ fullName: "Jiří Jordán", attendance: "yes", accommodation: "both" });
  });

  it("updates the same record and clears accommodation when no longer attending", async () => {
    const token = await created();
    const [before] = await rows();
    await new Promise((r) => setTimeout(r, 15));
    const res = await updateByToken(db, { token, fullName: "Jiří Jordán", attendance: "no", accommodation: "both" });
    expect(res.status).toBe("updated");
    const after = await rows();
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({ id: before.id, attendance: "no", accommodation: null, email: "jiri@example.com" });
    expect((after[0].updated_at as Date).getTime()).toBeGreaterThan((before.updated_at as Date).getTime());
  });

  it("ignores any attempt to change the email through the edit endpoint", async () => {
    const token = await created();
    await updateByToken(db, { token, fullName: "Jiří Jordán", email: "attacker@example.com", attendance: "undecided" });
    expect((await rows())[0].email).toBe("jiri@example.com");
  });

  it("handles invalid, unknown and revoked tokens safely", async () => {
    const token = await created();
    expect(await getByToken(db, "short")).toBeNull();
    expect(await getByToken(db, "x".repeat(43))).toBeNull();
    expect(await getByToken(db, "'; drop table rsvp_responses; --------------")).toBeNull();
    expect((await updateByToken(db, { token: "x".repeat(43), fullName: "A B", attendance: "no" })).status).toBe("invalid_token");

    await db.query("update rsvp_edit_tokens set revoked_at = now()");
    expect(await getByToken(db, token)).toBeNull();
    expect((await updateByToken(db, { token, fullName: "A B", attendance: "no" })).status).toBe("invalid_token");
  });

  it("refuses to rename into another guest who shares the inbox", async () => {
    const token = await created();
    await created({ fullName: "Eva Jordánová" });
    expect((await updateByToken(db, { token, fullName: "eva jordanova", attendance: "no" })).status).toBe("conflict");
  });

  it("validates edits on the server", async () => {
    const token = await created();
    const res = await updateByToken(db, { token, fullName: "Jiří Jordán", attendance: "yes" });
    expect(res.status).toBe("invalid");
  });

  it("the database itself refuses a stale accommodation", async () => {
    await created();
    await expect(db.query("update rsvp_responses set attendance = 'no'")).rejects.toThrow();
  });
});

describe("recoverLinks", () => {
  it("answers the same way for unknown addresses and sends nothing", async () => {
    expect(await recoverLinks(deps(), { email: "nobody@example.com" }, ip)).toEqual({ status: "accepted" });
    expect(mailer.sent).toHaveLength(0);
  });

  it("emails working links for every response in that inbox, keeping old links valid", async () => {
    await submitRsvp(deps(), answer(), ip);
    const original = mailer.lastToken();
    await submitRsvp(deps(), answer({ fullName: "Eva Jordánová", attendance: "no" }), ip);

    expect(await recoverLinks(deps(), { email: "JIRI@example.com" }, ip)).toEqual({ status: "accepted" });
    const mail = mailer.sent.at(-1)!;
    const tokens = [...mail.text.matchAll(/\/odpoved\/([A-Za-z0-9_-]{43})/g)].map((m) => m[1]);
    expect(tokens).toHaveLength(2);
    expect((await getByToken(db, tokens[1]))?.fullName).toBe("Eva Jordánová");
    expect(await getByToken(db, original)).not.toBeNull();
  });

  it("reports an email failure honestly", async () => {
    await submitRsvp(deps(), answer(), ip);
    mailer.failWith = "http_503";
    expect(await recoverLinks(deps(), { email: "jiri@example.com" }, ip)).toEqual({ status: "error", reason: "email" });
  });
});
