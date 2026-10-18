"use client";

import { useRef, useState, type FormEvent } from "react";
import { validateEmail, type RecoverResponse } from "@/lib/rsvp";

export function RecoverForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [status, setStatus] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const honeypot = useRef<HTMLInputElement>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    const err = validateEmail(email);
    setError(err);
    if (err) {
      inputRef.current?.focus();
      return;
    }
    inFlight.current = true;
    setPending(true);
    setStatus(null);
    try {
      const res = await fetch("/api/rsvp/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website: honeypot.current?.value ?? "" }),
      });
      const data = (await res.json().catch(() => null)) as RecoverResponse | null;
      if (data?.status === "accepted") {
        setStatus({
          tone: "success",
          text: "Pokud u nás máme odpověď s tímto e-mailem, posíláme na něj odkaz. Mrkni do schránky (i do spamu).",
        });
      } else if (data?.status === "invalid") {
        setError(data.errors.email);
      } else if (data?.status === "rate_limited") {
        setStatus({ tone: "error", text: "Žádostí bylo teď moc najednou. Zkus to prosím za chvíli." });
      } else if (data?.status === "error" && data.reason === "email") {
        setStatus({ tone: "error", text: "E-mail se nám teď nepodařilo odeslat. Zkus to prosím za chvíli znovu." });
      } else {
        setStatus({ tone: "error", text: "Něco se pokazilo. Zkus to prosím za chvíli znovu." });
      }
    } catch {
      setStatus({ tone: "error", text: "Nepodařilo se spojit se serverem. Zkontroluj připojení a zkus to znovu." });
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <form className="form" noValidate onSubmit={onSubmit} aria-busy={pending}>
      <div className="field">
        <label className="field-label" htmlFor="recover-email">
          E-mail
        </label>
        <p className="field-help" id="recover-help">
          Ten, který jsi vyplnil/a u odpovědi.
        </p>
        <input
          ref={inputRef}
          id="recover-email"
          className="input"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={254}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "recover-help recover-error" : "recover-help"}
        />
        {error ? (
          <p className="field-error" id="recover-error">
            {error}
          </p>
        ) : null}
      </div>
      <div className="honeypot" aria-hidden="true">
        <label>
          Nevyplňuj
          <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={pending} aria-disabled={pending}>
          {pending ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Odesílám…
            </>
          ) : (
            "Poslat odkaz"
          )}
        </button>
        <p className={`form-status${status ? ` is-${status.tone}` : ""}`} role={status?.tone === "error" ? "alert" : "status"}>
          {status?.text}
        </p>
      </div>
    </form>
  );
}
