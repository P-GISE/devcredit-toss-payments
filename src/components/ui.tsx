import Link from "next/link"
import type { ReactNode } from "react"

type ButtonLinkProps = {
  readonly href: string
  readonly children: ReactNode
  readonly variant?: "primary" | "secondary"
}

export function ButtonLink({ href, children, variant = "primary" }: ButtonLinkProps) {
  const className =
    variant === "primary"
      ? "inline-flex h-10 items-center justify-center rounded-md bg-[var(--primary)] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--primary-strong)]"
      : "inline-flex h-10 items-center justify-center rounded-md border border-[var(--panel-border)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)]"

  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  )
}

type StatCardProps = {
  readonly label: string
  readonly value: string
  readonly detail?: string
}

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <section className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel)] p-5 shadow-sm">
      <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-normal">{value}</p>
      {detail !== undefined ? <p className="mt-2 text-sm text-[var(--muted)]">{detail}</p> : null}
    </section>
  )
}

export function EmptyState({ children }: { readonly children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-[var(--panel-border)] bg-slate-50 px-4 py-6 text-sm text-[var(--muted)]">
      {children}
    </div>
  )
}
