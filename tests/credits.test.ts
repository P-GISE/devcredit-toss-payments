import { describe, expect, it } from "vitest"
import { chargeCredits, spendCredits } from "@/lib/credits"

describe("credit ledger calculations", () => {
  it("charges credits as a positive ledger amount", () => {
    const entry = chargeCredits({
      currentBalance: 25,
      credits: 1000,
      reason: "Starter Pack"
    })

    expect(entry.amount).toBe(1000)
    expect(entry.balanceAfter).toBe(1025)
    expect(entry.type).toBe("CHARGE")
  })

  it("spends credits as a negative ledger amount", () => {
    const entry = spendCredits({
      currentBalance: 25,
      cost: 5,
      reason: "GET /api/demo/sentiment"
    })

    expect(entry.amount).toBe(-5)
    expect(entry.balanceAfter).toBe(20)
    expect(entry.type).toBe("USE")
  })

  it("rejects usage when balance is too low", () => {
    expect(() =>
      spendCredits({
        currentBalance: 2,
        cost: 5,
        reason: "GET /api/demo/sentiment"
      })
    ).toThrow("Insufficient credits")
  })
})
