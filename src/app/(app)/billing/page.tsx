import { BillingPackages } from "@/components/billing-packages"
import { EmptyState } from "@/components/ui"
import { requireCurrentUser } from "@/lib/auth/current-user"
import { getEnv } from "@/lib/env"
import { formatDateTime, formatWon } from "@/lib/format"
import { getPrisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function BillingPage() {
  const user = await requireCurrentUser()
  const prisma = getPrisma()
  const [creditPackages, payments] = await Promise.all([
    prisma.creditPackage.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
      select: { id: true, name: true, price: true, credits: true }
    }),
    prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ])
  const env = getEnv()

  return (
    <div className="space-y-7">
      <section>
        <p className="text-sm font-semibold text-[var(--primary)]">Credit packages</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Billing</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          결제 요청 전에 서버가 주문을 생성하고, 성공 리다이렉트 후 승인 API로 크레딧을 충전합니다.
        </p>
      </section>

      <BillingPackages
        appUrl={env.APP_URL}
        clientKey={env.TOSS_CLIENT_KEY}
        customerEmail={user.email}
        customerKey={user.id}
        customerName={user.name ?? undefined}
        packages={creditPackages}
      />

      <section className="rounded-lg border border-[var(--panel-border)] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">결제 내역</h2>
        <div className="mt-4 overflow-x-auto">
          {payments.length === 0 ? (
            <EmptyState>아직 결제 내역이 없습니다.</EmptyState>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="py-2">orderName</th>
                  <th className="py-2">amount</th>
                  <th className="py-2">credits</th>
                  <th className="py-2">status</th>
                  <th className="py-2">approvedAt</th>
                  <th className="py-2">createdAt</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr className="border-t border-[var(--panel-border)]" key={payment.id}>
                    <td className="py-3">{payment.orderName}</td>
                    <td className="py-3">{formatWon(payment.amount)}</td>
                    <td className="py-3">{payment.credits.toLocaleString()}</td>
                    <td className="py-3">{payment.status}</td>
                    <td className="py-3">{formatDateTime(payment.approvedAt)}</td>
                    <td className="py-3">{formatDateTime(payment.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
