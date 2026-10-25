import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE_NAME } from "@/lib/auth/session"
import { getEnv } from "@/lib/env"
import { rejectCrossOrigin } from "@/lib/auth/request-security"

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rejection = rejectCrossOrigin(request.headers)
    if (rejection !== null) return rejection
    const response = NextResponse.redirect(new URL("/login", getEnv().APP_URL), 303)
    response.cookies.delete(SESSION_COOKIE_NAME)
    return response
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.json({ error: "Logout failed" }, { status: 500 })
  }
}
