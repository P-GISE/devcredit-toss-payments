import { NextResponse } from "next/server"
import { ZodError } from "zod"

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYMENT_REQUIRED"
  | "INTERNAL_ERROR"

export class ApiError extends Error {
  readonly name = "ApiError"

  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string
  ) {
    super(message)
  }
}

export function apiOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init)
}

export function apiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { ok: false, error: { code: error.code, message: error.message } },
      { status: error.status }
    )
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BAD_REQUEST",
          message: error.issues.map((issue) => issue.message).join(", ")
        }
      },
      { status: 400 }
    )
  }

  console.error(error)

  return NextResponse.json(
    { ok: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
    { status: 500 }
  )
}

export function assertFound<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new ApiError(404, "NOT_FOUND", message)
  }

  return value
}
