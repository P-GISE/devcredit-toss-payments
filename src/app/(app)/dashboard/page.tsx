import { CreditCard, ReceiptText } from "lucide-react"
import { ApiKeyManager } from "@/components/api-key-manager"
import { ButtonLink, EmptyState, StatCard } from "@/components/ui"
import { formatCredits, formatDateTime, formatWon } from "@/lib/format"
import { getPrisma } from "@/lib/prisma"
import { requireCurrentUser } from "@/lib/auth/current-user"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const user = await requireCurrentUser()
  const prisma = getPrisma()
  const [activeApiKeyCount, usageLogs, payments] = await Promise.all([
    prisma.apiKey.count({ where: { userId: user.id, status: "ACTIVE" } }),
    prisma.usageLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5
    })
  ])

  return (
    <div className="space-y-7">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--primary)]">Developer billing workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">대시보드</h1>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/billing" variant="primary">
            <CreditCard size={16} aria-hidden="true" />
            Billing
          </ButtonLink>
          <ButtonLink href="/usage" variant="secondary">
            <ReceiptText size={16} aria-hidden="true" />
            Usage
          </ButtonLink>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard detail="API 호출 시 비용만큼 차감됩니다." label="현재 크레딧" value={formatCredits(user.creditBalance)} />
        <StatCard detail="ACTIVE 상태의 키만 demo API 호출에 사용할 수 있습니다." label="API Key" value={`${activeApiKeyCount} active`} />
        <StatCard detail="최근 결제 요청을 포함합니다." label="최근 결제" value={`${payments.length} records`} />
      </section>

      <ApiKeyManager />

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-[var(--panel-border)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">최근 API 사용</h2>
          <div className="mt-4 overflow-x-auto">
            {usageLogs.length === 0 ? (
              <EmptyState>아직 API 호출 로그가 없습니다.</EmptyState>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-[var(--muted)]">
                  <tr>
                    <th className="py-2">Endpoint</th>
                    <th className="py-2">Cost</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {usageLogs.map((log) => (
                    <tr className="border-t border-[var(--panel-border)]" key={log.id}>
                      <td className="mono py-3">{log.endpoint}</td>
                      <td className="py-3">{log.cost}</td>
                      <td className="py-3">{log.statusCode}</td>
                      <td className="py-3">{formatDateTime(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--panel-border)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">최근 결제 내역</h2>
          <div className="mt-4 overflow-x-auto">
            {payments.length === 0 ? (
              <EmptyState>아직 결제 내역이 없습니다.</EmptyState>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-[var(--muted)]">
                  <tr>
                    <th className="py-2">상품</th>
                    <th className="py-2">금액</th>
                    <th className="py-2">상태</th>
                    <th className="py-2">승인</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr className="border-t border-[var(--panel-border)]" key={payment.id}>
                      <td className="py-3">{payment.orderName}</td>
                      <td className="py-3">{formatWon(payment.amount)}</td>
                      <td className="py-3">{payment.status}</td>
                      <td className="py-3">{formatDateTime(payment.approvedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
