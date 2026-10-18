# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) on Vercel Hobby, Postgres on Neon Free (via `pg`), transactional email via Resend REST API. Confirmed by the owner on 2026-10-18.

## Users

Invited wedding guests of the Jordán wedding, opening a shared link (mostly on a phone, often straight from a message app) to read the invitation and give a preliminary answer. Every guest answers individually, partners included. Secondary users: the two hosts, who read and export responses directly from the database.

## Product Purpose

svatbajordanovi.cz is a personal, non-commercial wedding site. Release one is only a virtual invitation (envelope → paper card) and a short preliminary RSVP with an emailed private edit link. Success: guests feel personally invited, answer in under a minute, and can change their answer later without an account.

## Positioning

It should feel like opening real wedding stationery from the couple, not visiting an event landing page.

## Operating Context

- One public URL `/pozvanka`, shared with all guests; it is not access-controlled and is not personalised.
- RSVP is preliminary; a reconfirmation round happens roughly six months later (manually, not automated in this release).
- Accommodation for two specific nights is reserved and paid by the hosts for every invited guest; guests only say which nights they will use.
- No uninvited companions (+1). Invited partners answer on their own.

## Capabilities and Constraints

- All guest-facing copy is Czech, warm, informal singular (ty).
- Names, date, time, venue and both accommodation nights are decided but not yet supplied: they live as placeholders in `content/event.ts`.
- Out of scope: schedule, gallery, travel, guest list, household RSVP, +1, payments, personal links, reminders, dietary/music questions, accounts, music, admin dashboard, maps/calendars.
- Must stay within Vercel Hobby and free tiers; no paid services without approval.

## Brand Commitments

- Visual direction chosen by the owner: minimalist elegance; soft pastels, warm ivory paper, restrained blush accents, subtle paper texture, soft believable shadows, refined typography, a readable script for the couple's names. No dense florals, loud gradients, glassmorphism, confetti, or autoplay sound.
- Invitation content is real HTML text, never a flattened image.

## Evidence on Hand

No photographs, logos, or final event facts yet. Do not invent names, dates, venues, or claims.

## Product Principles

1. Stationery first: every surface should read as paper someone made for you.
2. Short and honest: never claim an email was sent or a response saved unless it was.
3. One person, one answer: no proxy answers, no merging by email.
4. Private by default: edit links are credentials, responses are never public.

## Accessibility & Inclusion

Fully usable by keyboard, touch and screen reader; respects reduced motion; legible pastel contrast; correct Czech diacritics throughout.
