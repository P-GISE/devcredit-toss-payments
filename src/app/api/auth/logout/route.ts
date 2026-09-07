import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE_NAME } from "@/lib/auth/session"

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const response = NextResponse.redirect(new URL("/login", request.url))
    response.cookies.delete(SESSION_COOKIE_NAME)
    return response
  } catch (error: unknown) {
    console.error(error)
    return NextResponse.redirect(new URL("/login", request.url))
  }
}
