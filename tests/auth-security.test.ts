import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { AuthRequestLimiter } from "../src/lib/auth/request-security"

const publicOrigin = "https://devcredit.example.invalid"

beforeEach(() => {
  vi.resetModules()
  globalThis.devcreditAuthLimiter = undefined
  vi.stubEnv("NODE_ENV", "development")
  for (const [key, value] of Object.entries({
    APP_URL: publicOrigin, NEXTAUTH_URL: publicOrigin,
    DATABASE_URL: "postgresql://ci:ci@db:5432/devcredit", NEXTAUTH_SECRET: "synthetic-session-secret",
    API_KEY_PEPPER: "synthetic-api-pepper", TOSS_CLIENT_KEY: "test_ck_synthetic", TOSS_SECRET_KEY: "test_sk_synthetic"
  })) vi.stubEnv(key, value)
})

describe("other cookie-authenticated mutations", () => {
  it.each([
    { path: "/api/api-keys", post: async (request: NextRequest) => (await import("../src/app/api/api-keys/route")).POST(request) },
    { path: "/api/payments/prepare", post: async (request: NextRequest) => (await import("../src/app/api/payments/prepare/route")).POST(request) },
    { path: "/api/payments/confirm", post: async (request: NextRequest) => (await import("../src/app/api/payments/confirm/route")).POST(request) }
  ])("rejects cross-origin POST to $path before authentication or side effects", async ({ path, post }) => {
    const response = await post(new NextRequest(new URL(path, publicOrigin), {
      method: "POST", headers: { Origin: "https://attacker.example.invalid" }, body: "invalid JSON"
    }))
    expect(response.status).toBe(403)
  })

  it("rejects cross-origin API key revocation before authentication or side effects", async () => {
    const { DELETE } = await import("../src/app/api/api-keys/[id]/route")
    const response = await DELETE(new Request(`${publicOrigin}/api/api-keys/synthetic`, {
      method: "DELETE", headers: { Origin: "https://attacker.example.invalid" }
    }), { params: Promise.resolve({ id: "synthetic" }) })
    expect(response.status).toBe(403)
  })
})

describe("bounded authentication counters", () => {
  it("separates trusted tunnel visitor buckets", () => {
    const limiter = new AuthRequestLimiter(() => 0)
    const first = new Headers({ "cf-connecting-ip": "192.0.2.10" })
    for (let i = 0; i < 20; i += 1) expect(limiter.request(first)).toBeNull()
    expect(limiter.request(first)?.status).toBe(429)
    expect(limiter.request(new Headers({ "cf-connecting-ip": "192.0.2.11" }))).toBeNull()
  })

  it("does not let arbitrary forwarded-for headers rotate the fallback bucket", () => {
    const limiter = new AuthRequestLimiter(() => 0)
    for (let i = 0; i < 20; i += 1) {
      expect(limiter.request(new Headers({ "x-forwarded-for": `192.0.2.${i}` }))).toBeNull()
    }
    expect(limiter.request(new Headers({ "x-forwarded-for": "192.0.2.250" }))?.status).toBe(429)
  })

  it("holds the account budget across email casing and whitespace", () => {
    const limiter = new AuthRequestLimiter(() => 0)
    for (let i = 0; i < 10; i += 1) expect(limiter.account("owner@example.invalid")).toBeNull()
    expect(limiter.account(" OWNER@example.invalid ")?.status).toBe(429)
  })

  it("applies a process-wide cap across visitor addresses", () => {
    const limiter = new AuthRequestLimiter(() => 0)
    for (let i = 0; i < 200; i += 1) {
      expect(limiter.request(new Headers({ "cf-connecting-ip": `192.0.2.${Math.floor(i / 20) + 1}` }))).toBeNull()
    }
    expect(limiter.request(new Headers({ "cf-connecting-ip": "192.0.2.200" }))?.status).toBe(429)
  })

  it("accepts requests again at expiry without sliding an attacked account's window", () => {
    let now = 0
    const limiter = new AuthRequestLimiter(() => now)
    for (let i = 0; i < 10; i += 1) limiter.account("owner@example.invalid")
    now = 899_999
    expect(limiter.account("owner@example.invalid")?.headers.get("retry-after")).toBe("1")
    now = 900_000
    expect(limiter.account("owner@example.invalid")).toBeNull()
  })

  it("fails closed when the key budget is full and reclaims expired counters", () => {
    let now = 0
    const limiter = new AuthRequestLimiter(() => now)
    for (let i = 0; i < 4096; i += 1) expect(limiter.account(`synthetic-${i}@example.invalid`)).toBeNull()
    expect(limiter.account("overflow@example.invalid")?.status).toBe(429)
    now = 900_000
    expect(limiter.account("overflow@example.invalid")).toBeNull()
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe("cookie mutation origin boundary", () => {
  it.each(["https://attacker.example.invalid", "null", "https://devcredit.example.invalid.attacker.invalid"])(
    "rejects logout from untrusted Origin %s without changing its cookie",
    async (origin) => {
      const { POST } = await import("../src/app/api/auth/logout/route")
      const response = await POST(new NextRequest("http://0.0.0.0:3000/api/auth/logout", {
        method: "POST", headers: { Origin: origin }
      }))
      expect(response.status).toBe(403)
      expect(response.headers.has("set-cookie")).toBe(false)
    }
  )

  it("rejects logout with no browser origin evidence", async () => {
    const { POST } = await import("../src/app/api/auth/logout/route")
    const response = await POST(new NextRequest("http://0.0.0.0:3000/api/auth/logout", { method: "POST" }))
    expect(response.status).toBe(403)
  })

  it("does not let a forged forwarded host authorize logout", async () => {
    const { POST } = await import("../src/app/api/auth/logout/route")
    const response = await POST(new NextRequest("http://0.0.0.0:3000/api/auth/logout", {
      method: "POST", headers: { Origin: "https://attacker.example.invalid", "x-forwarded-host": "attacker.example.invalid" }
    }))
    expect(response.status).toBe(403)
  })

  it("permits a same-origin Referer when Origin is absent", async () => {
    const { POST } = await import("../src/app/api/auth/logout/route")
    const response = await POST(new NextRequest("http://0.0.0.0:3000/api/auth/logout", {
      method: "POST", headers: { Referer: `${publicOrigin}/dashboard` }
    }))
    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe(`${publicOrigin}/login`)
  })

  it("rejects cross-origin login before parsing malformed form data", async () => {
    const { POST } = await import("../src/app/api/auth/login/route")
    const response = await POST(new NextRequest("http://0.0.0.0:3000/api/auth/login", {
      method: "POST", headers: { Origin: "https://attacker.example.invalid" }, body: "not form data"
    }))
    expect(response.status).toBe(403)
    expect(response.headers.has("set-cookie")).toBe(false)
  })

  it("rejects cross-origin signup before parsing malformed form data", async () => {
    const { POST } = await import("../src/app/api/auth/signup/route")
    const response = await POST(new NextRequest("http://0.0.0.0:3000/api/auth/signup", {
      method: "POST", headers: { Origin: "https://attacker.example.invalid" }, body: "not form data"
    }))
    expect(response.status).toBe(403)
    expect(response.headers.has("set-cookie")).toBe(false)
  })

  it("rejects oversized login bodies even without a Content-Length header", async () => {
    const { POST } = await import("../src/app/api/auth/login/route")
    const request = new NextRequest(`${publicOrigin}/api/auth/login`, {
      method: "POST", headers: { Origin: publicOrigin },
      body: new URLSearchParams({ email: "not-an-email", password: "a".repeat(9000) })
    })
    expect(request.headers.has("content-length")).toBe(false)
    const response = await POST(request)
    expect(response.status).toBe(413)
  })

  it("rejects oversized signup bodies before hashing or creating an account", async () => {
    const { POST } = await import("../src/app/api/auth/signup/route")
    const response = await POST(new NextRequest(`${publicOrigin}/api/auth/signup`, {
      method: "POST", headers: { Origin: publicOrigin },
      body: new URLSearchParams({ email: "not-an-email", password: "a".repeat(9000) })
    }))
    expect(response.status).toBe(413)
    expect(response.headers.has("set-cookie")).toBe(false)
  })
})

it("bounds repeated login attempts before input parsing", async () => {
  const { POST } = await import("../src/app/api/auth/login/route")
  let response: Response | undefined
  for (let attempt = 0; attempt < 21; attempt += 1) {
    response = await POST(new NextRequest("http://0.0.0.0:3000/api/auth/login", {
      method: "POST", headers: { Origin: publicOrigin, "cf-connecting-ip": "192.0.2.10" },
      body: new URLSearchParams({ email: "not-an-email", password: "synthetic-password" })
    }))
  }
  expect(response?.status).toBe(429)
  expect(Number(response?.headers.get("retry-after"))).toBeGreaterThan(0)
})
