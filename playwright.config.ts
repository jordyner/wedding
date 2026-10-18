import { defineConfig, devices } from "@playwright/test";

const DB_PORT = 54340;
const MAIL_PORT = 4020;
const APP_PORT = 3300;

export const MAIL_URL = `http://127.0.0.1:${MAIL_PORT}`;

/**
 * End-to-end tests run a production build against a throwaway in-memory Postgres
 * and a local stand-in for the Resend API (scripts/mock-resend.mts), so no real
 * email is sent and no real data is touched.
 */
export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${APP_PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    {
      command: `npx tsx scripts/local-db.mts`,
      env: { LOCAL_DB_MEMORY: "1", PORT: String(DB_PORT) },
      port: DB_PORT,
      reuseExistingServer: false,
    },
    {
      command: `npx tsx scripts/mock-resend.mts`,
      env: { PORT: String(MAIL_PORT) },
      port: MAIL_PORT,
      reuseExistingServer: false,
    },
    {
      command: `npx next build && npx next start -p ${APP_PORT}`,
      env: {
        DATABASE_URL: `postgres://postgres@127.0.0.1:${DB_PORT}/postgres`,
        DB_POOL_MAX: "4",
        RESEND_API_KEY: "re_test_key",
        RESEND_API_URL: MAIL_URL,
        EMAIL_FROM: "Svatba Jordánovi <test@example.com>",
        PUBLIC_SITE_URL: `http://localhost:${APP_PORT}`,
      },
      url: `http://localhost:${APP_PORT}/pozvanka`,
      timeout: 240_000,
      reuseExistingServer: false,
    },
  ],
});
