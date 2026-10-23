"use client";

import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  ATTENDANCE,
  attendanceLabel,
  validateRsvp,
  type Accommodation,
  type Attendance,
  type EditResponse,
  type EmailOutcome,
  type FieldErrors,
  type SubmitResponse,
} from "@/lib/rsvp";

type Mode =
  | { kind: "create" }
  | {
      kind: "edit";
      token: string;
      initial: { fullName: string; email: string; attendance: Attendance; accommodation: Accommodation | null };
    };

type Values = { fullName: string; email: string; attendance: Attendance | null; accommodation: Accommodation | null };

type Outcome =
  | { kind: "saved"; email: EmailOutcome; address: string }
  | { kind: "duplicate"; email: EmailOutcome; address: string };

const MESSAGES = {
  checkFields: "Zkontroluj prosím zvýrazněná pole.",
  network: "Nepodařilo se spojit se serverem. Zkontroluj připojení a zkus to prosím znovu — vyplněné údaje zůstaly.",
  storage: "Odpověď se nám teď nepodařilo uložit. Zkus to prosím za chvíli znovu — vyplněné údaje zůstaly.",
  rateLimited: "Z tohoto připojení teď přišlo hodně odpovědí najednou. Zkus to prosím za pár minut.",
  badRequest: "Odpověď se nepodařilo odeslat. Zkus prosím načíst stránku znovu.",
  invalidToken: "Tenhle odkaz už neplatí. Nový si můžeš nechat poslat na e-mail.",
  conflict: "Pod tímhle e-mailem už odpověď s tímto jménem máme. Zkontroluj prosím jméno.",
  updated: "Hotovo, změny jsme uložili.",
} as const;

function newSubmissionId() {
  return crypto.randomUUID();
}

export function RsvpForm({
  mode,
  titleId,
  emailEnabled = true,
}: {
  mode: Mode;
  titleId?: string;
  emailEnabled?: boolean;
}) {
  const formId = useId();
  const ids = {
    name: `${formId}-name`,
    email: `${formId}-email`,
    emailHelp: `${formId}-email-help`,
    attendance: `${formId}-attendance`,
    err: (f: string) => `${formId}-${f}-error`,
  };

  const [values, setValues] = useState<Values>(
    mode.kind === "edit"
      ? { ...mode.initial }
      : { fullName: "", email: "", attendance: null, accommodation: null },
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ tone: "error" | "success"; text: ReactNode } | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  // One id per filled-in form: a retried or double-sent request resolves to the same record.
  const submissionId = useRef<string | null>(null);
  const inFlight = useRef(false);
  const honeypot = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  const isEdit = mode.kind === "edit";

  function update<K extends keyof Values>(key: K, value: Values[K]) {
    const next = { ...values, [key]: value };
    setValues(next);
    if (submitted) setErrors(clientErrors(next));
    if (status?.tone === "success") setStatus(null);
  }

  function clientErrors(v: Values): FieldErrors {
    const r = validateRsvp(v as unknown as Record<string, unknown>, { requireEmail: !isEdit });
    return r.ok ? {} : r.errors;
  }

  function focusFirstError(errs: FieldErrors) {
    const form = formRef.current;
    if (!form) return;
    const order: (keyof FieldErrors)[] = ["fullName", "email", "attendance"];
    const first = order.find((k) => errs[k]);
    if (!first) return;
    const target =
      first === "fullName"
        ? form.querySelector<HTMLElement>(`#${CSS.escape(ids.name)}`)
        : first === "email"
          ? form.querySelector<HTMLElement>(`#${CSS.escape(ids.email)}`)
          : form.querySelector<HTMLElement>(`input[name="${first}"]`);
    target?.focus();
  }

  async function post(url: string, body: unknown): Promise<{ ok: true; data: unknown } | { ok: false }> {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!data || typeof data !== "object") return { ok: true, data: { status: "error", reason: "storage" } };
      return { ok: true, data };
    } catch {
      return { ok: false };
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    setSubmitted(true);

    const errs = clientErrors(values);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setStatus({ tone: "error", text: MESSAGES.checkFields });
      focusFirstError(errs);
      return;
    }

    inFlight.current = true;
    setPending(true);
    setStatus(null);
    try {
      if (isEdit) await submitEdit();
      else await submitCreate();
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  async function submitCreate() {
    submissionId.current ??= newSubmissionId();
    const res = await post("/api/rsvp", {
      ...values,
      submissionId: submissionId.current,
      website: honeypot.current?.value ?? "",
    });
    if (!res.ok) return setStatus({ tone: "error", text: MESSAGES.network });
    const data = res.data as SubmitResponse;
    switch (data.status) {
      case "saved":
      case "duplicate":
        setOutcome({ kind: data.status, email: data.email, address: values.email.trim() });
        requestAnimationFrame(() => doneRef.current?.focus());
        return;
      case "invalid":
        setErrors(data.errors);
        setStatus({ tone: "error", text: MESSAGES.checkFields });
        focusFirstError(data.errors);
        return;
      case "rate_limited":
        return setStatus({ tone: "error", text: MESSAGES.rateLimited });
      default:
        return setStatus({
          tone: "error",
          text: data.reason === "storage" ? MESSAGES.storage : MESSAGES.badRequest,
        });
    }
  }

  async function submitEdit() {
    if (mode.kind !== "edit") return;
    const res = await post("/api/rsvp/edit", {
      token: mode.token,
      fullName: values.fullName,
      attendance: values.attendance,
      accommodation: values.accommodation,
    });
    if (!res.ok) return setStatus({ tone: "error", text: MESSAGES.network });
    const data = res.data as EditResponse;
    switch (data.status) {
      case "updated":
        return setStatus({ tone: "success", text: MESSAGES.updated });
      case "invalid":
        setErrors(data.errors);
        setStatus({ tone: "error", text: MESSAGES.checkFields });
        focusFirstError(data.errors);
        return;
      case "invalid_token":
        return setStatus({
          tone: "error",
          text: (
            <>
              {MESSAGES.invalidToken} <Link href="/odpoved">Poslat nový odkaz</Link>
            </>
          ),
        });
      case "conflict":
        setErrors({ fullName: MESSAGES.conflict });
        return setStatus({ tone: "error", text: MESSAGES.conflict });
      case "rate_limited":
        return setStatus({ tone: "error", text: MESSAGES.rateLimited });
      default:
        return setStatus({ tone: "error", text: data.reason === "storage" ? MESSAGES.storage : MESSAGES.badRequest });
    }
  }

  async function retryEmail() {
    if (inFlight.current || !submissionId.current) return;
    inFlight.current = true;
    setPending(true);
    try {
      const res = await post("/api/rsvp", { ...values, submissionId: submissionId.current, website: "" });
      const data = res.ok ? (res.data as SubmitResponse) : null;
      if (data && (data.status === "saved" || data.status === "duplicate")) {
        setOutcome((prev) => (prev ? { ...prev, email: data.email } : prev));
        setStatus(data.email === "sent" ? null : { tone: "error", text: "Ani teď se e-mail nepodařilo odeslat." });
      } else {
        setStatus({ tone: "error", text: res.ok ? "Ani teď se e-mail nepodařilo odeslat." : MESSAGES.network });
      }
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  if (outcome) {
    return (
      <Done
        outcome={outcome}
        headingRef={doneRef}
        titleId={titleId}
        pending={pending}
        status={status}
        onRetry={retryEmail}
      />
    );
  }

  const describedBy = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(" ") || undefined;

  return (
    <form ref={formRef} className="form" noValidate onSubmit={onSubmit} aria-busy={pending} data-testid="rsvp-form">
      <div className="field">
        <label className="field-label" htmlFor={ids.name}>
          Jméno a příjmení
        </label>
        <input
          id={ids.name}
          className="input"
          name="fullName"
          type="text"
          autoComplete="name"
          autoCapitalize="words"
          maxLength={120}
          required
          value={values.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          aria-invalid={errors.fullName ? true : undefined}
          aria-describedby={describedBy(errors.fullName && ids.err("fullName"))}
        />
        <FieldError id={ids.err("fullName")} message={errors.fullName} />
      </div>

      <div className="field">
        <label className="field-label" htmlFor={ids.email}>
          E-mail
        </label>
        <p className="field-help" id={ids.emailHelp}>
          {isEdit
            ? "E-mail změnit nejde — je na něj navázaný tenhle odkaz. Potřebuješ jiný? Napiš nám odpovědí na e-mail s odkazem."
            : emailEnabled
              ? "Pošleme ti na něj potvrzení. Když se něco změní, stačí formulář vyplnit znovu."
              : "Kdyby se něco změnilo, stačí formulář vyplnit znovu se stejným jménem a e-mailem."}
        </p>
        <input
          id={ids.email}
          className="input"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={254}
          required={!isEdit}
          readOnly={isEdit}
          value={values.email}
          onChange={(e) => update("email", e.target.value)}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={describedBy(ids.emailHelp, errors.email && ids.err("email"))}
        />
        <FieldError id={ids.err("email")} message={errors.email} />
      </div>

      <fieldset className="choices" aria-invalid={errors.attendance ? true : undefined}>
        <legend>Dorazíš?</legend>
        {ATTENDANCE.map((option) => (
          <label className="choice" key={option}>
            <input
              type="radio"
              name="attendance"
              value={option}
              required
              checked={values.attendance === option}
              onChange={() => update("attendance", option)}
              aria-describedby={describedBy(errors.attendance && ids.err("attendance"))}
            />
            <span className="choice-text">{attendanceLabel[option]}</span>
          </label>
        ))}
        <FieldError id={ids.err("attendance")} message={errors.attendance} />
      </fieldset>

      {!isEdit ? (
        <div className="honeypot" aria-hidden="true">
          <label>
            Nevyplňuj
            <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>
      ) : null}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={pending} aria-disabled={pending}>
          {pending ? (
            <>
              <span className="spinner" aria-hidden="true" />
              {isEdit ? "Ukládám…" : "Odesílám…"}
            </>
          ) : isEdit ? (
            "Uložit změny"
          ) : (
            "Odeslat odpověď"
          )}
        </button>
        <p
          className={`form-status${status ? ` is-${status.tone}` : ""}`}
          role={status?.tone === "error" ? "alert" : "status"}
          data-testid="form-status"
        >
          {status?.text}
        </p>
      </div>
    </form>
  );
}

/** An inked postmark pressed onto the reply card once the answer is saved. */
function Postmark() {
  const pathId = useId();
  const now = new Date();
  return (
    <svg className="postmark" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <path id={pathId} d="M60 60 m-45 0 a45 45 0 1 1 90 0 a45 45 0 1 1 -90 0" />
      </defs>
      <circle cx="60" cy="60" r="57" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="0.6" />
      <circle cx="60" cy="60" r="33" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <text className="postmark-ring">
        <textPath href={`#${pathId}`} textLength="276" lengthAdjust="spacing">
          ODPOVĚĎ PŘIJATA · DĚKUJEME ·
        </textPath>
      </text>
      <text className="postmark-date" x="60" y="58" textAnchor="middle">
        {now.getDate()}. {now.getMonth() + 1}.
      </text>
      <text className="postmark-year" x="60" y="75" textAnchor="middle">
        {now.getFullYear()}
      </text>
    </svg>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p className="field-error" id={id}>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M8 4.2v4.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="8" cy="11.4" r="0.9" fill="currentColor" />
      </svg>
      {message}
    </p>
  );
}

function Done({
  outcome,
  headingRef,
  titleId,
  pending,
  status,
  onRetry,
}: {
  outcome: Outcome;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  titleId?: string;
  pending: boolean;
  status: { tone: "error" | "success"; text: ReactNode } | null;
  onRetry: () => void;
}) {
  const address = <strong>{outcome.address}</strong>;
  const emailFailed = outcome.email === "failed";

  let heading: string;
  let body: ReactNode;
  if (outcome.kind === "saved") {
    heading = "Díky, že dáváš vědět!";
    body =
      outcome.email === "off" ? (
        <p>Odpověď jsme uložili.</p>
      ) : outcome.email === "sent" ? (
        <p>Odpověď jsme uložili a na e-mail {address} ti posíláme odkaz pro případné změny.</p>
      ) : outcome.email === "sending" ? (
        <p>Odpověď jsme uložili. E-mail s odkazem pro změny na {address} se právě odesílá.</p>
      ) : (
        <>
          <p>Odpověď jsme uložili, ta je v bezpečí.</p>
          <p>Jen se nám teď nepodařilo odeslat e-mail s odkazem pro změny na {address}.</p>
        </>
      );
  } else {
    heading = "Tvoji odpověď už máme";
    body =
      outcome.email === "failed" ? (
        <p>
          Pod tímto jménem a e-mailem už odpověď evidujeme, takže jsme nic nepřepsali. Odkaz pro úpravu se nám teď
          nepodařilo poslat.
        </p>
      ) : (
        <p>
          Pod tímto jménem a e-mailem už odpověď evidujeme, takže jsme nic nepřepsali. Na {address} jsme poslali odkaz,
          přes který ji můžeš upravit.
        </p>
      );
  }

  return (
    <div className="done done-after-form" data-testid="rsvp-done" data-outcome={`${outcome.kind}:${outcome.email}`}>
      <Postmark />
      <h2 className="reply-title" ref={headingRef} tabIndex={-1} id={titleId ? `${titleId}-done` : undefined}>
        {heading}
      </h2>
      <div role="status" className="done">
        {body}
      </div>

      {emailFailed ? (
        <div className="done">
          {outcome.kind === "saved" ? (
            <>
              <p className="soft">
                Zkus ho poslat znovu. Odpověď se tím podruhé neuloží, jen odejde e-mail.
              </p>
              <div>
                <button type="button" className="btn" onClick={onRetry} disabled={pending} aria-disabled={pending}>
                  {pending ? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      Odesílám…
                    </>
                  ) : (
                    "Poslat e-mail znovu"
                  )}
                </button>
              </div>
            </>
          ) : null}
          {status ? (
            <p className="form-status is-error" role="alert">
              {status.text}
            </p>
          ) : null}
          <p className="soft">
            Když to nepůjde ani později, nic se neděje — odkaz si můžeš kdykoli nechat poslat na stránce{" "}
            <Link href="/odpoved">Ztracený odkaz</Link>.
          </p>
        </div>
      ) : outcome.email === "off" ? null : (
        <p className="soft">Zatím je vše předběžné — před svatbou si účast ještě potvrdíme.</p>
      )}
    </div>
  );
}
