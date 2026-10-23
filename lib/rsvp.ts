/**
 * RSVP shapes and validation shared by the browser form and the server.
 * Error messages are guest-facing Czech copy.
 */

export const ATTENDANCE = ["yes", "no", "undecided"] as const;
export const ACCOMMODATION = ["none", "first", "second", "both"] as const;

export type Attendance = (typeof ATTENDANCE)[number];
export type Accommodation = (typeof ACCOMMODATION)[number];

export const LIMITS = {
  nameMin: 2,
  nameMax: 120,
  emailMax: 254,
} as const;

export type RsvpInput = {
  fullName: string;
  email: string;
  attendance: Attendance;
  /** Only set when attendance is "yes"; always null otherwise. */
  accommodation: Accommodation | null;
};

export type FieldErrors = Partial<Record<"fullName" | "email" | "attendance" | "accommodation", string>>;

export type ValidationResult =
  | { ok: true; value: RsvpInput }
  | { ok: false; errors: FieldErrors };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Control characters and invisible formatting marks have no place in a name.
const CONTROL_RE = new RegExp("[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2060-\\u206f\\ufeff]");

export function normalizeName(raw: string): string {
  return raw.normalize("NFC").replace(/\s+/g, " ").trim();
}

export function normalizeEmail(raw: string): string {
  return raw.normalize("NFC").trim();
}

/** Comparison key: case- and accent-insensitive, so "Jiří Jordán" equals "jiri jordan". */
export function nameKey(name: string): string {
  return normalizeName(name)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

export function emailKey(email: string): string {
  return normalizeEmail(email).toLowerCase();
}

export function validateName(raw: unknown): string | undefined {
  if (typeof raw !== "string" || normalizeName(raw) === "") return "Napiš prosím své jméno a příjmení.";
  const name = normalizeName(raw);
  if (CONTROL_RE.test(name)) return "Jméno obsahuje nepovolené znaky.";
  if (name.length < LIMITS.nameMin) return "Jméno je nějak krátké. Napiš prosím jméno i příjmení.";
  if (name.length > LIMITS.nameMax) return `Jméno může mít nejvýš ${LIMITS.nameMax} znaků.`;
  return undefined;
}

export function validateEmail(raw: unknown): string | undefined {
  if (typeof raw !== "string" || raw.trim() === "") return "Napiš prosím svůj e-mail.";
  const email = normalizeEmail(raw);
  if (email.length > LIMITS.emailMax || !EMAIL_RE.test(email) || CONTROL_RE.test(email)) {
    return "Tenhle e-mail nevypadá správně. Zkontroluj ho prosím.";
  }
  return undefined;
}

export function validateRsvp(input: Record<string, unknown>, opts: { requireEmail?: boolean } = {}): ValidationResult {
  const requireEmail = opts.requireEmail ?? true;
  const errors: FieldErrors = {};

  const nameError = validateName(input.fullName);
  if (nameError) errors.fullName = nameError;

  if (requireEmail) {
    const emailError = validateEmail(input.email);
    if (emailError) errors.email = emailError;
  }

  const attendance = input.attendance;
  if (!ATTENDANCE.includes(attendance as Attendance)) {
    errors.attendance = "Vyber prosím, jestli dorazíš.";
  }

  let accommodation: Accommodation | null = null;
  if (attendance === "yes") {
    if (!ACCOMMODATION.includes(input.accommodation as Accommodation)) {
      errors.accommodation = "Vyber prosím, které noci u nás přespíš — nebo že nepřespíš.";
    } else {
      accommodation = input.accommodation as Accommodation;
    }
  }
  // For "no" and "undecided" any submitted accommodation is discarded on purpose,
  // so a stale choice can never be counted.

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      fullName: normalizeName(input.fullName as string),
      email: requireEmail ? normalizeEmail(input.email as string) : "",
      attendance: attendance as Attendance,
      accommodation,
    },
  };
}

export const attendanceLabel: Record<Attendance, string> = {
  yes: "Ano",
  no: "Ne",
  undecided: "Zatím nevím",
};

/** Shapes of the JSON the API returns to the browser. */
export type EmailOutcome = "sent" | "failed" | "sending";

export type SubmitResponse =
  | { status: "saved"; email: EmailOutcome }
  | { status: "duplicate"; email: EmailOutcome }
  | { status: "invalid"; errors: FieldErrors }
  | { status: "rate_limited" }
  | { status: "error"; reason: "storage" | "bad_request" | "forbidden" };

export type EditResponse =
  | { status: "updated"; updatedAt: string }
  | { status: "invalid"; errors: FieldErrors }
  | { status: "invalid_token" }
  | { status: "conflict" }
  | { status: "rate_limited" }
  | { status: "error"; reason: "storage" | "bad_request" | "forbidden" };

export type RecoverResponse =
  | { status: "accepted" }
  | { status: "invalid"; errors: FieldErrors }
  | { status: "rate_limited" }
  | { status: "error"; reason: "email" | "storage" | "bad_request" | "forbidden" };
