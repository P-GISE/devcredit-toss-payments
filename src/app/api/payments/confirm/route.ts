import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { ApiError, apiError, apiOk, assertFound } from "@/lib/api-errors"
import { requireApiUser } from "@/lib/auth/current-user"
import { getEnv } from "@/lib/env"
import { toJsonValue } from "@/lib/json"
import { completePaymentOnce, markPaymentFailed } from "@/lib/payment-service"
import { validatePaymentConfirmation, validateTossApproval } from "@/lib/payments"
import { getPrisma } from "@/lib/prisma"
import { confirmTossPayment, TossConfirmError } from "@/lib/toss"

const ConfirmPaymentSchema = z.object({
  paymentKey: z.string().min(1),
  orderId: z.string().min(6).max(64),
  amount: z.number().int().positive()
})

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await requireApiUser()
    const body: unknown = await request.json()
    const input = ConfirmPaymentSchema.parse(body)
    const prisma = getPrisma()
    const payment = assertFound(
      await prisma.payment.findUnique({ where: { orderId: input.orderId } }),
      "Payment not found"
    )

    if (payment.userId !== user.id) {
      throw new ApiError(403, "FORBIDDEN", "Payment owner mismatch")
    }

    const guard = validatePaymentConfirmation({
      paymentAmount: payment.amount,
      requestAmount: input.amount,
      paymentStatus: payment.status
    })

    switch (guard.kind) {
      case "amount_mismatch":
        throw new ApiError(400, "BAD_REQUEST", "Payment amount mismatch")
      case "already_done":
        return apiOk({
          status: "DONE",
          charged: false,
          balanceAfter: user.creditBalance
        })
      case "not_confirmable":
        throw new ApiError(409, "CONFLICT", `Payment is ${guard.status}`)
      case "confirm":
        break
    }

    let tossResponse
    try {
      tossResponse = await confirmTossPayment({
        secretKey: getEnv().TOSS_SECRET_KEY,
        paymentKey: input.paymentKey,
        orderId: input.orderId,
        amount: payment.amount
      })
    } catch (error: unknown) {
      const reason = error instanceof TossConfirmError ? error.message : "Toss confirmation failed"
      await markPaymentFailed(prisma, payment.id, reason)
      throw error
    }

    const tossGuard = validateTossApproval({
      expectedOrderId: payment.orderId,
      expectedAmount: payment.amount,
      response: tossResponse
    })

    switch (tossGuard.kind) {
      case "approved":
        break
      case "not_done":
        await markPaymentFailed(prisma, payment.id, `Unexpected Toss status: ${tossGuard.status}`)
        throw new ApiError(400, "BAD_REQUEST", "Toss payment was not approved")
      case "order_id_mismatch":
        await markPaymentFailed(prisma, payment.id, "Toss orderId mismatch")
        throw new ApiError(400, "BAD_REQUEST", "Toss orderId mismatch")
      case "amount_mismatch":
        await markPaymentFailed(prisma, payment.id, "Toss totalAmount mismatch")
        throw new ApiError(400, "BAD_REQUEST", "Toss totalAmount mismatch")
    }

    const tossRawResponse = toJsonValue(tossResponse)
    if (tossRawResponse === null) {
      throw new ApiError(500, "INTERNAL_ERROR", "Invalid Toss response")
    }

    const completed = await completePaymentOnce({
      prisma,
      paymentId: payment.id,
      paymentKey: tossResponse.paymentKey,
      approvedAt: tossResponse.approvedAt === undefined ? new Date() : new Date(tossResponse.approvedAt),
      tossRawResponse
    })

    return apiOk({
      status: "DONE",
      charged: completed.charged,
      balanceAfter: completed.balanceAfter
    })
  } catch (error: unknown) {
    if (error instanceof TossConfirmError) {
      return apiError(new ApiError(error.status, "BAD_REQUEST", "Toss payment confirmation failed"))
    }
    return apiError(error)
  }
}
