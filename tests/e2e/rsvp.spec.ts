import { expect, test } from "@playwright/test";
import {
  editLink,
  expectNoHorizontalOverflow,
  failEmail,
  fillAnswer,
  freshClient,
  mailsTo,
  openReply,
  resetEmail,
  uniqueEmail,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetEmail();
  await freshClient(page);
});

test.describe("form branching and validation", () => {
  test("accommodation follows the attendance answer and stale choices are cleared", async ({ page }) => {
    await openReply(page);
    const acc = page.getByTestId("accommodation");
    await expect(acc).toHaveCount(0);
    for (const label of ["Ano, rád/a", "Bohužel ne", "Zatím nevím"]) {
      await expect(page.getByRole("radio", { name: label })).not.toBeChecked();
    }

    await page.getByRole("radio", { name: "Ano, rád/a" }).check();
    await expect(acc).toBeVisible();
    await expect(acc.getByRole("radio")).toHaveCount(4);
    await expect(acc).toContainText("Bez přespání");
    await expect(acc).toContainText("První noc — [datum 1. noci]");
    await expect(acc).toContainText("Druhá noc — [datum 2. noci]");
    await expect(acc).toContainText("Obě noci — [datum 1. noci] a [datum 2. noci]");
    await page.getByRole("radio", { name: /Obě noci/ }).check();

    await page.getByRole("radio", { name: "Bohužel ne" }).check();
    await expect(acc).toHaveCount(0);
    await page.getByRole("radio", { name: "Zatím nevím" }).check();
    await expect(acc).toHaveCount(0);

    await page.getByRole("radio", { name: "Ano, rád/a" }).check();
    for (const r of await acc.getByRole("radio").all()) await expect(r).not.toBeChecked();
  });

  test("required fields and email format are validated inline in Czech", async ({ page }) => {
    await openReply(page);
    await page.getByRole("button", { name: "Odeslat odpověď" }).click();
    await expect(page.getByText("Napiš prosím své jméno a příjmení.")).toBeVisible();
    await expect(page.getByText("Napiš prosím svůj e-mail.")).toBeVisible();
    await expect(page.getByText("Vyber prosím, jestli dorazíš.")).toBeVisible();
    await expect(page.getByTestId("form-status")).toHaveText("Zkontroluj prosím zvýrazněná pole.");
    await expect(page.getByTestId("form-status")).toHaveAttribute("role", "alert");
    await expect(page.getByLabel("Jméno a příjmení")).toBeFocused();
    await expect(page.getByLabel("Jméno a příjmení")).toHaveAttribute("aria-invalid", "true");

    await page.getByLabel("Jméno a příjmení").fill("Žofie Řeháková");
    await page.getByLabel("E-mail").fill("zofie@seznam");
    await expect(page.getByText("Tenhle e-mail nevypadá správně. Zkontroluj ho prosím.")).toBeVisible();
    await expect(page.getByLabel("E-mail")).toHaveAttribute("type", "email");
    await expect(page.getByLabel("E-mail")).toHaveAttribute("aria-describedby", /help/);

    await page.getByLabel("E-mail").fill("zofie@seznam.cz");
    await page.getByRole("radio", { name: "Ano, rád/a" }).check();
    await page.getByRole("button", { name: "Odeslat odpověď" }).click();
    await expect(page.getByText("Vyber prosím, které noci u nás přespíš — nebo že nepřespíš.")).toBeVisible();
    await expect(page.getByRole("radio", { name: "Bez přespání" })).toBeFocused();
    await page.screenshot({ path: test.info().outputPath("errors.png"), fullPage: true });
  });
});

test.describe("persistence, email and editing", () => {
  for (const [label, nights, expected] of [
    ["none", /Bez přespání/, "Bez přespání"],
    ["first", /První noc/, "První noc"],
    ["second", /Druhá noc/, "Druhá noc"],
    ["both", /Obě noci/, "Obě noci"],
  ] as const) {
    test(`saves accommodation "${label}" and the edit link shows it`, async ({ page }) => {
      const email = uniqueEmail(label);
      await openReply(page);
      await fillAnswer(page, { name: "Ondřej Šťastný", email, attendance: "Ano, rád/a", nights });
      await page.getByRole("button", { name: "Odeslat odpověď" }).click();
      await expect(page.getByTestId("rsvp-done")).toHaveAttribute("data-outcome", "saved:sent");

      const [mail] = await mailsTo(email);
      expect(mail.text).toContain(expected);
      await page.goto(editLink(mail));
      await expect(page.getByRole("radio", { name: nights })).toBeChecked();
    });
  }

  test("full journey: submit, receive email, edit the same record", async ({ page }) => {
    const email = uniqueEmail("journey");
    await openReply(page);
    await fillAnswer(page, { name: "Žofie Řeháková", email, attendance: "Ano, rád/a", nights: /Obě noci/ });
    const submit = page.getByRole("button", { name: "Odeslat odpověď" });
    // Double-click must not create two records or two emails.
    await submit.dblclick();

    const done = page.getByTestId("rsvp-done");
    await expect(done).toBeVisible();
    await expect(page.getByRole("heading", { name: "Díky, že dáváš vědět!" })).toBeFocused();
    await expect(done).toContainText("Odpověď jsme uložili a na e-mail");
    await expect(done).toContainText(email);
    await expect(done).toContainText("Zatím je vše předběžné");
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: test.info().outputPath("done.png"), fullPage: true });

    const mails = await mailsTo(email);
    expect(mails).toHaveLength(1);
    const mail = mails[0];
    expect(mail.subject).toBe("Díky za odpověď — odkaz pro případné změny");
    expect(mail.html).toContain("Upravit odpověď");
    expect(mail.text).toContain("Ano, rád/a");
    expect(mail.text).toContain("nepřeposílej");
    expect(mail.text).toContain("Před svatbou se ti ještě ozveme");
    const link = editLink(mail);
    expect(link).not.toContain(email.split("@")[0]);
    expect(link.toLowerCase()).not.toContain("zofie");

    // Edit page: no envelope, existing values, email read-only, private headers.
    const res = await page.goto(link);
    expect(res?.headers()["referrer-policy"]).toBe("no-referrer");
    expect(res?.headers()["cache-control"]).toContain("no-store");
    await expect(page.getByTestId("envelope")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Tvoje odpověď" })).toBeVisible();
    await expect(page.getByLabel("Jméno a příjmení")).toHaveValue("Žofie Řeháková");
    await expect(page.getByLabel("E-mail")).toHaveValue(email);
    await expect(page.getByLabel("E-mail")).toHaveAttribute("readonly", "");
    await expect(page.getByRole("radio", { name: /Obě noci/ })).toBeChecked();
    await page.screenshot({ path: test.info().outputPath("edit.png"), fullPage: true });

    // Switch to undecided: accommodation disappears and is not stored.
    await page.getByRole("radio", { name: "Zatím nevím" }).check();
    await page.getByRole("button", { name: "Uložit změny" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Hotovo, změny jsme uložili." })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("radio", { name: "Zatím nevím" })).toBeChecked();
    await expect(page.getByTestId("accommodation")).toHaveCount(0);
    await page.getByRole("radio", { name: "Ano, rád/a" }).check();
    for (const r of await page.getByTestId("accommodation").getByRole("radio").all()) await expect(r).not.toBeChecked();
    await page.getByRole("radio", { name: /Druhá noc/ }).check();
    await page.getByRole("button", { name: "Uložit změny" }).click();
    await expect(page.getByText("Hotovo, změny jsme uložili.")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("radio", { name: /Druhá noc/ })).toBeChecked();
    expect(await mailsTo(email)).toHaveLength(1);
  });

  test("re-submitting as the same person does not overwrite; the inbox gets a link", async ({ page }) => {
    const email = uniqueEmail("dupe");
    await openReply(page);
    await fillAnswer(page, { name: "Petr Novák", email, attendance: "Bohužel ne" });
    await page.getByRole("button", { name: "Odeslat odpověď" }).click();
    await expect(page.getByTestId("rsvp-done")).toHaveAttribute("data-outcome", "saved:sent");

    await openReply(page);
    await fillAnswer(page, { name: "petr novak", email: email.toUpperCase(), attendance: "Ano, rád/a", nights: /Obě noci/ });
    await page.getByRole("button", { name: "Odeslat odpověď" }).click();
    await expect(page.getByTestId("rsvp-done")).toHaveAttribute("data-outcome", "duplicate:sent");
    await expect(page.getByRole("heading", { name: "Tvoji odpověď už máme" })).toBeVisible();

    const mails = await mailsTo(email);
    expect(mails).toHaveLength(2);
    await page.goto(editLink(mails[1]));
    await expect(page.getByRole("radio", { name: "Bohužel ne" })).toBeChecked();
  });

  test("invalid edit tokens get a friendly dead end with a recovery path", async ({ page }) => {
    for (const bad of ["neplatny", "A".repeat(43)]) {
      await page.goto(`/odpoved/${bad}`);
      await expect(page.getByTestId("invalid-token")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Tenhle odkaz nefunguje" })).toBeVisible();
    }
    await page.getByRole("link", { name: "Poslat nový odkaz" }).click();
    await expect(page).toHaveURL(/\/odpoved$/);
  });

  test("lost-link recovery emails a fresh working link", async ({ page }) => {
    const email = uniqueEmail("recover");
    await openReply(page);
    await fillAnswer(page, { name: "Marta Dvořáková", email, attendance: "Zatím nevím" });
    await page.getByRole("button", { name: "Odeslat odpověď" }).click();
    await expect(page.getByTestId("rsvp-done")).toBeVisible();

    await page.goto("/odpoved");
    await page.getByLabel("E-mail").fill(email);
    await page.getByRole("button", { name: "Poslat odkaz" }).click();
    await expect(page.getByText("Pokud u nás máme odpověď s tímto e-mailem")).toBeVisible();
    const mails = await mailsTo(email);
    expect(mails).toHaveLength(2);
    await page.goto(editLink(mails[1]));
    await expect(page.getByLabel("Jméno a příjmení")).toHaveValue("Marta Dvořáková");

    await page.goto("/odpoved");
    await page.getByLabel("E-mail").fill(uniqueEmail("unknown"));
    await page.getByRole("button", { name: "Poslat odkaz" }).click();
    await expect(page.getByText("Pokud u nás máme odpověď s tímto e-mailem")).toBeVisible();
  });
});

test.describe("failure states", () => {
  test("email failure after saving: saved is stated, retry sends exactly once", async ({ page }) => {
    const email = uniqueEmail("mailfail");
    await failEmail(500);
    await openReply(page);
    await fillAnswer(page, { name: "Tomáš Černý", email, attendance: "Ano, rád/a", nights: /Bez přespání/ });
    await page.getByRole("button", { name: "Odeslat odpověď" }).click();

    const done = page.getByTestId("rsvp-done");
    await expect(done).toHaveAttribute("data-outcome", "saved:failed");
    await expect(done).toContainText("Odpověď jsme uložili, ta je v bezpečí.");
    await expect(done).toContainText("nepodařilo odeslat e-mail");
    await expect(done).not.toContainText("posíláme odkaz");
    await page.screenshot({ path: test.info().outputPath("email-failed.png"), fullPage: true });
    expect(await mailsTo(email)).toHaveLength(0);

    await resetEmail();
    await page.getByRole("button", { name: "Poslat e-mail znovu" }).click();
    await expect(done).toHaveAttribute("data-outcome", "saved:sent");
    await expect(done).toContainText("ti posíláme odkaz pro případné změny");
    const mails = await mailsTo(email);
    expect(mails).toHaveLength(1);
    await page.goto(editLink(mails[0]));
    await expect(page.getByLabel("Jméno a příjmení")).toHaveValue("Tomáš Černý");
  });

  test("storage failure keeps the entered values and says nothing was saved", async ({ page }) => {
    await openReply(page);
    await page.route("/api/rsvp", (route) =>
      route.fulfill({ status: 503, contentType: "application/json", body: '{"status":"error","reason":"storage"}' }),
    );
    await fillAnswer(page, { name: "Jana Malá", email: "jana@example.com", attendance: "Bohužel ne" });
    await page.getByRole("button", { name: "Odeslat odpověď" }).click();
    await expect(page.getByTestId("form-status")).toContainText("nepodařilo uložit");
    await expect(page.getByLabel("Jméno a příjmení")).toHaveValue("Jana Malá");
    await expect(page.getByRole("radio", { name: "Bohužel ne" })).toBeChecked();
    await expect(page.getByRole("button", { name: "Odeslat odpověď" })).toBeEnabled();
  });

  test("server crash (non-JSON 500) is reported, values kept", async ({ page }) => {
    await openReply(page);
    await page.route("/api/rsvp", (route) => route.fulfill({ status: 500, body: "Internal Server Error" }));
    await fillAnswer(page, { name: "Jana Malá", email: "jana@example.com", attendance: "Zatím nevím" });
    await page.getByRole("button", { name: "Odeslat odpověď" }).click();
    await expect(page.getByTestId("form-status")).toContainText("nepodařilo uložit");
    await expect(page.getByLabel("E-mail")).toHaveValue("jana@example.com");
  });

  test("network error is reported, values kept, and a later retry succeeds once", async ({ page }) => {
    const email = uniqueEmail("network");
    await openReply(page);
    await page.route("/api/rsvp", (route) => route.abort("internetdisconnected"));
    await fillAnswer(page, { name: "Karel Bílý", email, attendance: "Ano, rád/a", nights: /První noc/ });
    await page.getByRole("button", { name: "Odeslat odpověď" }).click();
    await expect(page.getByTestId("form-status")).toContainText("Nepodařilo se spojit se serverem");
    await expect(page.getByRole("radio", { name: /První noc/ })).toBeChecked();

    await page.unroute("/api/rsvp");
    await page.getByRole("button", { name: "Odeslat odpověď" }).click();
    await expect(page.getByTestId("rsvp-done")).toHaveAttribute("data-outcome", "saved:sent");
    expect(await mailsTo(email)).toHaveLength(1);
  });

  test("a submitting state is shown while the request is in flight", async ({ page }) => {
    await openReply(page);
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    await page.route("/api/rsvp", async (route) => {
      await gate;
      await route.continue();
    });
    await fillAnswer(page, { name: "Eliška Krátká", email: uniqueEmail("slow"), attendance: "Bohužel ne" });
    await page.getByRole("button", { name: "Odeslat odpověď" }).click();
    const busy = page.getByRole("button", { name: "Odesílám…" });
    await expect(busy).toBeDisabled();
    await expect(page.getByTestId("rsvp-form")).toHaveAttribute("aria-busy", "true");
    release();
    await expect(page.getByTestId("rsvp-done")).toBeVisible();
  });

  test("rate-limited submissions are explained (real limiter)", async ({ page, request }) => {
    const ip = "10.250.250.250";
    for (let i = 0; i < 30; i++) {
      await request.post("/api/rsvp", {
        headers: { "x-real-ip": ip, origin: "http://localhost:3300" },
        data: {
          submissionId: crypto.randomUUID(),
          fullName: `Host ${i}`,
          email: uniqueEmail("rl"),
          attendance: "no",
        },
      });
    }
    await page.setExtraHTTPHeaders({ "x-real-ip": ip });
    await openReply(page);
    await fillAnswer(page, { name: "Pozdní Host", email: uniqueEmail("late"), attendance: "Bohužel ne" });
    await page.getByRole("button", { name: "Odeslat odpověď" }).click();
    await expect(page.getByTestId("form-status")).toContainText("Zkus to prosím za pár minut");
    await expect(page.getByLabel("Jméno a příjmení")).toHaveValue("Pozdní Host");
  });

  test("API refuses cross-site posts and bot-filled honeypots", async ({ request }) => {
    const data = { submissionId: crypto.randomUUID(), fullName: "Bot", email: "bot@example.com", attendance: "no" };
    const cross = await request.post("/api/rsvp", { headers: { origin: "https://evil.example" }, data });
    expect(cross.status()).toBe(403);
    const honey = await request.post("/api/rsvp", { data: { ...data, website: "http://spam" } });
    expect(honey.status()).toBe(400);
    expect(await mailsTo("bot@example.com")).toHaveLength(0);
  });
});

test.describe("responsive", () => {
  for (const width of [360, 375, 1280]) {
    test(`no horizontal overflow at ${width}px through the whole journey`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/pozvanka");
      await expectNoHorizontalOverflow(page);
      await openReply(page);
      await page.getByRole("radio", { name: "Ano, rád/a" }).check();
      await page.getByRole("button", { name: "Odeslat odpověď" }).click();
      await expectNoHorizontalOverflow(page);
      for (const r of await page.getByRole("radio").all()) {
        const box = (await r.locator("xpath=ancestor::label").boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      await page.screenshot({ path: test.info().outputPath(`journey-${width}.png`), fullPage: true });
    });
  }
});
