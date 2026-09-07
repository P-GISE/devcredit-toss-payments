import { randomUUID } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { ApiError, apiError } from "@/lib/api-errors"
import { hashApiKey } from "@/lib/api-keys"
import { spendCredits } from "@/lib/credits"
import { getEnv } from "@/lib/env"
import { getPrisma } from "@/lib/prisma"

type MeteredApiInput<T> = {
  readonly request: NextRequest
  readonly endpoint: string
  readonly cost: number
  readonly createPayload: (result: {
    readonly requestId: string
    readonly remainingCredits: number
  }) => T
}

function readBearerToken(request: NextRequest): string {
  const authorization = request.headers.get("authorization")
  if (authorization === null) {
    throw new ApiError(401, "UNAUTHORIZED", "Missing Authorization bearer token")
  }

  const match = /^Bearer\s+(.+)$/.exec(authorization)
  const token = match?.[1]
  if (token === undefined || token.length === 0) {
    throw new ApiError(401, "UNAUTHORIZED", "Invalid Authorization bearer token")
  }

  return token
}

export async function handleMeteredDemoRequest<T>(input: MeteredApiInput<T>): Promise<NextResponse> {
  const startedAt = Date.now()
  try {
    const apiKeyPlaintext = readBearerToken(input.request)
    const keyHash = hashApiKey(apiKeyPlaintext, getEnv().API_KEY_PEPPER)
    const requestId = randomUUID()
    const prisma = getPrisma()

    const result = await prisma.$transaction(async (tx) => {
      const apiKey = await tx.apiKey.findUnique({
        where: { keyHash },
        include: { user: { select: { id: true, creditBalance: true } } }
      })

      if (apiKey === null || apiKey.status !== "ACTIVE") {
        throw new ApiError(401, "UNAUTHORIZED", "Invalid API key")
      }

      const updateResult = await tx.user.updateMany({
        where: { id: apiKey.userId, creditBalance: { gte: input.cost } },
        data: { creditBalance: { decrement: input.cost } }
      })

      if (updateResult.count === 0) {
        throw new ApiError(402, "PAYMENT_REQUIRED", "Insufficient credits")
      }

      const updatedUser = await tx.user.findUnique({
        where: { id: apiKey.userId },
        select: { creditBalance: true }
      })
      if (updatedUser === null) {
        throw new ApiError(404, "NOT_FOUND", "User not found")
      }

      const responseTimeMs = Date.now() - startedAt
      const usageLog = await tx.usageLog.create({
        data: {
          userId: apiKey.userId,
          apiKeyId: apiKey.id,
          endpoint: input.endpoint,
          method: "GET",
          cost: input.cost,
          statusCode: 200,
          requestId,
          responseTimeMs
        }
      })
      const ledger = spendCredits({
        currentBalance: updatedUser.creditBalance + input.cost,
        cost: input.cost,
        reason: `GET ${input.endpoint}`
      })

      await tx.creditLedger.create({
        data: {
          userId: apiKey.userId,
          type: ledger.type,
          amount: ledger.amount,
          balanceAfter: ledger.balanceAfter,
          reason: ledger.reason,
          usageLogId: usageLog.id
        }
      })
      await tx.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() }
      })

      return {
        requestId,
        remainingCredits: updatedUser.creditBalance
      }
    })

    return NextResponse.json(input.createPayload(result))
  } catch (error: unknown) {
    return apiError(error)
  }
}
