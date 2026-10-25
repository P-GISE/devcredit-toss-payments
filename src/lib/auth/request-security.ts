import { createHash } from "node:crypto"
import { isIP } from "node:net"
import { NextResponse } from "next/server"
import { getEnv } from "@/lib/env"
import { ApiError } from "@/lib/api-errors"

const WINDOW_MS = 15 * 60 * 1000
const MAX_KEYS = 4096
type Counter = { count: number; readonly resetAt: number }
type Rule = { readonly key: string; readonly limit: number }

function limited(retryAfter: number): NextResponse {
  return NextResponse.json({ ok: false, error: { code: "TOO_MANY_REQUESTS", message: "잠시 후 다시 시도해 주세요." } }, {
    status: 429, headers: { "Retry-After": String(Math.max(1, retryAfter)), "Cache-Control": "no-store" }
  })
}

function identifier(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

export class AuthRequestLimiter {
  private readonly counters = new Map<string, Counter>()

  constructor(private readonly now: () => number = Date.now) {}

  private consume(rules: readonly Rule[]): NextResponse | null {
    const now = this.now()
    for (const [key, counter] of this.counters) {
      if (counter.resetAt <= now) this.counters.delete(key)
    }
    const newKeys = rules.filter((rule) => !this.counters.has(rule.key)).length
    if (this.counters.size + newKeys > MAX_KEYS) return limited(60)
    for (const rule of rules) {
      const counter = this.counters.get(rule.key)
      if (counter !== undefined && counter.count >= rule.limit) {
        return limited(Math.ceil((counter.resetAt - now) / 1000))
      }
    }
    for (const rule of rules) {
      const counter = this.counters.get(rule.key)
      if (counter === undefined) this.counters.set(rule.key, { count: 1, resetAt: now + WINDOW_MS })
      else counter.count += 1
    }
    return null
  }

  request(headers: Headers): NextResponse | null {
    // Production ingress is loopback-only Cloudflare Tunnel; arbitrary X-Forwarded-For is never trusted.
    const visitor = headers.get("cf-connecting-ip") ?? ""
    const client = isIP(visitor) !== 0 ? visitor : "unknown"
    return this.consume([{ key: "global", limit: 200 }, { key: `client:${identifier(client)}`, limit: 20 }])
  }

  account(email: string): NextResponse | null {
    return this.consume([{ key: `account:${identifier(email.trim().toLowerCase())}`, limit: 10 }])
  }
}

declare global {
  var devcreditAuthLimiter: AuthRequestLimiter | undefined
}

function limiter(): AuthRequestLimiter {
  // shortcut: limits are per process; use a shared store before running multiple app replicas.
  return globalThis.devcreditAuthLimiter ??= new AuthRequestLimiter()
}

export function rejectCrossOrigin(headers: Headers): NextResponse | null {
  const expected = new URL(getEnv().APP_URL).origin
  const origin = headers.get("origin")
  let trusted = origin === expected
  if (origin === null) {
    const referer = headers.get("referer")
    if (referer !== null) {
      try {
        trusted = new URL(referer).origin === expected
      } catch (error: unknown) {
        if (!(error instanceof TypeError)) throw error
      }
    }
  }
  return trusted ? null : NextResponse.json({ ok: false, error: { code: "FORBIDDEN", message: "허용되지 않은 요청입니다." } }, {
    status: 403, headers: { "Cache-Control": "no-store" }
  })
}

export function guardAuthRequest(headers: Headers): NextResponse | null {
  return rejectCrossOrigin(headers) ?? limiter().request(headers)
}

export function guardAuthAccount(email: string): NextResponse | null {
  return limiter().account(email)
}

export async function readAuthForm(request: Request): Promise<URLSearchParams> {
  if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/x-www-form-urlencoded") {
    throw new ApiError(415, "BAD_REQUEST", "지원하지 않는 요청 형식입니다.")
  }
  const reader = request.body?.getReader()
  if (reader === undefined) return new URLSearchParams()
  let bytes = 0
  let body = ""
  const decoder = new TextDecoder()
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      bytes += chunk.value.byteLength
      if (bytes > 8192) {
        await reader.cancel()
        throw new ApiError(413, "BAD_REQUEST", "요청 크기가 너무 큽니다.")
      }
      body += decoder.decode(chunk.value, { stream: true })
    }
    return new URLSearchParams(body + decoder.decode())
  } finally {
    reader.releaseLock()
  }
}
