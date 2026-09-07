import { Prisma } from "@prisma/client"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { ApiError, apiError } from "@/lib/api-errors"
import { hashPassword } from "@/lib/auth/password"
import { createSessionToken, getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth/session"
import { getSignupFailureMessage, getSignupFailureStatus, logSignupFailure } from "@/lib/auth/signup-errors"
import { getEnv } from "@/lib/env"
import { getPrisma } from "@/lib/prisma"

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().trim().max(80).optional()
})

function signupRedirect(request: NextRequest, path: string, error?: string): NextResponse {
  const url = new URL(path, request.url)
  if (error !== undefined) {
    url.searchParams.set("error", error)
  }
  return NextResponse.redirect(url)
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData()
    const rawName = String(formData.get("name") ?? "").trim()
    const input = SignupSchema.parse({
      email: String(formData.get("email") ?? "").toLowerCase(),
      password: String(formData.get("password") ?? ""),
      name: rawName.length > 0 ? rawName : undefined
    })
    const user = await getPrisma().user.create({
      data: {
        email: input.email,
        name: input.name ?? null,
        passwordHash: await hashPassword(input.password)
      }
    })

    const response = signupRedirect(request, "/dashboard")
    response.cookies.set(
      SESSION_COOKIE_NAME,
      createSessionToken({ userId: user.id, email: user.email }, getEnv().NEXTAUTH_SECRET),
      getSessionCookieOptions()
    )
    return response
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return signupRedirect(request, "/signup", "이미 가입된 이메일입니다.")
    }

    const message = getSignupFailureMessage(error, process.env.NODE_ENV)
    logSignupFailure(error)

    if (request.headers.get("accept")?.includes("application/json") === true) {
      const status = getSignupFailureStatus(error)
      const code = status === 400 ? "BAD_REQUEST" : "INTERNAL_ERROR"
      return apiError(new ApiError(status, code, message))
    }
    return signupRedirect(request, "/signup", message)
  }
}
