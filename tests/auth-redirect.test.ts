import { afterEach, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

afterEach(() => vi.unstubAllEnvs())

it("logout redirects with GET to the configured public origin, not the container origin", async () => {
  vi.resetModules()
  vi.stubEnv("NODE_ENV", "development")
  for (const [key, value] of Object.entries({
    APP_URL: "https://devcredit.example.invalid", NEXTAUTH_URL: "https://devcredit.example.invalid",
    DATABASE_URL: "postgresql://ci:ci@db:5432/devcredit", NEXTAUTH_SECRET: "synthetic-session-secret",
    API_KEY_PEPPER: "synthetic-api-pepper", TOSS_CLIENT_KEY: "test_ck_synthetic", TOSS_SECRET_KEY: "test_sk_synthetic"
  })) vi.stubEnv(key, value)
  const { POST } = await import("../src/app/api/auth/logout/route")
  const response = await POST(new NextRequest("http://0.0.0.0:3000/api/auth/logout", {
    method: "POST", headers: { Origin: "https://devcredit.example.invalid" }
  }))
  expect(response.status).toBe(303)
  expect(response.headers.get("location")).toBe("https://devcredit.example.invalid/login")
  expect(response.headers.get("set-cookie")).toContain("devcredit_session=;")
})
