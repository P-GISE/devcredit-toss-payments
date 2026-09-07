import ky, { HTTPError } from "ky"
import { z } from "zod"

const TossConfirmResponseSchema = z
  .object({
    status: z.string(),
    paymentKey: z.string(),
    orderId: z.string(),
    totalAmount: z.number(),
    approvedAt: z.string().optional()
  })
  .passthrough()

export type TossConfirmResponse = z.infer<typeof TossConfirmResponseSchema>

type ConfirmTossPaymentInput = {
  readonly secretKey: string
  readonly paymentKey: string
  readonly orderId: string
  readonly amount: number
}

export class TossConfirmError extends Error {
  readonly name = "TossConfirmError"

  constructor(readonly status: number, message: string) {
    super(message)
  }
}

export async function confirmTossPayment(input: ConfirmTossPaymentInput): Promise<TossConfirmResponse> {
  const authorization = Buffer.from(`${input.secretKey}:`, "utf8").toString("base64")

  try {
    const response: unknown = await ky
      .post("https://api.tosspayments.com/v1/payments/confirm", {
        timeout: 15_000,
        headers: {
          Authorization: `Basic ${authorization}`,
          "Idempotency-Key": `confirm-${input.orderId}`
        },
        json: {
          paymentKey: input.paymentKey,
          orderId: input.orderId,
          amount: input.amount
        }
      })
      .json()

    return TossConfirmResponseSchema.parse(response)
  } catch (error: unknown) {
    if (error instanceof HTTPError) {
      throw new TossConfirmError(error.response.status, error.message)
    }
    throw error
  }
}
