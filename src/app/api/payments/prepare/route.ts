import { randomUUID } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { ApiError, apiError, apiOk, assertFound } from "@/lib/api-errors"
import { requireApiUser } from "@/lib/auth/current-user"
import { getPrisma } from "@/lib/prisma"
import { rejectCrossOrigin } from "@/lib/auth/request-security"

const PreparePaymentSchema = z.object({
  packageId: z.string().min(1)
})

function createOrderId(): string {
  return `dc_${randomUUID().replaceAll("-", "")}`
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rejection = rejectCrossOrigin(request.headers)
    if (rejection !== null) return rejection
    const user = await requireApiUser()
    const body: unknown = await request.json()
    const input = PreparePaymentSchema.parse(body)
    const creditPackage = assertFound(
      await getPrisma().creditPackage.findFirst({
        where: { id: input.packageId, isActive: true }
      }),
      "Credit package not found"
    )

    if (creditPackage.price <= 0 || creditPackage.credits <= 0) {
      throw new ApiError(409, "CONFLICT", "Credit package is not purchasable")
    }

    const orderName = `DevCredit ${creditPackage.name}`
    const payment = await getPrisma().payment.create({
      data: {
        userId: user.id,
        packageId: creditPackage.id,
        orderId: createOrderId(),
        orderName,
        amount: creditPackage.price,
        credits: creditPackage.credits,
        status: "PENDING"
      }
    })

    return apiOk({
      orderId: payment.orderId,
      amount: payment.amount,
      orderName: payment.orderName
    })
  } catch (error: unknown) {
    return apiError(error)
  }
}
