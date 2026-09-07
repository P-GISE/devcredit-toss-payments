import { CreditCard, Gauge, KeyRound, LogOut, ReceiptText } from "lucide-react"
import Link from "next/link"
import type { CurrentUser } from "@/lib/auth/current-user"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/usage", label: "Usage", icon: ReceiptText }
] as const

export function AppShell({
  user,
  children
}: {
  readonly user: CurrentUser
  readonly children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--panel-border)] bg-white/88 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link className="flex items-center gap-2 font-semibold" href="/dashboard">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--primary)] text-white">
              <KeyRound size={18} aria-hidden="true" />
            </span>
            <span>DevCredit</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-slate-100 hover:text-[var(--foreground)]"
                  href={item.href}
                  key={item.href}
                >
                  <Icon size={16} aria-hidden="true" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-sm sm:block">
              <p className="font-medium">{user.name ?? user.email}</p>
              <p className="text-[var(--muted)]">{user.creditBalance.toLocaleString()} credits</p>
            </div>
            <form action="/api/auth/logout" method="post">
              <button
                aria-label="로그아웃"
                className="grid h-10 w-10 place-items-center rounded-md border border-[var(--panel-border)] bg-white transition hover:border-[var(--danger)] hover:text-[var(--danger)]"
                type="submit"
              >
                <LogOut size={17} aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  )
}
