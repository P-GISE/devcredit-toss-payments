import { EmptyState } from "@/components/ui"
import { requireCurrentUser } from "@/lib/auth/current-user"
import { formatDateTime } from "@/lib/format"
import { getPrisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function UsagePage() {
  const user = await requireCurrentUser()
  const usageLogs = await getPrisma().usageLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100
  })

  return (
    <div className="space-y-7">
      <section>
        <p className="text-sm font-semibold text-[var(--primary)]">Metered API calls</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Usage</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          API Key로 호출한 샘플 API 사용량과 차감 비용을 확인합니다.
        </p>
      </section>

      <section className="rounded-lg border border-[var(--panel-border)] bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          {usageLogs.length === 0 ? (
            <EmptyState>아직 API 호출 로그가 없습니다.</EmptyState>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="py-2">endpoint</th>
                  <th className="py-2">method</th>
                  <th className="py-2">cost</th>
                  <th className="py-2">statusCode</th>
                  <th className="py-2">createdAt</th>
                  <th className="py-2">requestId</th>
                </tr>
              </thead>
              <tbody>
                {usageLogs.map((log) => (
                  <tr className="border-t border-[var(--panel-border)]" key={log.id}>
                    <td className="mono py-3">{log.endpoint}</td>
                    <td className="py-3">{log.method}</td>
                    <td className="py-3">{log.cost}</td>
                    <td className="py-3">{log.statusCode}</td>
                    <td className="py-3">{formatDateTime(log.createdAt)}</td>
                    <td className="mono max-w-xs break-all py-3">{log.requestId}</td>
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
