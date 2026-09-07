export type PaymentStatusValue = "PENDING" | "DONE" | "FAILED" | "CANCELED"

export type PaymentConfirmationGuardInput = {
  readonly paymentAmount: number
  readonly requestAmount: number
  readonly paymentStatus: PaymentStatusValue
}

export type PaymentConfirmationGuardResult =
  | { readonly kind: "amount_mismatch" }
  | { readonly kind: "already_done" }
  | { readonly kind: "not_confirmable"; readonly status: Exclude<PaymentStatusValue, "PENDING" | "DONE"> }
  | { readonly kind: "confirm" }

export type TossApprovalGuardInput = {
  readonly expectedOrderId: string
  readonly expectedAmount: number
  readonly response: {
    readonly status: string
    readonly orderId: string
    readonly totalAmount: number
  }
}

export type TossApprovalGuardResult =
  | { readonly kind: "approved" }
  | { readonly kind: "not_done"; readonly status: string }
  | { readonly kind: "order_id_mismatch" }
  | { readonly kind: "amount_mismatch" }

export function validatePaymentConfirmation(
  input: PaymentConfirmationGuardInput
): PaymentConfirmationGuardResult {
  if (input.paymentAmount !== input.requestAmount) {
    return { kind: "amount_mismatch" }
  }

  switch (input.paymentStatus) {
    case "DONE":
      return { kind: "already_done" }
    case "PENDING":
      return { kind: "confirm" }
    case "FAILED":
    case "CANCELED":
      return { kind: "not_confirmable", status: input.paymentStatus }
  }
}

export function validateTossApproval(input: TossApprovalGuardInput): TossApprovalGuardResult {
  if (input.response.status !== "DONE") {
    return { kind: "not_done", status: input.response.status }
  }

  if (input.response.orderId !== input.expectedOrderId) {
    return { kind: "order_id_mismatch" }
  }

  if (input.response.totalAmount !== input.expectedAmount) {
    return { kind: "amount_mismatch" }
  }

  return { kind: "approved" }
}
