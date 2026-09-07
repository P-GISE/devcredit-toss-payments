import { AuthPanel } from "@/components/auth-panel"

type SignupPageProps = {
  readonly searchParams: Promise<{ readonly error?: string }>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams
  return <AuthPanel error={params.error} mode="signup" />
}
