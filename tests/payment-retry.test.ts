import { expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({ confirm: vi.fn(), failed: vi.fn(), complete: vi.fn() }))
vi.mock("@/lib/auth/current-user", () => ({ requireApiUser: async () => ({ id: "owner", creditBalance: 0 }) }))
vi.mock("@/lib/auth/request-security", () => ({ rejectCrossOrigin: () => null }))
vi.mock("@/lib/env", () => ({ getEnv: () => ({ TOSS_SECRET_KEY: "test-only" }) }))
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ payment: { findUnique: async () => ({
  id: "payment", userId: "owner", orderId: "order-123", amount: 5000, status: "PENDING"
}) } }) }))
vi.mock("@/lib/payment-service", () => ({ markPaymentFailed: mocks.failed, completePaymentOnce: mocks.complete }))
vi.mock("@/lib/toss", () => ({ confirmTossPayment: mocks.confirm, TossConfirmError: class extends Error {} }))
import { POST } from "@/app/api/payments/confirm/route"

it("keeps an ambiguous approval retryable and completes the same order on retry", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {})
  mocks.confirm.mockRejectedValueOnce(new Error("response lost")).mockResolvedValueOnce({
    status: "DONE", orderId: "order-123", totalAmount: 5000, paymentKey: "provider-key"
  })
  mocks.complete.mockResolvedValue({ charged: true, balanceAfter: 100 })
  const request = () => new NextRequest("https://example.invalid/api/payments/confirm", {
    method: "POST", body: JSON.stringify({ orderId: "order-123", amount: 5000, paymentKey: "provider-key" })
  })
  expect((await POST(request())).status).toBe(500)
  expect(mocks.failed).not.toHaveBeenCalled()
  expect((await POST(request())).status).toBe(200)
  expect(mocks.confirm.mock.calls[0]).toEqual(mocks.confirm.mock.calls[1])
  expect(mocks.complete).toHaveBeenCalledTimes(1)
  log.mockRestore()
})
