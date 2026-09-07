import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { apiError, apiOk } from "@/lib/api-errors"
import { createApiKey, hashApiKey } from "@/lib/api-keys"
import { requireApiUser } from "@/lib/auth/current-user"
import { getEnv } from "@/lib/env"
import { getPrisma } from "@/lib/prisma"

const CreateApiKeySchema = z.object({
  mode: z.enum(["live", "test"]).default("test"),
  name: z.string().trim().max(80).optional()
})

export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireApiUser()
    const apiKeys = await getPrisma().apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        keyPrefix: true,
        name: true,
        status: true,
        lastUsedAt: true,
        createdAt: true,
        revokedAt: true
      }
    })
    return apiOk({ apiKeys })
  } catch (error: unknown) {
    return apiError(error)
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireApiUser()
    const body: unknown = await request.json()
    const input = CreateApiKeySchema.parse(body)
    const generated = createApiKey(input.mode)
    const apiKey = await getPrisma().apiKey.create({
      data: {
        userId: user.id,
        name: input.name ?? null,
        keyPrefix: generated.keyPrefix,
        keyHash: hashApiKey(generated.plaintext, getEnv().API_KEY_PEPPER)
      },
      select: {
        id: true,
        keyPrefix: true,
        name: true,
        status: true,
        lastUsedAt: true,
        createdAt: true,
        revokedAt: true
      }
    })

    return apiOk({ apiKey, plaintext: generated.plaintext }, { status: 201 })
  } catch (error: unknown) {
    return apiError(error)
  }
}
