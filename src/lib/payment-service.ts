import type { PrismaClient } from "@prisma/client"
import { ApiError } from "@/lib/api-errors"
import { chargeCredits } from "@/lib/credits"
import type { JsonValue } from "@/lib/json"

type NonNullJsonValue = Exclude<JsonValue, null>

type CompletePaymentInput = {
  readonly prisma: PrismaClient
  readonly paymentId: string
  readonly paymentKey: string
  readonly approvedAt: Date
  readonly tossRawResponse: NonNullJsonValue
}

export async function completePaymentOnce(input: CompletePaymentInput): Promise<{
  readonly charged: boolean
  readonly balanceAfter: number
}> {
  return input.prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: input.paymentId } })
    if (payment === null) {
      throw new ApiError(404, "NOT_FOUND", "Payment not found")
    }

    const updateResult = await tx.payment.updateMany({
      where: { id: input.paymentId, status: "PENDING" },
      data: {
        status: "DONE",
        paymentKey: input.paymentKey,
        approvedAt: input.approvedAt,
        tossRawResponse: input.tossRawResponse,
        failedReason: null
      }
    })

    if (updateResult.count === 0) {
      const user = await tx.user.findUnique({
        where: { id: payment.userId },
        select: { creditBalance: true }
      })
      return { charged: false, balanceAfter: user?.creditBalance ?? 0 }
    }

    const updatedUser = await tx.user.update({
      where: { id: payment.userId },
      data: { creditBalance: { increment: payment.credits } },
      select: { creditBalance: true }
    })
    const ledger = chargeCredits({
      currentBalance: updatedUser.creditBalance - payment.credits,
      credits: payment.credits,
      reason: payment.orderName
    })

    await tx.creditLedger.create({
      data: {
        userId: payment.userId,
        type: ledger.type,
        amount: ledger.amount,
        balanceAfter: ledger.balanceAfter,
        reason: ledger.reason,
        paymentId: payment.id
      }
    })

    return { charged: true, balanceAfter: updatedUser.creditBalance }
  })
}

export async function markPaymentFailed(
  prisma: PrismaClient,
  paymentId: string,
  failedReason: string
): Promise<void> {
  await prisma.payment.updateMany({
    where: { id: paymentId, status: "PENDING" },
    data: { status: "FAILED", failedReason }
  })
}
