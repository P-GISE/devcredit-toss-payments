import { z } from "zod"

const TossClientErrorSchema = z
  .object({
    message: z.string().trim().min(1)
  })
  .passthrough()

const FALLBACK_TOSS_CLIENT_ERROR_MESSAGE = "결제창을 여는 중 알 수 없는 오류가 발생했습니다."
const PLACEHOLDER_KEY_PATTERN = /x{6,}/i

export function getTossClientErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message
  }

  const parsedError = TossClientErrorSchema.safeParse(error)
  if (parsedError.success) {
    return parsedError.data.message
  }

  return FALLBACK_TOSS_CLIENT_ERROR_MESSAGE
}

export function isPlaceholderTossClientKey(clientKey: string): boolean {
  return clientKey.trim().length === 0 || PLACEHOLDER_KEY_PATTERN.test(clientKey)
}
