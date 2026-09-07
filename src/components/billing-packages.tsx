"use client"

import { CreditCard, Loader2 } from "lucide-react"
import Script from "next/script"
import { useState, useTransition } from "react"
import { z } from "zod"
import { formatCredits, formatWon } from "@/lib/format"
import { getTossClientErrorMessage, isPlaceholderTossClientKey } from "@/lib/toss-client-errors"

const PrepareResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    orderId: z.string(),
    amount: z.number(),
    orderName: z.string()
  })
})

export type BillingPackage = {
  readonly id: string
  readonly name: string
  readonly price: number
  readonly credits: number
}

type BillingPackagesProps = {
  readonly packages: readonly BillingPackage[]
  readonly clientKey: string
  readonly appUrl: string
  readonly customerKey: string
  readonly customerEmail: string
  readonly customerName?: string | undefined
}

export function BillingPackages({
  packages,
  clientKey,
  appUrl,
  customerKey,
  customerEmail,
  customerName
}: BillingPackagesProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function requestPayment(packageId: string): void {
    startTransition(async () => {
      try {
        setSelectedPackageId(packageId)
        setMessage(null)

        if (isPlaceholderTossClientKey(clientKey)) {
          setMessage("Toss 테스트 클라이언트 키가 설정되지 않았습니다. .env의 TOSS_CLIENT_KEY를 실제 테스트 키로 교체하세요.")
          return
        }

        const response = await fetch("/api/payments/prepare", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ packageId })
        })
        const payload: unknown = await response.json()
        if (!response.ok) {
          setMessage("결제 준비에 실패했습니다.")
          return
        }

        const prepared = PrepareResponseSchema.parse(payload).data
        const tossPayments = window.TossPayments?.(clientKey)
        if (tossPayments === undefined) {
          setMessage("토스페이먼츠 SDK가 아직 로드되지 않았습니다.")
          return
        }

        await tossPayments.payment({ customerKey }).requestPayment({
          method: "CARD",
          amount: { currency: "KRW", value: prepared.amount },
          orderId: prepared.orderId,
          orderName: prepared.orderName,
          successUrl: `${appUrl}/billing/success`,
          failUrl: `${appUrl}/billing/fail`,
          customerEmail,
          windowTarget: "self",
          metadata: { packageId },
          ...(customerName === undefined ? {} : { customerName })
        })
      } catch (error: unknown) {
        setMessage(getTossClientErrorMessage(error))
      }
    })
  }

  return (
    <>
      <Script src="https://js.tosspayments.com/v2/standard" strategy="afterInteractive" />
      {message !== null ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
          {message}
        </p>
      ) : null}
      <section className="grid gap-4 md:grid-cols-3">
        {packages.map((creditPackage) => {
          const loading = isPending && selectedPackageId === creditPackage.id
          return (
            <article
              className="rounded-lg border border-[var(--panel-border)] bg-white p-5 shadow-sm"
              key={creditPackage.id}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{creditPackage.name}</h2>
                <span className="grid h-10 w-10 place-items-center rounded-md bg-slate-100 text-[var(--primary)]">
                  <CreditCard size={18} aria-hidden="true" />
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold">{formatWon(creditPackage.price)}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {formatCredits(creditPackage.credits)} 충전
              </p>
              <button
                className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-strong)] disabled:opacity-60"
                disabled={isPending}
                onClick={() => requestPayment(creditPackage.id)}
                type="button"
              >
                {loading ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : null}
                선택하고 결제
              </button>
            </article>
          )
        })}
      </section>
    </>
  )
}
