import { z } from "zod"

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(12),
  NEXTAUTH_URL: z.string().url(),
  TOSS_CLIENT_KEY: z.string().min(1),
  TOSS_SECRET_KEY: z.string().min(1),
  APP_URL: z.string().url(),
  API_KEY_PEPPER: z.string().min(12)
})

export type AppEnv = z.infer<typeof EnvSchema>

let cachedEnv: AppEnv | null = null

export function getEnv(): AppEnv {
  if (cachedEnv !== null) {
    return cachedEnv
  }

  cachedEnv = EnvSchema.parse(process.env)
  return cachedEnv
}
