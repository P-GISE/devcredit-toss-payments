import { describe, expect, it } from "vitest"
import { getTossClientErrorMessage, isPlaceholderTossClientKey } from "@/lib/toss-client-errors"

describe("Toss client error messages", () => {
  it("uses the Toss SDK plain-object message when checkout rejects without an Error instance", () => {
    const result = getTossClientErrorMessage({
      code: "UNAUTHORIZED_KEY",
      message: "인증되지 않은 시크릿 키 혹은 클라이언트 키 입니다.",
      data: null
    })

    expect(result).toBe("인증되지 않은 시크릿 키 혹은 클라이언트 키 입니다.")
  })

  it("detects the example placeholder client key before checkout", () => {
    expect(isPlaceholderTossClientKey("test_ck_xxxxxxxxxxxxxxxxx")).toBe(true)
    expect(isPlaceholderTossClientKey("test_ck_live_like_value")).toBe(false)
  })
})
