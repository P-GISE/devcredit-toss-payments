import { describe, expect, it } from "vitest"
import { createApiKey, hashApiKey, verifyApiKey } from "@/lib/api-keys"

describe("API key security", () => {
  it("creates a live key with a safe prefix and stores only a hash", () => {
    const key = createApiKey("live")
    const pepper = "unit-test-pepper"

    const keyHash = hashApiKey(key.plaintext, pepper)

    expect(key.plaintext.startsWith("dc_live_")).toBe(true)
    expect(key.keyPrefix).toBe(key.plaintext.slice(0, 16))
    expect(keyHash).not.toContain(key.plaintext)
    expect(verifyApiKey(key.plaintext, keyHash, pepper)).toBe(true)
  })

  it("rejects mismatched API keys", () => {
    const key = createApiKey("test")
    const pepper = "unit-test-pepper"
    const otherKey = createApiKey("test")

    const keyHash = hashApiKey(key.plaintext, pepper)

    expect(key.plaintext.startsWith("dc_test_")).toBe(true)
    expect(verifyApiKey(otherKey.plaintext, keyHash, pepper)).toBe(false)
  })
})
