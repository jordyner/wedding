import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, openInvitation } from "./helpers";

test.describe("routing", () => {
  test("/ redirects to /pozvanka without exposing a homepage or navigation", async ({ page }) => {
    const res = await page.goto("/");
    expect(page.url()).toMatch(/\/pozvanka$/);
    expect(res?.request().redirectedFrom()?.url()).toMatch(/\/$/);
    await expect(page.locator("nav")).toHaveCount(0);
    await expect(page.locator("a")).toHaveCount(0);
  });

  test("unknown routes show a minimal Czech 404", async ({ page }) => {
    const res = await page.goto("/program-svatby");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Tahle stránka neexistuje" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Zpět na pozvánku" })).toHaveAttribute("href", "/pozvanka");
  });

  test("the site asks not to be indexed", async ({ request }) => {
    const res = await request.get("/pozvanka");
    expect(res.headers()["x-robots-tag"]).toContain("noindex");
  });
});

test.describe("envelope", () => {
  test("starts closed and shows nothing of the RSVP", async ({ page }) => {
    await page.goto("/pozvanka");
    await expect(page.getByText("Klepnutím otevři")).toBeVisible();
    await expect(page.getByRole("button", { name: "Otevřít obálku s pozvánkou" })).toBeVisible();
    await expect(page.getByTestId("invitation")).toHaveCount(0);
    await expect(page.getByTestId("rsvp-form")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: test.info().outputPath("closed.png") });
  });

  test("opens on click and the invitation is readable", async ({ page }) => {
    await openInvitation(page);
    const card = page.getByTestId("invitation");
    await expect(card.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(card).toContainText("Budeme se brát!");
    await expect(card).toContainText("A chceme tě u toho mít.");
    await expect(card).toBeFocused();

    const bodySize = await card.locator(".inv-invite").evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(bodySize).toBeGreaterThanOrEqual(18);
    const box = await card.boundingBox();
    const vw = page.viewportSize()!.width;
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(vw);
    if (vw > 1000) expect(box!.width).toBeLessThanOrEqual(560);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: test.info().outputPath("open.png"), fullPage: true });
  });

  test("opens with the keyboard (Enter and Space)", async ({ page, browserName }) => {
    for (const key of ["Enter", "Space"]) {
      await page.goto("/pozvanka");
      // Safari only tabs to buttons when "Press Tab to highlight each item" is enabled.
      if (browserName === "webkit") await page.getByRole("button", { name: "Otevřít obálku s pozvánkou" }).focus();
      else await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Otevřít obálku s pozvánkou" })).toBeFocused();
      await page.keyboard.press(key);
      await expect(page.getByTestId("invitation")).toBeVisible();
    }
  });

  test("survives repeated rapid clicks", async ({ page }) => {
    await page.goto("/pozvanka");
    const envelope = page.getByRole("button", { name: "Otevřít obálku s pozvánkou" });
    await envelope.click({ force: true });
    for (let i = 0; i < 5; i++) await envelope.click({ force: true, timeout: 500 }).catch(() => {});
    await expect(page.getByTestId("invitation")).toBeVisible();
    await expect(page.getByTestId("invitation")).toHaveCount(1);
    await expect(page.getByTestId("envelope")).toHaveCount(0);
    await page.waitForTimeout(800);
    await expect(page.getByTestId("invitation")).toHaveCSS("opacity", "1");
  });

  test("reduced motion reveals the card immediately", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/pozvanka");
    await page.getByRole("button", { name: "Otevřít obálku s pozvánkou" }).click({ force: true });
    // No animation phases: the card is there on the very next frame.
    await expect(page.getByTestId("invitation")).toBeVisible({ timeout: 150 });
    await expect(page.locator("[data-phase=opening]")).toHaveCount(0);
  });

  test("Czech diacritics render in the chosen web fonts", async ({ page }) => {
    await openInvitation(page);
    const result = await page.evaluate(async () => {
      await document.fonts.ready;
      const fam = (sel: string) => getComputedStyle(document.querySelector(sel)!).fontFamily.split(",")[0].trim();
      const sample = "ěščřžýáíéůúťďňĚŠČŘŽÝÁÍÉŮÚŤĎŇ";
      return {
        serif: document.fonts.check(`18px ${fam(".inv-invite")}`, sample),
        script: document.fonts.check(`40px ${fam(".inv-names .name")}`, sample),
        serifLoaded: [...document.fonts].some((f) => f.family.includes("Garamond") && f.status === "loaded"),
        scriptLoaded: [...document.fonts].some((f) => f.family.includes("Pinyon") && f.status === "loaded"),
      };
    });
    expect(result).toEqual({ serif: true, script: true, serifLoaded: true, scriptLoaded: true });
  });
});

test.describe("RSVP reveal", () => {
  test("'Dám vám vědět' reveals the reply card below the invitation and moves focus to it", async ({ page }) => {
    await openInvitation(page);
    const cta = page.getByRole("button", { name: "Dám vám vědět" });
    await expect(cta).toHaveAttribute("aria-expanded", "false");
    await cta.click();

    const reply = page.getByTestId("reply");
    await expect(reply).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dáš nám vědět?" })).toBeFocused();
    await expect(page.getByTestId("invitation")).toBeVisible();

    // The reply card slides out from behind the invitation; measure once it has settled.
    await reply.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
    const card = (await page.getByTestId("invitation").boundingBox())!;
    const replyBox = (await reply.boundingBox())!;
    expect(replyBox.y).toBeGreaterThan(card.y + card.height);

    await expect(reply).toContainText("Teď nám stačí jen vědět, jestli dorazíš");
    await expect(reply).toContainText("prosíme bez dalšího doprovodu");
    await expect(reply).toContainText("rezervované a zaplacené i pro tebe");
    await expect(page.getByLabel("Jméno a příjmení")).toBeVisible();

    // Scrolled so the reply card's heading is in view.
    await expect(page.getByRole("heading", { name: "Dáš nám vědět?" })).toBeInViewport();
    // Next Tab goes into the form.
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Jméno a příjmení")).toBeFocused();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: test.info().outputPath("reply.png"), fullPage: true });
  });
});
