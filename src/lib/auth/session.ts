import { createHmac, timingSafeEqual } from "node:crypto"
import { z } from "zod"

export const SESSION_COOKIE_NAME = "devcredit_session"

const SessionPayloadSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  exp: z.number().int().positive()
})

export type SessionPayload = z.infer<typeof SessionPayloadSchema>

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url")
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value, "utf8").digest("base64url")
}

function parsePayload(encodedPayload: string): unknown | null {
  try {
    const payloadJson = Buffer.from(encodedPayload, "base64url").toString("utf8")
    const parsedPayload: unknown = JSON.parse(payloadJson)
    return parsedPayload
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return null
    }
    throw error
  }
}

export function createSessionToken(
  input: { readonly userId: string; readonly email: string },
  secret: string
): string {
  const payload: SessionPayload = {
    sub: input.userId,
    email: input.email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  }
  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  const signature = sign(encodedPayload, secret)

  return `${encodedPayload}.${signature}`
}

export function verifySessionToken(token: string, secret: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".")
  if (encodedPayload === undefined || signature === undefined) {
    return null
  }

  const expectedSignature = sign(encodedPayload, secret)
  const signatureBuffer = Buffer.from(signature, "base64url")
  const expectedBuffer = Buffer.from(expectedSignature, "base64url")
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null
  }

  const rawPayload = parsePayload(encodedPayload)
  const parsedPayload = SessionPayloadSchema.safeParse(rawPayload)
  if (!parsedPayload.success) {
    return null
  }

  if (parsedPayload.data.exp < Math.floor(Date.now() / 1000)) {
    return null
  }

  return parsedPayload.data
}

export function getSessionCookieOptions(): {
  readonly httpOnly: true
  readonly sameSite: "lax"
  readonly secure: boolean
  readonly path: "/"
  readonly maxAge: number
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS
  }
}
