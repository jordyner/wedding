---
name: Svatba Jordánovi
description: A wedding stationery suite on screen; envelope, invitation card, enclosed reply card.
colors:
  accent: "#985550"
  accent-strong: "#7f423e"
  seal: "#c48a83"
  blush-line: "#dcb7ae"
  liner: "#d9e1d3"
  liner-stripe: "#ccd6c5"
  ink: "#3b3230"
  ink-soft: "#66544f"
  control-line: "#8f7a74"
  paper: "#fcf8f1"
  reply-paper: "#faf0ec"
  table: "#efe6e1"
  table-light: "#f7f1ed"
  envelope-side: "#e6cdc5"
  envelope-bottom: "#efdcd5"
  envelope-flap: "#e9d2ca"
  error: "#a3352d"
  success: "#4f6b4a"
typography:
  display:
    fontFamily: "Pinyon Script, cursive"
    fontSize: "clamp(2.75rem, 12.5vw, 4.25rem)"
    fontWeight: 400
    lineHeight: 1.12
  headline:
    fontFamily: "EB Garamond, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(1.75rem, 6.5vw, 2.125rem)"
    fontWeight: 400
    lineHeight: 1.2
  title:
    fontFamily: "EB Garamond, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(1.375rem, 5vw, 1.625rem)"
    fontWeight: 400
    lineHeight: 1.3
  body:
    fontFamily: "EB Garamond, Georgia, 'Times New Roman', serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
  body-small:
    fontFamily: "EB Garamond, Georgia, 'Times New Roman', serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "EB Garamond, Georgia, 'Times New Roman', serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    letterSpacing: "0.1em"
    fontFeature: "\"c2sc\", \"smcp\""
  field-label:
    fontFamily: "EB Garamond, Georgia, 'Times New Roman', serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.6
rounded:
  paper: "2px"
  choice: "6px"
  pill: "999px"
  round: "50%"
spacing:
  hairline-inset: "clamp(0.625rem, 2.4vw, 0.875rem)"
  stack: "1.75rem"
  field: "0.35rem"
  card-gap: "clamp(2.5rem, 8vw, 3.5rem)"
  page-block: "clamp(2rem, 7vw, 5rem)"
  page-inline: "1rem"
  sheet: "34rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.paper}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0.7rem 2rem"
    height: "3.25rem"
  button-primary-hover:
    backgroundColor: "{colors.accent-strong}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    padding: "0.7rem 2rem"
    height: "3.25rem"
  button-secondary-hover:
    textColor: "{colors.accent-strong}"
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    padding: "0"
    height: "2.75rem"
  input-line:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "0"
    padding: "0.35rem 0.1rem 0.3rem"
    height: "2.75rem"
  choice-radio:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.round}"
    size: "1.375rem"
  card-invitation:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.paper}"
    padding: "clamp(3.25rem, 11vw, 5rem) clamp(1.75rem, 8vw, 4rem) clamp(3rem, 10vw, 4.5rem)"
  card-reply:
    backgroundColor: "{colors.reply-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.paper}"
    padding: "clamp(2.25rem, 8vw, 3.5rem) clamp(1.25rem, 6.5vw, 3rem) clamp(2.5rem, 8vw, 3.5rem)"
  seal:
    backgroundColor: "{colors.seal}"
    textColor: "{colors.paper}"
    typography: "{typography.display}"
    rounded: "{rounded.round}"
    size: "clamp(3.5rem, 15vw, 4.25rem)"
---

# Design System: Svatba Jordánovi

## Overview

**Creative North Star: "Stationery on the Table"**

Every surface is a piece of paper someone made for you, lying on a soft blush-grey tabletop. Warm ivory cotton card with a fine grain, a blush envelope with a sage-striped liner, a flat printed blush roundel carrying the couple's initials, deep cocoa ink, thin blush hairline frames. Nothing on screen behaves like a website: no navigation, no hero, no sections or card grids. The page is a narrow sheet centred on the table, and content is typeset on it the way a printer would set it: centred, generous margins, true small caps, italic for voice, script reserved for names.

Density is low and the pace is slow on purpose. The envelope opens in 3D, the card rises from the pocket, and the reply card unfolds beneath it; every other state change is a short fade or line shift. Depth is the physical kind, paper above a table, never interface chrome. The owner's brief rules out dense florals, loud gradients, glassmorphism, confetti, and autoplay sound; the only gradient in the system is a barely visible pool of light on the tabletop.

**Key Characteristics:**
- One narrow sheet (34rem max) centred on a tabletop; no navigation or page chrome.
- Two papers: ivory for the invitation, faint blush for the reply card, both grained and both framed with an inset blush hairline.
- EB Garamond for everything readable, Pinyon Script only for the couple's names and initials.
- One cocoa-rose accent carries every interactive cue.
- Soft, layered, table-cast shadows; no hard offsets, no emboss.

## Colors

A low-chroma palette of warm ivory, blush and cocoa, with one deeper rose for interaction and a single sage note inside the envelope.

### Primary
- **Cocoa Rose** (accent): links, focus outlines, the primary button fill, the outline of secondary buttons, the checked radio dot, small-caps run-ins on the reply card, the italic ampersand between the names, and the input focus rule. 5.3:1 on ivory paper.
- **Deep Cocoa Rose** (accent-strong): hover and pressed state of everything that uses Cocoa Rose.

### Secondary
- **Pressed Blush** (seal): the printed roundel at the envelope's flap point. Paired with near-white initials in script.
- **Blush Hairline** (blush-line): decorative rules only: card frames, the diamond ornament, section dividers on the reply card, the accommodation sub-list rule. Never text, never a control outline (it fails contrast for both).

### Tertiary
- **Sage Liner** (liner) and **Sage Stripe** (liner-stripe): the inside of the envelope flap, a 45-degree stripe seen only while the envelope opens.

### Neutral
- **Cocoa Ink** (ink): all primary text, the names, headings. 11.8:1 on paper.
- **Soft Cocoa** (ink-soft): secondary text: time, address, help text, ledes, readonly values, input hover rule.
- **Control Taupe** (control-line): input underlines and radio outlines; the one neutral strong enough (3.6:1) to mark a control.
- **Ivory Paper** (paper): invitation card, the card inside the envelope, radio fills, and the near-white of text on accent.
- **Blush Reply Paper** (reply-paper): the reply card, recovery and edit pages, the 404 card.
- **Tabletop** (table) with **Tabletop Light** (table-light): page background; a soft radial pool of Tabletop Light at the top over flat Tabletop.
- **Envelope Side / Bottom / Flap** (envelope-side, envelope-bottom, envelope-flap): three close blush tones that give the envelope's folds their planes without lines doing the work.
- **Error Brick** (error) and **Garden Green** (success): form status and field errors only.

### Named Rules
**The One Ink Accent Rule.** Cocoa Rose is the only colour that means "you can act here". If something is not interactive (or the ampersand), it is not Cocoa Rose.

**The Hairline Is Decoration Rule.** Blush Hairline frames and divides; it never carries text or marks a control. Controls use Control Taupe, text uses Cocoa Ink or Soft Cocoa.

## Typography

**Display Font:** Pinyon Script (with cursive)
**Body Font:** EB Garamond, roman and italic, with Georgia, "Times New Roman", serif
Both load via next/font with latin-ext for full Czech diacritics.

**Character:** A formal copperplate script set against an old-style Garamond with real small caps; the script is the couple's handwriting, the Garamond is the printer.

### Hierarchy
- **Display** (Pinyon Script 400, clamp(2.75rem, 12.5vw, 4.25rem), 1.12): the couple's names on the invitation, one name per line, an italic Garamond ampersand at 0.42em in Cocoa Rose between them. The same script sets the seal initials and the names line above standalone reply pages (2rem).
- **Headline** (EB Garamond italic 400, clamp(1.75rem, 6.5vw, 2.125rem), 1.2): reply card titles and confirmation headings, centred.
- **Title** (EB Garamond italic 400, clamp(1.375rem, 5vw, 1.625rem)): the card's opening line in ink and the envelope's intro line.
- **Body** (EB Garamond 400, 1.125rem, 1.6): running text; the invitation sentence steps up to clamp(1.1875rem, 4.4vw, 1.375rem) at 1.5 and 22ch.
- **Body small** (1.0625rem): ledes, reply notes, address, status lines; ledes cap at 30rem.
- **Label** (all-small-caps, 0.1–0.14em tracking): date and venue on the invitation, the envelope hint, and the run-in heads that open each reply note.
- **Field label** (500, 1.125rem): form labels and fieldset legends, the system's only weight above 400.

### Named Rules
**The Script Is For Names Rule.** Pinyon Script sets the couple's names and initials and nothing else. Headings, buttons and labels are Garamond.

**The True Small Caps Rule.** Small capitals come from `font-variant-caps: all-small-caps` with open tracking, never from `text-transform: uppercase`.

**The Italic Is Voice Rule.** Where the couple speaks directly (the opening line, reply titles, the envelope intro, the time), set italic Garamond rather than bolder or larger type.

## Layout

A single centred column: the sheet is min(100%, 34rem) with 1rem side gutters and clamp(2rem, 7vw, 5rem) top padding, clamp(3rem, 8vw, 6rem) bottom. The same column serves phone and desktop; desktop simply shows more table around it. Content inside cards is centred except the form, which is left-aligned for scanning. The envelope stage fills the first viewport and centres the envelope at min(86vw, 440px), 10:7 ratio, with the intro above and the hint below. Cards stack vertically with clamp(2.5rem, 8vw, 3.5rem) between them. Inside the reply card, notes and form are separated by blush hairline rules with 1.75rem of space on each side; form fields stack at 1.75rem with 0.35rem inside a field. Vertical rhythm uses clamp() everywhere so phone and desktop share the same proportions.

## Elevation & Depth

Depth is paper on a table: one soft, three-layer shadow under every sheet and the envelope, with a fine SVG noise grain multiplied into the paper at 16% opacity. The envelope adds faint drop-shadows under its flap and pocket edge so the folds read as layered card. Interface surfaces never float; there are no hover lifts except the envelope's 3px rise and flap tilt, which invite the tap.

### Shadow Vocabulary
- **Paper on table** (`box-shadow: 0 1px 1px rgb(80 50 44 / 0.06), 0 6px 14px -6px rgb(80 50 44 / 0.16), 0 28px 60px -24px rgb(80 50 44 / 0.28)`): every card and the envelope back.
- **Fold edge** (`filter: drop-shadow(0 2px 2px rgb(80 50 44 / 0.14))`): the closed flap over the pocket; the pocket edge uses a lighter upward version.
- **Primary press** (`box-shadow: 0 1px 1px rgb(80 50 44 / 0.12), 0 8px 18px -10px rgb(127 66 62 / 0.6)`): the primary button only.

### Named Rules
**The Paper-On-A-Table Rule.** Shadows are warm cocoa, soft and long, cast downward as by room light. No hard offset shadows, no neutral grey shadows, no glass or blur.

**The Printed Seal Rule.** The seal is a flat printed roundel: solid Pressed Blush with a thin inset near-white ring and a 1px contact shadow. No highlights, gradients or emboss.

## Shapes

Paper is nearly square-cornered (2px); the envelope back is 3px. The only round forms are the pill buttons, the seal, and the radio controls, which read as printed marks against rectangular stationery. Every card carries an inset hairline frame: the invitation a double frame (1px blush line plus an inner tint line 4px inside), the reply card a single 1px blush frame; the card inside the envelope repeats the invitation's double frame. A small diamond-and-dots ornament on hairlines divides the invitation's names from its details. Choice rows get a 6px tint on hover, never a visible box.

## Components

### Buttons
Quiet, rounded, and few: one primary per card.
- **Shape:** full pill (999px), min-height 3.25rem, padding 0.7rem 2rem, 1.1875rem Garamond with 0.01em tracking.
- **Primary:** Cocoa Rose fill with ivory text and the primary press shadow; hover deepens to Deep Cocoa Rose; pressed moves down 1px.
- **Secondary:** transparent with a 1px Cocoa Rose outline and Cocoa Rose text; hover adds a 7% Cocoa Rose wash.
- **Link button:** underlined Cocoa Rose text, 1px underline at 0.2em offset, 2.75rem tap height.
- **Busy:** a 1em hairline spinner in currentColor beside the label, opacity 0.75, progress cursor.

### Cards / Containers
- **Invitation card:** Ivory Paper, 2px corners, paper-on-table shadow, grain, double blush frame inset clamp(0.625rem, 2.4vw, 0.875rem), generous centred padding.
- **Reply card:** Blush Reply Paper, same shadow and grain, single 1px blush frame inset clamp(0.5rem, 2vw, 0.75rem). The same card hosts the recovery page, the edit page and the 404.

### Inputs / Fields
Ink on a line, like filling in a printed card.
- **Style:** transparent, no box, no radius; a single 1px Control Taupe underline; 2.75rem tall; 1.1875rem text; Cocoa Rose caret.
- **Hover:** underline darkens to Soft Cocoa.
- **Focus:** underline turns Cocoa Rose and doubles to 2px via a 1px under-rule.
- **Error:** underline turns Error Brick; message below in Error Brick with a small inline SVG mark.
- **Readonly:** Soft Cocoa text over a dashed underline.

### Radio choices
Custom 1.375rem rings in Control Taupe (1.5px) on Ivory Paper; the checked state turns the ring Cocoa Rose and scales in a 0.7rem Cocoa Rose dot. Rows are 3rem tall with a faint Cocoa Rose wash on hover. A dependent group (accommodation) indents behind a 1px blush hairline on its left.

### Reply notes
Short paragraphs printed on the reply card above the form, each opened by a run-in head in Cocoa Rose small caps, inline with the sentence it introduces.

### Envelope (signature)
A button the size of the first viewport's focus: pocket and flap drawn in three envelope blush tones with faint fold strokes, the printed seal at the flap point, a miniature of the invitation's top tucked inside. Opening (about 1.6s): seal fades, flap rotates 180deg in 3D to reveal the sage-striped liner, the card rises out of the pocket, the envelope settles away and the full card arrives. Reduced motion collapses all travel to an instant change.

## Do's and Don'ts

### Do:
- **Do** put every new surface on Ivory Paper or Blush Reply Paper with the paper-on-table shadow, grain, and an inset blush hairline frame.
- **Do** keep everything in the single 34rem sheet, centred, with clamp()-based vertical rhythm.
- **Do** use Cocoa Rose for every interactive cue and nothing decorative except the names' ampersand.
- **Do** set labels in true small caps with 0.1–0.14em tracking, and the couple's voice in italic Garamond.
- **Do** draw form fields as a single underline that turns Cocoa Rose on focus.
- **Do** honour reduced motion: every animation must collapse to an instant state change without losing content.

### Don't:
- **Don't** set anything but the couple's names and initials in Pinyon Script.
- **Don't** use Blush Hairline for text or control outlines.
- **Don't** use `text-transform: uppercase`; use small caps.
- **Don't** add hard offset shadows, grey shadows, glassmorphism, emboss or highlights on the seal.
- **Don't** introduce boxed or filled inputs, cards inside cards, navigation bars, or hero sections.
- **Don't** add dense florals, loud gradients, confetti, or autoplay sound (owner's brief).
