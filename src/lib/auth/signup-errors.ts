import { ZodError } from "zod"

const GENERIC_SIGNUP_FAILURE = "회원가입 요청을 처리하지 못했습니다."

const ENV_KEYS = new Set([
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "TOSS_CLIENT_KEY",
  "TOSS_SECRET_KEY",
  "APP_URL",
  "API_KEY_PEPPER"
])

export function getSignupFailureMessage(error: unknown, nodeEnv: string | undefined): string {
  if (error instanceof ZodError) {
    if (nodeEnv === "production" && hasEnvIssues(error)) {
      return GENERIC_SIGNUP_FAILURE
    }

    return getZodFailureMessage(error)
  }

  if (nodeEnv === "production") {
    return GENERIC_SIGNUP_FAILURE
  }

  const code = getStringProperty(error, "code")
  if (code === "P1000") {
    return "PostgreSQL 인증에 실패했습니다. DATABASE_URL의 사용자명과 비밀번호를 확인하세요."
  }
  if (code === "P1001") {
    return "PostgreSQL 연결에 실패했습니다. DATABASE_URL과 DB 실행 상태를 확인하세요."
  }
  if (code === "P2021" || code === "P2022") {
    return "DB 스키마가 준비되지 않았습니다. npm run db:migrate -- --name init 후 npm run db:seed를 실행하세요."
  }

  const message = getErrorMessage(error)
  if (message.includes("Authentication failed against the database server")) {
    return "PostgreSQL 인증에 실패했습니다. DATABASE_URL의 사용자명과 비밀번호를 확인하세요."
  }
  if (message.includes("Can't reach database server") || message.includes("ECONNREFUSED")) {
    return "PostgreSQL 연결에 실패했습니다. DATABASE_URL과 DB 실행 상태를 확인하세요."
  }

  return GENERIC_SIGNUP_FAILURE
}

export function getSignupFailureStatus(error: unknown): 400 | 500 {
  if (error instanceof ZodError && !hasEnvIssues(error)) {
    return 400
  }

  return 500
}

export function logSignupFailure(error: unknown): void {
  if (error instanceof Error) {
    console.error(`[signup] ${error.name}: ${error.message}`)
    return
  }

  console.error("[signup] Non-error thrown", error)
}

function getZodFailureMessage(error: ZodError): string {
  if (hasEnvIssues(error)) {
    return "환경변수 설정이 올바르지 않습니다. .env의 NEXTAUTH_SECRET, API_KEY_PEPPER 값을 확인하세요."
  }

  return "입력값을 확인하세요. 올바른 이메일과 8자 이상의 비밀번호가 필요합니다."
}

function hasEnvIssues(error: ZodError): boolean {
  const issuePaths = error.issues.flatMap((issue) => issue.path.map(String))
  return issuePaths.some((path) => ENV_KEYS.has(path))
}

function getStringProperty(value: unknown, key: string): string | null {
  if (typeof value !== "object" || value === null) {
    return null
  }

  const descriptor = Object.getOwnPropertyDescriptor(value, key)
  return typeof descriptor?.value === "string" ? descriptor.value : null
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return getStringProperty(error, "message") ?? ""
}
