import { AuthPanel } from "@/components/auth-panel"

type LoginPageProps = {
  readonly searchParams: Promise<{ readonly error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  return <AuthPanel error={params.error} mode="login" />
}
