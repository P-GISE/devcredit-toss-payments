import { describe, expect, it } from "vitest"
import { z } from "zod"
import { getSignupFailureMessage, getSignupFailureStatus } from "@/lib/auth/signup-errors"

describe("signup failure messages", () => {
  it("surfaces database authentication failures in development", () => {
    const error = {
      code: "P1000",
      message: "Authentication failed against the database server"
    }

    expect(getSignupFailureMessage(error, "development")).toBe(
      "PostgreSQL 인증에 실패했습니다. DATABASE_URL의 사용자명과 비밀번호를 확인하세요."
    )
  })

  it("surfaces missing database schema in development", () => {
    const error = {
      code: "P2021",
      message: "The table `User` does not exist"
    }

    expect(getSignupFailureMessage(error, "development")).toBe(
      "DB 스키마가 준비되지 않았습니다. npm run db:migrate -- --name init 후 npm run db:seed를 실행하세요."
    )
  })

  it("keeps unexpected production failures generic", () => {
    expect(getSignupFailureMessage(new Error("secret"), "production")).toBe(
      "회원가입 요청을 처리하지 못했습니다."
    )
  })

  it("keeps environment setup failures generic in production", () => {
    const result = z.object({ NEXTAUTH_SECRET: z.string().min(12) }).safeParse({ NEXTAUTH_SECRET: "short" })
    if (result.success) {
      throw new Error("expected env validation to fail")
    }

    expect(getSignupFailureMessage(result.error, "production")).toBe("회원가입 요청을 처리하지 못했습니다.")
  })

  it("marks signup input validation as a bad request", () => {
    const result = z.object({ email: z.string().email() }).safeParse({ email: "not-an-email" })
    if (result.success) {
      throw new Error("expected input validation to fail")
    }

    expect(getSignupFailureStatus(result.error)).toBe(400)
  })
})
