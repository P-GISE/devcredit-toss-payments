import { KeyRound } from "lucide-react"
import Link from "next/link"

type AuthPanelProps = {
  readonly mode: "login" | "signup"
  readonly error?: string | undefined
}

export function AuthPanel({ mode, error }: AuthPanelProps) {
  const isLogin = mode === "login"

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section className="w-full max-w-md rounded-lg border border-[var(--panel-border)] bg-white p-7 shadow-sm">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-md bg-[var(--primary)] text-white">
            <KeyRound size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-[var(--muted)]">DevCredit</p>
            <h1 className="text-2xl font-semibold">{isLogin ? "로그인" : "회원가입"}</h1>
          </div>
        </div>
        {error !== undefined ? (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        ) : null}
        <form action={isLogin ? "/api/auth/login" : "/api/auth/signup"} className="space-y-4" method="post">
          {!isLogin ? (
            <label className="block text-sm font-medium">
              이름
              <input
                className="mt-2 h-11 w-full rounded-md border border-[var(--panel-border)] px-3 outline-none transition focus:border-[var(--accent)]"
                name="name"
                placeholder="Ada Lovelace"
              />
            </label>
          ) : null}
          <label className="block text-sm font-medium">
            이메일
            <input
              autoComplete={isLogin ? "username" : "email"}
              className="mt-2 h-11 w-full rounded-md border border-[var(--panel-border)] px-3 outline-none transition focus:border-[var(--accent)]"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </label>
          <label className="block text-sm font-medium">
            비밀번호
            <input
              autoComplete={isLogin ? "current-password" : "new-password"}
              className="mt-2 h-11 w-full rounded-md border border-[var(--panel-border)] px-3 outline-none transition focus:border-[var(--accent)]"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>
          <button
            className="h-11 w-full rounded-md bg-[var(--primary)] text-sm font-semibold text-white transition hover:bg-[var(--primary-strong)]"
            type="submit"
          >
            {isLogin ? "로그인" : "계정 만들기"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-[var(--muted)]">
          {isLogin ? "계정이 없나요?" : "이미 계정이 있나요?"}{" "}
          <Link className="font-semibold text-[var(--primary)]" href={isLogin ? "/signup" : "/login"}>
            {isLogin ? "회원가입" : "로그인"}
          </Link>
        </p>
      </section>
    </main>
  )
}
