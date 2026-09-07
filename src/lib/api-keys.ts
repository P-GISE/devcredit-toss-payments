import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

export type ApiKeyMode = "live" | "test"

export type CreatedApiKey = {
  readonly plaintext: string
  readonly keyPrefix: string
}

const API_KEY_PREFIX_LENGTH = 16

export function createApiKey(mode: ApiKeyMode): CreatedApiKey {
  const token = randomBytes(24).toString("base64url")
  const plaintext = `dc_${mode}_${token}`

  return {
    plaintext,
    keyPrefix: plaintext.slice(0, API_KEY_PREFIX_LENGTH)
  }
}

export function hashApiKey(plaintext: string, pepper: string): string {
  return createHash("sha256").update(`${pepper}:${plaintext}`, "utf8").digest("hex")
}

export function verifyApiKey(plaintext: string, keyHash: string, pepper: string): boolean {
  const candidate = hashApiKey(plaintext, pepper)
  const candidateBuffer = Buffer.from(candidate, "hex")
  const keyHashBuffer = Buffer.from(keyHash, "hex")

  if (candidateBuffer.length !== keyHashBuffer.length) {
    return false
  }

  return timingSafeEqual(candidateBuffer, keyHashBuffer)
}

export function getApiKeyPreview(plaintext: string): string {
  const start = plaintext.slice(0, API_KEY_PREFIX_LENGTH)
  const end = plaintext.slice(-4)
  return `${start}...${end}`
}
