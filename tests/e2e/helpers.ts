import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";

const MAIL_URL = "http://127.0.0.1:4020";

export type Mail = { to: string[]; subject: string; html: string; text: string; idempotencyKey: string | null };

export async function mailsTo(address: string): Promise<Mail[]> {
  const all = (await (await fetch(`${MAIL_URL}/__messages`)).json()) as Mail[];
  return all.filter((m) => m.to.includes(address));
}
export const failEmail = (status = 500) =>
  fetch(`${MAIL_URL}/__fail`, { method: "POST", body: JSON.stringify({ status }) });
export const resetEmail = () => fetch(`${MAIL_URL}/__reset`, { method: "POST" });

export function editLink(mail: Mail): string {
  const m = mail.text.match(/https?:\/\/[^\s]+\/odpoved\/[A-Za-z0-9_-]{43}/);
  if (!m) throw new Error("no edit link in email");
  return m[0];
}

export const uniqueEmail = (tag: string) => `${tag}-${randomUUID().slice(0, 8)}@example.com`;

/** Each test gets its own network identity so rate limits do not leak between tests. */
export async function freshClient(page: Page) {
  await page.setExtraHTTPHeaders({ "x-real-ip": `10.${rnd()}.${rnd()}.${rnd()}` });
}
const rnd = () => Math.floor(Math.random() * 250) + 1;

// The closed envelope floats gently, so Playwright would wait forever for it to be
// "stable"; force skips only that check (the click still lands on the envelope).
export async function openInvitation(page: Page) {
  await page.goto("/pozvanka");
  await page.getByRole("button", { name: "Otevřít obálku s pozvánkou" }).click({ force: true });
  await expect(page.getByTestId("invitation")).toBeVisible();
}

export async function openReply(page: Page) {
  await openInvitation(page);
  await page.getByRole("button", { name: "Dám vám vědět" }).click();
  await expect(page.getByTestId("rsvp-form")).toBeVisible();
}

export async function fillAnswer(
  page: Page,
  a: { name: string; email: string; attendance: "Ano" | "Ne" | "Zatím nevím"; nights?: RegExp },
) {
  await page.getByLabel("Jméno a příjmení").fill(a.name);
  await page.getByLabel("E-mail").fill(a.email);
  await page.getByRole("radio", { name: a.attendance, exact: true }).check();
  if (a.nights) await page.getByRole("radio", { name: a.nights }).check();
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}
