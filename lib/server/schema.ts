/**
 * Database schema. Idempotent: safe to run on every deploy (`npm run db:migrate`).
 *
 * Accommodation: the form used to ask which nights a guest would stay. It no longer
 * does (everyone has a room from Saturday to Sunday), so new rows store NULL. The
 * column stays for older answers, and only an attending guest can have a value.
 */
/**
 * Existing databases: relax the old rule that required a night choice for 'yes'.
 * Only touches the table while the old rule is still there, so it is cheap to run on
 * every cold start too (see rsvpService), not just from `npm run db:migrate`.
 */
export const relaxAccommodationSql = `
do $$
begin
  if exists (
    select 1 from pg_constraint
     where conname = 'accommodation_only_when_attending'
       and pg_get_constraintdef(oid) not ilike '% or %'
  ) then
    alter table rsvp_responses drop constraint accommodation_only_when_attending;
    alter table rsvp_responses add constraint accommodation_only_when_attending
      check (attendance = 'yes' or accommodation is null);
  end if;
end $$;
`;

export const schemaSql = `
create table if not exists rsvp_responses (
  id                     uuid primary key,
  submission_id          uuid not null unique,
  full_name              text not null check (char_length(full_name) between 2 and 120),
  name_key               text not null,
  email                  text not null check (char_length(email) <= 254),
  email_key              text not null,
  attendance             text not null check (attendance in ('yes', 'no', 'undecided')),
  accommodation          text check (accommodation in ('none', 'first', 'second', 'both')),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  email_status           text not null default 'pending'
                         check (email_status in ('pending', 'sending', 'sent', 'failed')),
  email_attempts         integer not null default 0,
  email_last_attempt_at  timestamptz,
  email_last_error       text,
  email_message_id       text,
  constraint accommodation_only_when_attending
    check (attendance = 'yes' or accommodation is null)
);

${relaxAccommodationSql}

-- One response per person per inbox. Two different people may share an inbox.
create unique index if not exists rsvp_responses_person
  on rsvp_responses (email_key, name_key);

create table if not exists rsvp_edit_tokens (
  token_hash    text primary key,
  response_id   uuid not null references rsvp_responses (id) on delete cascade,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);
create index if not exists rsvp_edit_tokens_response on rsvp_edit_tokens (response_id);

create table if not exists rate_limits (
  bucket        text not null,
  window_start  timestamptz not null,
  hits          integer not null,
  primary key (bucket, window_start)
);

-- Readable export for the hosts (see README: "Inspecting and exporting responses").
create or replace view rsvp_export as
select
  full_name,
  email,
  case attendance when 'yes' then 'ano' when 'no' then 'ne' else 'zatím neví' end as ucast,
  case
    when attendance = 'no' then 'nepřichází'
    when attendance = 'undecided' then 'rozhodne později'
    when accommodation = 'none' then 'bez přespání'
    when accommodation = 'first' then '1. noc'
    when accommodation = 'second' then '2. noc'
    when accommodation = 'both' then 'obě noci'
  end as ubytovani,
  attendance,
  accommodation,
  created_at,
  updated_at,
  email_status
from rsvp_responses
order by created_at;
`;
