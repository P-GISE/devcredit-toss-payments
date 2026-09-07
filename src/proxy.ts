import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE_NAME } from "@/lib/auth/session"

export function proxy(request: NextRequest): NextResponse {
  const hasSession = request.cookies.get(SESSION_COOKIE_NAME)?.value !== undefined
  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/billing/:path*", "/usage/:path*"]
}
