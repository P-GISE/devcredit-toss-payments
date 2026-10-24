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

const ProductionEnvSchema = EnvSchema.extend({
  DATABASE_URL: z.string().url().regex(/^postgres(ql)?:\/\//),
  NEXTAUTH_SECRET: z.string().min(32),
  API_KEY_PEPPER: z.string().min(32),
  APP_URL: z.string().url().startsWith("https://"),
  NEXTAUTH_URL: z.string().url().startsWith("https://"),
  // shortcut: this deployment is test-payments only; review live payments separately.
  TOSS_CLIENT_KEY: z.string().regex(/^test_ck_.+/),
  TOSS_SECRET_KEY: z.string().regex(/^test_sk_.+/)
}).refine((env) => env.APP_URL === env.NEXTAUTH_URL, {
  path: ["NEXTAUTH_URL"], message: "Must match APP_URL"
})

let cachedEnv: AppEnv | null = null

export function getEnv(): AppEnv {
  if (cachedEnv !== null) {
    return cachedEnv
  }

  cachedEnv = (process.env.NODE_ENV === "production" ? ProductionEnvSchema : EnvSchema).parse(process.env)
  return cachedEnv
}
