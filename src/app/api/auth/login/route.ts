import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { ApiError, apiError } from "@/lib/api-errors"
import { getSessionCookieOptions, SESSION_COOKIE_NAME, createSessionToken } from "@/lib/auth/session"
import { verifyPassword } from "@/lib/auth/password"
import { getEnv } from "@/lib/env"
import { getPrisma } from "@/lib/prisma"
import { guardAuthAccount, guardAuthRequest, readAuthForm } from "@/lib/auth/request-security"

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

function authRedirect(request: NextRequest, path: string, error?: string): NextResponse {
  const url = new URL(path, getEnv().APP_URL)
  if (error !== undefined) {
    url.searchParams.set("error", error)
  }
  return NextResponse.redirect(url, 303)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rejection = guardAuthRequest(request.headers)
    if (rejection !== null) return rejection
    const formData = await readAuthForm(request)
    const input = LoginSchema.parse({
      email: String(formData.get("email") ?? "").toLowerCase(),
      password: String(formData.get("password") ?? "")
    })
    const accountRejection = guardAuthAccount(input.email)
    if (accountRejection !== null) return accountRejection
    const user = await getPrisma().user.findUnique({ where: { email: input.email } })

    if (user === null || !(await verifyPassword(input.password, user.passwordHash))) {
      return authRedirect(request, "/login", "이메일 또는 비밀번호가 올바르지 않습니다.")
    }

    const response = authRedirect(request, "/dashboard")
    response.cookies.set(
      SESSION_COOKIE_NAME,
      createSessionToken({ userId: user.id, email: user.email }, getEnv().NEXTAUTH_SECRET),
      getSessionCookieOptions()
    )
    return response
  } catch (error: unknown) {
    if (error instanceof ApiError) return apiError(error)
    if (request.headers.get("accept")?.includes("application/json") === true) {
      return apiError(error)
    }
    return authRedirect(request, "/login", "로그인 요청을 처리하지 못했습니다.")
  }
}
