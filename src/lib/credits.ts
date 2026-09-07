export type CreditLedgerKind = "CHARGE" | "USE"

export type CreditLedgerDraft = {
  readonly type: CreditLedgerKind
  readonly amount: number
  readonly balanceAfter: number
  readonly reason: string
}

export class InsufficientCreditsError extends Error {
  readonly name = "InsufficientCreditsError"

  constructor(readonly currentBalance: number, readonly requiredCredits: number) {
    super("Insufficient credits")
  }
}

type ChargeCreditsInput = {
  readonly currentBalance: number
  readonly credits: number
  readonly reason: string
}

type SpendCreditsInput = {
  readonly currentBalance: number
  readonly cost: number
  readonly reason: string
}

export function chargeCredits(input: ChargeCreditsInput): CreditLedgerDraft {
  if (input.credits <= 0) {
    throw new RangeError("Credits must be positive")
  }

  return {
    type: "CHARGE",
    amount: input.credits,
    balanceAfter: input.currentBalance + input.credits,
    reason: input.reason
  }
}

export function spendCredits(input: SpendCreditsInput): CreditLedgerDraft {
  if (input.cost <= 0) {
    throw new RangeError("Cost must be positive")
  }

  if (input.currentBalance < input.cost) {
    throw new InsufficientCreditsError(input.currentBalance, input.cost)
  }

  return {
    type: "USE",
    amount: -input.cost,
    balanceAfter: input.currentBalance - input.cost,
    reason: input.reason
  }
}
