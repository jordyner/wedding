export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Resend keeps idempotency keys for 24 h, so a retried request never sends twice. */
  idempotencyKey: string;
};

export type MailResult = { ok: true; id: string } | { ok: false; error: string };

export type Mailer = { send(message: MailMessage): Promise<MailResult> };

/**
 * Resend over plain REST (no SDK). `RESEND_API_URL` exists only so automated tests
 * can point at a local mock; production uses the default.
 */
export function getMailer(): Mailer {
  return {
    async send(message) {
      const apiKey = process.env.RESEND_API_KEY;
      const from = process.env.EMAIL_FROM;
      if (!apiKey || !from) return { ok: false, error: "not_configured" };

      const baseUrl = process.env.RESEND_API_URL ?? "https://api.resend.com";
      try {
        const res = await fetch(`${baseUrl}/emails`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": message.idempotencyKey,
          },
          body: JSON.stringify({
            from,
            to: [message.to],
            subject: message.subject,
            html: message.html,
            text: message.text,
            ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
          }),
          signal: AbortSignal.timeout(10_000),
          cache: "no-store",
        });
        if (!res.ok) return { ok: false, error: `http_${res.status}` };
        const data = (await res.json().catch(() => null)) as { id?: string } | null;
        if (!data?.id) return { ok: false, error: "no_message_id" };
        return { ok: true, id: data.id };
      } catch (err) {
        return { ok: false, error: err instanceof Error && err.name === "TimeoutError" ? "timeout" : "network" };
      }
    },
  };
}
