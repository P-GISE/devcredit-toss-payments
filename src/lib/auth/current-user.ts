import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { User } from "@prisma/client"
import { ApiError } from "@/lib/api-errors"
import { getEnv } from "@/lib/env"
import { getPrisma } from "@/lib/prisma"
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session"

export type CurrentUser = Pick<User, "id" | "email" | "name" | "creditBalance">

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (token === undefined) {
    return null
  }

  const session = verifySessionToken(token, getEnv().NEXTAUTH_SECRET)
  if (session === null) {
    return null
  }

  return getPrisma().user.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, name: true, creditBalance: true }
  })
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (user === null) {
    redirect("/login")
  }

  return user
}

export async function requireApiUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (user === null) {
    throw new ApiError(401, "UNAUTHORIZED", "Login required")
  }

  return user
}
