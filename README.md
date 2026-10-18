# svatbajordanovi.cz

Personal, non-commercial wedding site. Release 1 is only the virtual invitation (`/pozvanka`) and a preliminary RSVP with an emailed private edit link.

- **Stack:** Next.js 16 (App Router) on Vercel Hobby · Postgres on Neon Free (via `pg`) · email via the Resend REST API.
- **Rendering:** `/pozvanka`, `/odpoved` and the 404 page are prerendered static pages. Server work only happens in `/api/rsvp*` and on the private edit page `/odpoved/<token>`.

## Before launch: replace the placeholders

Every event fact lives in **`content/event.ts`**. The website and the emails both read from this file. `npm run build` lists any value still in `[square brackets]`:

| Key | Placeholder |
|---|---|
| `couple.first`, `couple.second` | `[Jméno]` |
| `couple.initials` | `[A]`, `[J]` (the envelope seal) |
| `date` | `[den a datum svatby]` |
| `time` | `[čas obřadu]` |
| `venue.name`, `venue.address` | `[místo obřadu]`, `[obec / adresa]` (use `""` to hide the address line) |
| `nights.first`, `nights.second` | `[datum 1. noci]`, `[datum 2. noci]` |

Invitation copy (`copy.*`) is in the same file. The palette is a set of CSS variables at the top of `app/globals.css`.

## Local development

```bash
npm install
cp .env.example .env.local      # DATABASE_URL already points at the local DB
npm run db:local                # terminal 1: local Postgres (PGlite), data kept in .data/
npm run dev                     # terminal 2: http://localhost:3000 → /pozvanka
```

Without `RESEND_API_KEY`, submissions are still saved, but the page honestly says the email could not be sent.

## Tests

```bash
npm test             # unit/integration: validation, tokens, persistence, duplicates, editing, recovery (in-process Postgres)
npm run test:e2e     # Playwright, mobile 390px + desktop 1440px, against a production build
```

The e2e suite starts a throwaway in-memory Postgres and `scripts/mock-resend.mts`, a local stand-in for the Resend API. It records messages and can simulate failures, so no real email is ever sent. `RESEND_API_URL` exists only for this purpose.

## Deploying (Vercel Hobby, private GitHub repo)

1. **GitHub:** create a *private* repository under your personal account and push this repo.
2. **Neon** (https://neon.com, Free plan, no card needed): create a project in region **AWS Europe Central (Frankfurt)**. Copy the **pooled** connection string (the host contains `-pooler`).
3. **Create the tables** once, from your machine:
   ```bash
   DATABASE_URL='postgres://…-pooler…/neondb?sslmode=require' npm run db:migrate
   ```
   The migration is idempotent; rerun it whenever `lib/server/schema.ts` changes.
4. **Resend** (https://resend.com, Free plan):
   - Add the domain `svatbajordanovi.cz` and create the SPF/DKIM DNS records it shows you, at your domain registrar or in Vercel DNS. Wait until it reports *Verified*.
   - Leave **open and click tracking off** for the domain. Click tracking would rewrite the private edit links through a tracking domain.
   - Create an API key with **Sending access** only.
5. **Vercel:** import the GitHub repo as a new project on your **Hobby** account. Under *Settings → Environment Variables* (Production), set:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | Neon pooled connection string |
   | `RESEND_API_KEY` | `re_…` |
   | `EMAIL_FROM` | `Svatba Jordánovi <pozvanka@svatbajordanovi.cz>` |
   | `EMAIL_REPLY_TO` | your personal inbox (guests' replies go there, so this is also how they ask for an email change) |
   | `PUBLIC_SITE_URL` | `https://svatbajordanovi.cz` |

   Do not set `RESEND_API_URL` in production. Functions run in `fra1` (`vercel.json`), next to the Neon database.
6. **Domain:** in Vercel, add `svatbajordanovi.cz` (and optionally `www`, redirecting to the apex), then follow the DNS instructions.
7. Smoke test: submit an RSVP with your own email, open the link, change the answer.

### Costs and how to avoid surprises

As checked on 2026-10-18:

- **Vercel Hobby** is free and for non-commercial personal use. It has no billing. If you exceed a limit, features pause; you are not charged. Don't start a Pro trial or add a payment method to the account.
- **Neon Free:** $0, no card required. Limits: 1 GB storage per project, 100 CU-hours per month, and compute suspends after 5 minutes of idleness (the first request after a pause is a little slower). If you exceed a limit, compute suspends or writes are blocked until the next month; it does not bill. Don't upgrade or add a card.
- **Resend Free:** 3,000 emails a month, 100 a day, no overage on the Free plan. This site sends one email per new response plus one per link request, capped at 6 per inbox per hour. Don't enable pay-as-you-go.

Nothing in this project requires a paid plan.

## Where things live

| Path | What |
|---|---|
| `content/event.ts` | All event facts and invitation copy |
| `app/pozvanka/page.tsx` | Invitation (static) |
| `components/InvitationExperience.tsx` | Envelope → card → reply card state machine |
| `components/RsvpForm.tsx` | RSVP form (create and edit modes) |
| `app/odpoved/[token]/page.tsx` | Private edit page |
| `app/odpoved/page.tsx` | "Lost link" recovery page |
| `app/api/rsvp/*` | Submit, edit, recover endpoints |
| `lib/rsvp.ts` | Validation shared by browser and server |
| `lib/server/rsvpService.ts` | RSVP rules (identity, duplicates, email sending) |
| `lib/server/schema.ts` | Database schema and the `rsvp_export` view |
| `lib/server/emailTemplates.ts` | Czech email texts |
| `next.config.ts` | `/` → `/pozvanka` redirect, security headers |

Removing the redirect later: delete the `redirects()` entry in `next.config.ts` and add `app/page.tsx`.

## Data model

`rsvp_responses` has one row per guest: `id`, `full_name`, `email`, `attendance` (`yes` | `no` | `undecided`), `accommodation`, `created_at`, `updated_at`, and the email-delivery fields `email_status`, `email_attempts`, `email_last_attempt_at`, `email_last_error`, `email_message_id`.

Accommodation:

| attendance | accommodation | meaning |
|---|---|---|
| `yes` | `none` / `first` / `second` / `both` | coming; explicit choice, where `none` means not staying overnight |
| `no` | `NULL` | not applicable |
| `undecided` | `NULL` | decided later |

A database `CHECK` constraint enforces this, so a stale night selection can never be stored.

`rsvp_edit_tokens` stores only the SHA-256 **hash** of each edit token. `rate_limits` holds hashed counters, cleaned up after two days.

## Inspecting and exporting responses

No admin UI and no endpoint lists responses. Use the database directly.

- **Neon console → SQL Editor:**
  ```sql
  select * from rsvp_export;   -- readable Czech columns, sorted by time
  select attendance, accommodation, count(*) from rsvp_responses group by 1, 2;
  ```
- **CSV export** with `psql` (installed via `brew install libpq`):
  ```bash
  psql "$DATABASE_URL" -c "\copy (select * from rsvp_export) to 'odpovedi.csv' csv header"
  ```
- Revoke a guest's edit links: `update rsvp_edit_tokens set revoked_at = now() where response_id = '<id>';`
- Fix someone's email (see policy below): `update rsvp_responses set email = '<new>', email_key = lower('<new>') where id = '<id>';`

Keep the Neon credentials to the two of you, and use separate Neon roles if anyone else ever needs read access.

## Policies

### Duplicates and identity

The invitation is one public URL. A name proves nothing, and the site does not pretend otherwise.

- A *person* is (email, name), compared case- and accent-insensitively ("Jiří Jordán" = "jiri jordan").
- **The same person submitting again never overwrites anything.** The form says an answer already exists, and a fresh edit link goes to *that inbox*. Only someone with access to the inbox can change the response.
- **Same email, different name** creates a separate response, so two guests can share an inbox. Nothing is merged by email.
- **Retries:** every filled-in form carries a random `submissionId`. A double-click, network retry, or "send email again" resolves to the same row and never sends the confirmation twice. A status claim in the database and Resend's `Idempotency-Key` both guard this.
- **Lost link:** `/odpoved` takes an email address and sends links for every response under it. It answers the same way whether or not the address is known. Old links keep working.

### Changing the email address

Guests cannot change it themselves. The edit link is bound to the address that received it, and a self-service change would let anyone holding a forwarded link redirect future communication. A guest who needs a different address replies to the email (`EMAIL_REPLY_TO`), and you change it in the database (see above). Names, attendance and accommodation are editable.

### Edit links

- 256-bit random tokens. Only their hash is stored. They do not expire during the planning period and can be revoked individually.
- The URL contains no name or email.
- `/odpoved/<token>` is sent with `Referrer-Policy: no-referrer`, `Cache-Control: no-store` and `noindex`, and loads no third-party scripts.
- The application never logs tokens, emails or request bodies. Vercel's own request logs do contain URL paths, visible only to the project owner.

### Abuse controls

- Server-side validation and length limits; React escapes all user text and the email templates escape it.
- Same-origin check on the API, a 4 KB body limit, and a hidden honeypot field.
- Postgres-backed rate limits: 30 new answers per network per hour, 6 link emails per inbox per hour, 40 edits per link per hour, 10 recovery requests per network per hour.
- A CSP allowing only same-origin resources; fonts are self-hosted at build time.
- The whole site is `noindex` (robots.txt and `X-Robots-Tag`), because it is a private invitation. Remove both if you ever want it indexed.

### Not in this release

There is no automatic six-month reconfirmation and no reminder emails. When the time comes, export `rsvp_export` and contact guests manually or build that step separately.
