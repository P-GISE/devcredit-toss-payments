"use client"

import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { z } from "zod"

const ConfirmResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    status: z.string(),
    charged: z.boolean(),
    balanceAfter: z.number()
  })
})

type ConfirmState =
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly charged: boolean; readonly balanceAfter: number }
  | { readonly kind: "error"; readonly message: string }

type PaymentConfirmerProps = {
  readonly paymentKey?: string | undefined
  readonly orderId?: string | undefined
  readonly amount?: string | undefined
}

export function PaymentConfirmer({ paymentKey, orderId, amount }: PaymentConfirmerProps) {
  const [state, setState] = useState<ConfirmState>({ kind: "loading" })

  useEffect(() => {
    if (paymentKey === undefined || orderId === undefined || amount === undefined) {
      setState({ kind: "error", message: "결제 승인 파라미터가 누락되었습니다." })
      return
    }

    const parsedAmount = Number(amount)
    if (!Number.isInteger(parsedAmount)) {
      setState({ kind: "error", message: "결제 금액이 올바르지 않습니다." })
      return
    }

    async function confirm(): Promise<void> {
      try {
        const response = await fetch("/api/payments/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ paymentKey, orderId, amount: parsedAmount })
        })
        const payload: unknown = await response.json()
        if (!response.ok) {
          setState({ kind: "error", message: "결제 승인에 실패했습니다." })
          return
        }
        const parsed = ConfirmResponseSchema.parse(payload).data
        setState({
          kind: "success",
          charged: parsed.charged,
          balanceAfter: parsed.balanceAfter
        })
      } catch (error: unknown) {
        if (error instanceof Error) {
          setState({ kind: "error", message: error.message })
          return
        }
        setState({ kind: "error", message: "결제 승인 중 알 수 없는 오류가 발생했습니다." })
      }
    }

    void confirm()
  }, [amount, orderId, paymentKey])

  if (state.kind === "loading") {
    return (
      <ResultPanel icon={<Loader2 className="animate-spin" size={28} />} title="결제 승인 중">
        Toss 결제 결과를 확인하고 크레딧을 충전하고 있습니다.
      </ResultPanel>
    )
  }

  if (state.kind === "error") {
    return (
      <ResultPanel icon={<XCircle className="text-[var(--danger)]" size={28} />} title="결제 승인 실패">
        {state.message}
      </ResultPanel>
    )
  }

  return (
    <ResultPanel icon={<CheckCircle2 className="text-[var(--success)]" size={28} />} title="결제 완료">
      {state.charged ? "크레딧이 충전되었습니다." : "이미 처리된 결제입니다."} 현재 잔액은{" "}
      {state.balanceAfter.toLocaleString()} credits 입니다.
    </ResultPanel>
  )
}

function ResultPanel({
  icon,
  title,
  children
}: {
  readonly icon: React.ReactNode
  readonly title: string
  readonly children: React.ReactNode
}) {
  return (
    <section className="mx-auto max-w-xl rounded-lg border border-[var(--panel-border)] bg-white p-7 text-center shadow-sm">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-md bg-slate-100">{icon}</div>
      <h1 className="mt-5 text-2xl font-semibold">{title}</h1>
      <p className="mt-3 text-sm text-[var(--muted)]">{children}</p>
      <div className="mt-6 flex justify-center gap-2">
        <Link
          className="inline-flex h-10 items-center rounded-md bg-[var(--primary)] px-4 text-sm font-semibold text-white"
          href="/dashboard"
        >
          Dashboard
        </Link>
        <Link
          className="inline-flex h-10 items-center rounded-md border border-[var(--panel-border)] bg-white px-4 text-sm font-semibold"
          href="/billing"
        >
          Billing
        </Link>
      </div>
    </section>
  )
}
