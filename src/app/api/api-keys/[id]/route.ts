import { NextResponse } from "next/server"
import { ApiError, apiError, apiOk } from "@/lib/api-errors"
import { requireApiUser } from "@/lib/auth/current-user"
import { getPrisma } from "@/lib/prisma"
import { rejectCrossOrigin } from "@/lib/auth/request-security"

type ApiKeyRouteContext = {
  readonly params: Promise<{ readonly id: string }>
}

export async function DELETE(request: Request, context: ApiKeyRouteContext): Promise<NextResponse> {
  try {
    const rejection = rejectCrossOrigin(request.headers)
    if (rejection !== null) return rejection
    const user = await requireApiUser()
    const { id } = await context.params
    const result = await getPrisma().apiKey.updateMany({
      where: { id, userId: user.id, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() }
    })

    if (result.count === 0) {
      throw new ApiError(404, "NOT_FOUND", "API key not found")
    }

    return apiOk({ revoked: true })
  } catch (error: unknown) {
    return apiError(error)
  }
}
