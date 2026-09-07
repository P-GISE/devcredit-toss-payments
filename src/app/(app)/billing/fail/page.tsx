import Link from "next/link"

type BillingFailPageProps = {
  readonly searchParams: Promise<{ readonly code?: string; readonly message?: string }>
}

export default async function BillingFailPage({ searchParams }: BillingFailPageProps) {
  const params = await searchParams

  return (
    <section className="mx-auto max-w-xl rounded-lg border border-[var(--panel-border)] bg-white p-7 text-center shadow-sm">
      <h1 className="text-2xl font-semibold">결제가 완료되지 않았습니다.</h1>
      <p className="mt-3 text-sm text-[var(--muted)]">
        {params.message ?? "Toss Payments 결제창에서 실패 또는 취소 응답을 받았습니다."}
      </p>
      {params.code !== undefined ? <p className="mono mt-3 text-xs text-[var(--muted)]">{params.code}</p> : null}
      <Link
        className="mt-6 inline-flex h-10 items-center rounded-md bg-[var(--primary)] px-4 text-sm font-semibold text-white"
        href="/billing"
      >
        Billing으로 돌아가기
      </Link>
    </section>
  )
}
