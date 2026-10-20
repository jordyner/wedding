import { expect, test } from "@playwright/test";
import { INVITE_CODE } from "../../playwright.config";

// A stranger: no invitation cookie.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("invitation key", () => {
  test("without the link the site shows only a private-invitation page", async ({ page }) => {
    const res = await page.goto("/pozvanka");
    expect(res?.status()).toBe(403);
    await expect(page.getByRole("heading", { name: "Tahle pozvánka je soukromá" })).toBeVisible();
    await expect(page.getByTestId("envelope")).toHaveCount(0);
    await expect(page.getByText("Pernek")).toHaveCount(0);
  });

  test("a wrong key is refused", async ({ page }) => {
    await page.goto("/?k=spatny-klic");
    await expect(page.getByRole("heading", { name: "Tahle pozvánka je soukromá" })).toBeVisible();
  });

  test("the guest's link opens the invitation, hides the key, and is remembered", async ({ page }) => {
    await page.goto(`/?k=${INVITE_CODE}`);
    expect(page.url()).toMatch(/\/pozvanka$/);
    await expect(page.getByTestId("envelope")).toBeVisible();

    // Typing the plain address later still works on this device.
    await page.goto("/");
    await expect(page.getByTestId("envelope")).toBeVisible();
  });

  test("the API refuses replies without the key", async ({ request }) => {
    const res = await request.post("/api/rsvp", { data: {} });
    expect(res.status()).toBe(403);
  });

  test("a private edit link still works on a device that never had the key", async ({ page }) => {
    const res = await page.goto("/odpoved/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    expect(res?.status()).not.toBe(403);
    await expect(page.getByRole("heading", { name: "Tahle pozvánka je soukromá" })).toHaveCount(0);
  });
});
