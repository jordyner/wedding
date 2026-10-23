import { randomUUID } from "node:crypto";
import {
  emailKey,
  nameKey,
  validateEmail,
  validateRsvp,
  type Accommodation,
  type Attendance,
  type EditResponse,
  type EmailOutcome,
  type RecoverResponse,
  type SubmitResponse,
} from "@/lib/rsvp";
import type { Db } from "./db";
import { confirmationEmail, recoveryEmail } from "./emailTemplates";
import type { Mailer } from "./mailer";
import { hit, LIMITS } from "./rateLimit";
import { createToken, fingerprint, hashToken, isWellFormedToken } from "./tokens";

/**
 * RSVP business rules. Every function takes its dependencies explicitly so the
 * same code runs against Neon in production and an in-process Postgres in tests.
 *
 * Identity policy (see README → "Duplicates and identity"):
 * - A person is (email, name), compared case- and accent-insensitively.
 * - The same person submitting again never overwrites anything: they get a fresh
 *   edit link sent to that inbox instead. Only the inbox owner can change a response.
 * - A different name with the same email is a different guest (shared inboxes are fine).
 * - A browser retry carries the same submissionId and resolves to the original record.
 */
export type Deps = { db: Db; mailer: Mailer; siteUrl: string };

type ResponseRow = {
  id: string;
  full_name: string;
  email: string;
  attendance: Attendance;
  accommodation: Accommodation | null;
  email_status: "pending" | "sending" | "sent" | "failed";
  email_attempts: number;
  updated_at: Date | string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UNIQUE_VIOLATION = "23505";

export function editUrl(siteUrl: string, token: string) {
  return `${siteUrl.replace(/\/$/, "")}/odpoved/${token}`;
}

export async function submitRsvp(
  deps: Deps,
  body: Record<string, unknown>,
  clientKey: string,
): Promise<SubmitResponse> {
  const { db } = deps;
  const submissionId = body.submissionId;
  if (typeof submissionId !== "string" || !UUID_RE.test(submissionId)) {
    return { status: "error", reason: "bad_request" };
  }

  const validated = validateRsvp(body);
  if (!validated.ok) return { status: "invalid", errors: validated.errors };
  const input = validated.value;

  // A retry of a request we already stored: never insert twice.
  const previous = await findBySubmission(db, submissionId);
  if (previous) return { status: "saved", email: await sendLinkEmail(deps, previous, "confirmation") };

  if (!(await hit(db, `submit:${fingerprint(clientKey)}`, LIMITS.submitPerIp.limit, LIMITS.submitPerIp.window))) {
    return { status: "rate_limited" };
  }

  const { rows } = await db.query<ResponseRow>(
    `insert into rsvp_responses
       (id, submission_id, full_name, name_key, email, email_key, attendance, accommodation)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict do nothing
     returning *`,
    [
      randomUUID(),
      submissionId,
      input.fullName,
      nameKey(input.fullName),
      input.email,
      emailKey(input.email),
      input.attendance,
      input.accommodation,
    ],
  );

  if (rows[0]) return { status: "saved", email: await sendLinkEmail(deps, rows[0], "confirmation") };

  // Lost a race with our own retry?
  const raced = await findBySubmission(db, submissionId);
  if (raced) return { status: "saved", email: await sendLinkEmail(deps, raced, "confirmation") };

  // Same person (same inbox and name) answered before: the latest answer counts.
  // Guests are told they can simply fill the form in again if something changes.
  const updated = await db.query<ResponseRow>(
    `update rsvp_responses
        set full_name = $3, attendance = $4, accommodation = $5, updated_at = now(), email_status = 'pending'
      where email_key = $1 and name_key = $2
      returning *`,
    [emailKey(input.email), nameKey(input.fullName), input.fullName, input.attendance, input.accommodation],
  );
  if (!updated.rows[0]) throw new Error("insert conflict without a matching row");
  return { status: "saved", email: await sendLinkEmail(deps, updated.rows[0], "confirmation") };
}

async function findBySubmission(db: Db, submissionId: string) {
  const { rows } = await db.query<ResponseRow>(`select * from rsvp_responses where submission_id = $1`, [submissionId]);
  return rows[0] ?? null;
}

/**
 * Mints a new edit token and emails it. The status column doubles as a claim so
 * concurrent retries cannot send the confirmation twice; Resend's idempotency key
 * covers retries that reach the provider.
 */
export async function sendLinkEmail(
  deps: Deps,
  row: ResponseRow,
  kind: "confirmation" | "duplicate",
): Promise<EmailOutcome> {
  const { db, mailer, siteUrl } = deps;
  const force = kind === "duplicate";

  const claimed = await db.query<ResponseRow>(
    `update rsvp_responses
        set email_status = 'sending', email_attempts = email_attempts + 1, email_last_attempt_at = now()
      where id = $1
        and ($2::boolean
             or email_status in ('pending', 'failed')
             or (email_status = 'sending' and email_last_attempt_at < now() - interval '2 minutes'))
      returning *`,
    [row.id, force],
  );
  const current = claimed.rows[0];
  // After a duplicate-path failure the original confirmation may still be fine; keep "sent" if it was.
  const failedStatus = force && row.email_status === "sent" ? "sent" : "failed";
  if (!current) {
    const { rows } = await db.query<ResponseRow>(`select email_status from rsvp_responses where id = $1`, [row.id]);
    return rows[0]?.email_status === "sent" ? "sent" : "sending";
  }

  const inboxOk = await hit(
    db,
    `inbox:${fingerprint(emailKey(current.email))}`,
    LIMITS.emailsPerInbox.limit,
    LIMITS.emailsPerInbox.window,
  );
  if (!inboxOk) {
    await markEmail(db, current.id, failedStatus, "rate_limited", null);
    return "failed";
  }

  const { token, hash } = createToken();
  await db.query(`insert into rsvp_edit_tokens (token_hash, response_id) values ($1, $2)`, [hash, current.id]);

  const message =
    kind === "confirmation"
      ? confirmationEmail(
          { fullName: current.full_name, attendance: current.attendance, accommodation: current.accommodation },
          editUrl(siteUrl, token),
        )
      : recoveryEmail([{ fullName: current.full_name, url: editUrl(siteUrl, token) }]);

  const result = await mailer.send({
    to: current.email,
    ...message,
    idempotencyKey: `rsvp/${current.id}/${kind}/${current.email_attempts}`,
  });

  if (result.ok) {
    await markEmail(db, current.id, "sent", null, result.id);
    return "sent";
  }
  // A timeout may still have delivered the email, so only discard the token on a definite failure.
  if (result.error !== "timeout" && result.error !== "network") {
    await db.query(`delete from rsvp_edit_tokens where token_hash = $1`, [hash]);
  }
  await markEmail(db, current.id, failedStatus, result.error, null);
  return "failed";
}

async function markEmail(db: Db, id: string, status: "sent" | "failed", error: string | null, messageId: string | null) {
  await db.query(
    `update rsvp_responses
        set email_status = $2, email_last_error = $3, email_message_id = coalesce($4, email_message_id)
      where id = $1`,
    [id, status, error, messageId],
  );
}

export type EditableResponse = {
  fullName: string;
  email: string;
  attendance: Attendance;
  accommodation: Accommodation | null;
  updatedAt: string;
};

export async function getByToken(db: Db, token: string): Promise<EditableResponse | null> {
  if (!isWellFormedToken(token)) return null;
  const { rows } = await db.query<ResponseRow>(
    `update rsvp_edit_tokens t set last_used_at = now()
       from rsvp_responses r
      where t.token_hash = $1 and t.revoked_at is null and r.id = t.response_id
      returning r.*`,
    [hashToken(token)],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    fullName: r.full_name,
    email: r.email,
    attendance: r.attendance,
    accommodation: r.accommodation,
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export async function updateByToken(db: Db, body: Record<string, unknown>): Promise<EditResponse> {
  const token = body.token;
  if (!isWellFormedToken(token)) return { status: "invalid_token" };

  const validated = validateRsvp(body, { requireEmail: false });
  if (!validated.ok) return { status: "invalid", errors: validated.errors };
  const input = validated.value;

  const hash = hashToken(token);
  if (!(await hit(db, `edit:${hash.slice(0, 32)}`, LIMITS.editsPerToken.limit, LIMITS.editsPerToken.window))) {
    return { status: "rate_limited" };
  }

  try {
    const { rows } = await db.query<{ updated_at: Date | string }>(
      `update rsvp_responses r
          set full_name = $2, name_key = $3, attendance = $4, accommodation = $5, updated_at = now()
         from rsvp_edit_tokens t
        where t.token_hash = $1 and t.revoked_at is null and r.id = t.response_id
        returning r.updated_at`,
      [hash, input.fullName, nameKey(input.fullName), input.attendance, input.accommodation],
    );
    if (!rows[0]) return { status: "invalid_token" };
    return { status: "updated", updatedAt: new Date(rows[0].updated_at).toISOString() };
  } catch (err) {
    // Renamed to match another guest who shares this inbox.
    if ((err as { code?: string }).code === UNIQUE_VIOLATION) return { status: "conflict" };
    throw err;
  }
}

export async function recoverLinks(
  deps: Deps,
  body: Record<string, unknown>,
  clientKey: string,
): Promise<RecoverResponse> {
  const { db, mailer, siteUrl } = deps;
  const emailError = validateEmail(body.email);
  if (emailError) return { status: "invalid", errors: { email: emailError } };
  const key = emailKey(body.email as string);

  if (!(await hit(db, `recover:${fingerprint(clientKey)}`, LIMITS.recoverPerIp.limit, LIMITS.recoverPerIp.window))) {
    return { status: "rate_limited" };
  }

  const { rows } = await db.query<ResponseRow>(
    `select * from rsvp_responses where email_key = $1 order by created_at`,
    [key],
  );
  // Same answer whether or not the address is known, so the form cannot be used to probe the guest list.
  if (rows.length === 0) return { status: "accepted" };

  if (!(await hit(db, `inbox:${fingerprint(key)}`, LIMITS.emailsPerInbox.limit, LIMITS.emailsPerInbox.window))) {
    return { status: "accepted" };
  }

  const links: { fullName: string; url: string }[] = [];
  const hashes: string[] = [];
  for (const row of rows) {
    const { token, hash } = createToken();
    await db.query(`insert into rsvp_edit_tokens (token_hash, response_id) values ($1, $2)`, [hash, row.id]);
    hashes.push(hash);
    links.push({ fullName: row.full_name, url: editUrl(siteUrl, token) });
  }

  const minute = Math.floor(Date.now() / 60_000);
  const result = await mailer.send({
    to: rows[0].email,
    ...recoveryEmail(links),
    idempotencyKey: `recover/${fingerprint(key)}/${minute}`,
  });
  if (!result.ok) {
    if (result.error !== "timeout" && result.error !== "network") {
      await db.query(`delete from rsvp_edit_tokens where token_hash = any($1::text[])`, [hashes]);
    }
    return { status: "error", reason: "email" };
  }
  return { status: "accepted" };
}
