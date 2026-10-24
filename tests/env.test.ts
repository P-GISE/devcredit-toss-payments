import { afterEach, describe, expect, it, vi } from "vitest"

const valid = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://ci:ci@db:5432/devcredit",
  NEXTAUTH_SECRET: "synthetic-session-secret-for-ci-only",
  API_KEY_PEPPER: "synthetic-api-pepper-for-ci-only-123",
  APP_URL: "https://devcredit.example.invalid",
  NEXTAUTH_URL: "https://devcredit.example.invalid",
  TOSS_CLIENT_KEY: "test_ck_synthetic_not_a_real_key",
  TOSS_SECRET_KEY: "test_sk_synthetic_not_a_real_key"
}

async function readEnv(overrides: Record<string, string | undefined> = {}) {
  vi.resetModules()
  for (const [key, value] of Object.entries({ ...valid, ...overrides })) vi.stubEnv(key, value)
  return (await import("../src/lib/env")).getEnv()
}

afterEach(() => vi.unstubAllEnvs())

describe("production configuration", () => {
  it("accepts an HTTPS test-payment deployment", async () => {
    await expect(readEnv()).resolves.toMatchObject({ APP_URL: valid.APP_URL })
  })
  it.each([
    { NEXTAUTH_SECRET: undefined },
    { API_KEY_PEPPER: "short-secret" },
    { APP_URL: "http://devcredit.example.invalid" },
    { NEXTAUTH_URL: "https://other.example.invalid" },
    { TOSS_CLIENT_KEY: "live_ck_synthetic" },
    { TOSS_SECRET_KEY: "live_sk_synthetic" },
    { DATABASE_URL: "file:local.db" }
  ])("refuses unsafe production settings %j", async (overrides) => {
    await expect(readEnv(overrides)).rejects.toThrow()
  })
  it("keeps local HTTP development available", async () => {
    await expect(readEnv({ NODE_ENV: "development", APP_URL: "http://localhost:3000" })).resolves.toBeDefined()
  })
})
