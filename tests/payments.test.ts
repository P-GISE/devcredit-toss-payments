import { describe, expect, it } from "vitest"
import { validatePaymentConfirmation, validateTossApproval } from "@/lib/payments"

describe("payment confirmation guard", () => {
  it("rejects client amount mismatch", () => {
    const result = validatePaymentConfirmation({
      paymentAmount: 5000,
      requestAmount: 1000,
      paymentStatus: "PENDING"
    })

    expect(result.kind).toBe("amount_mismatch")
  })

  it("returns already done without another charge", () => {
    const result = validatePaymentConfirmation({
      paymentAmount: 5000,
      requestAmount: 5000,
      paymentStatus: "DONE"
    })

    expect(result.kind).toBe("already_done")
  })

  it("allows a pending payment with the expected amount", () => {
    const result = validatePaymentConfirmation({
      paymentAmount: 5000,
      requestAmount: 5000,
      paymentStatus: "PENDING"
    })

    expect(result.kind).toBe("confirm")
  })
})

describe("toss approval guard", () => {
  it("accepts a DONE Toss response when order and amount match", () => {
    const result = validateTossApproval({
      expectedOrderId: "dc_order_123",
      expectedAmount: 5000,
      response: {
        status: "DONE",
        orderId: "dc_order_123",
        totalAmount: 5000
      }
    })

    expect(result.kind).toBe("approved")
  })

  it("rejects a Toss response with a mismatched order id", () => {
    const result = validateTossApproval({
      expectedOrderId: "dc_order_123",
      expectedAmount: 5000,
      response: {
        status: "DONE",
        orderId: "other_order",
        totalAmount: 5000
      }
    })

    expect(result.kind).toBe("order_id_mismatch")
  })

  it("rejects a Toss response with a mismatched total amount", () => {
    const result = validateTossApproval({
      expectedOrderId: "dc_order_123",
      expectedAmount: 5000,
      response: {
        status: "DONE",
        orderId: "dc_order_123",
        totalAmount: 1000
      }
    })

    expect(result.kind).toBe("amount_mismatch")
  })
})
