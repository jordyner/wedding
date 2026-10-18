/**
 * All event facts and invitation copy live here. The website and the email
 * both read from this file, so changing a value updates everything.
 *
 * Anything in [square brackets] is a placeholder that must be replaced before
 * launch. `findPlaceholders()` lists them (it runs during `npm run build`).
 */
export const event = {
  couple: {
    first: "[Jméno]",
    second: "[Jméno]",
    /** Initials on the envelope seal, e.g. ["A", "J"]. */
    initials: ["[A]", "[J]"],
  },

  /** Shown on the card in small caps, e.g. "sobota 12. června 2027". */
  date: "[den a datum svatby]",
  /** e.g. "ve 14 hodin" */
  time: "[čas obřadu]",
  venue: {
    /** e.g. "Zámek Loučeň" */
    name: "[místo obřadu]",
    /** Optional second line (town or address). Use "" to hide it. */
    address: "[obec / adresa]",
  },

  /** The two accommodation nights, written as they should read on the form. */
  nights: {
    first: "[datum 1. noci]",
    second: "[datum 2. noci]",
  },

  copy: {
    envelopeIntro: "Máme pro tebe pozvánku",
    envelopeHint: "Klepnutím otevři",
    cardOpening: "Budeme se brát!",
    cardInvitation: "A budeme rádi, když u toho budeš s námi.",
    rsvpButton: "Dám vám vědět",
  },
} as const;

export const coupleNames = `${event.couple.first} & ${event.couple.second}`;
export const siteName = "Svatba Jordánovi";

export function accommodationLabel(choice: "none" | "first" | "second" | "both"): string {
  switch (choice) {
    case "none":
      return "Bez přespání";
    case "first":
      return `První noc — ${event.nights.first}`;
    case "second":
      return `Druhá noc — ${event.nights.second}`;
    case "both":
      return `Obě noci — ${event.nights.first} a ${event.nights.second}`;
  }
}

export function findPlaceholders(value: unknown = event, path = "event"): string[] {
  if (typeof value === "string") return /\[[^\]]+\]/.test(value) ? [`${path}: ${value}`] : [];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, v]) =>
      findPlaceholders(v, Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`),
    );
  }
  return [];
}
