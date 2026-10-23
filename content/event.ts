/**
 * All event facts and invitation copy live here. The website and the email
 * both read from this file, so changing a value updates everything.
 *
 * Anything in [square brackets] is a placeholder that must be replaced before
 * launch. `findPlaceholders()` lists them (it runs during `npm run build`).
 */
export const event = {
  couple: {
    first: "Eva",
    second: "Jiří",
    /** Initials on the envelope seal, e.g. ["A", "J"]. */
    initials: ["E", "J"],
  },

  /** Shown on the card in small caps, e.g. "sobota 12. června 2027". */
  date: "sobota 22. května 2027",
  /** Optional, e.g. "ve 14 hodin". Use "" to hide it. */
  time: "",
  venue: {
    /** e.g. "Zámek Loučeň" */
    name: "Pernek",
    /** Optional second line (town or address). Use "" to hide it. */
    address: "",
  },

  copy: {
    envelopeHint: "Klepnutím otevři",
    cardOpening: "Budeme se brát!",
    cardInvitation: "A chceme tě u toho mít.",
    rsvpButton: "Dám vám vědět",
  },
} as const;

export const coupleNames = `${event.couple.first} & ${event.couple.second}`;
export const siteName = "Svatba Jordánovi";

export function findPlaceholders(value: unknown = event, path = "event"): string[] {
  if (typeof value === "string") return /\[[^\]]+\]/.test(value) ? [`${path}: ${value}`] : [];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, v]) =>
      findPlaceholders(v, Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`),
    );
  }
  return [];
}
