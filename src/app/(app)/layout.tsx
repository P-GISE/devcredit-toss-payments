import { AppShell } from "@/components/app-shell"
import { requireCurrentUser } from "@/lib/auth/current-user"

export default async function ProtectedLayout({ children }: { readonly children: React.ReactNode }) {
  const user = await requireCurrentUser()
  return <AppShell user={user}>{children}</AppShell>
}
