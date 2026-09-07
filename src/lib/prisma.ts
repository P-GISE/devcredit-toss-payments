import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

let prismaClient: PrismaClient | null = null

function getDatabaseUrl(): string {
  const databaseUrl = process.env["DATABASE_URL"]
  if (databaseUrl === undefined || databaseUrl.length === 0) {
    throw new Error("DATABASE_URL is required")
  }

  return databaseUrl
}

export function getPrisma(): PrismaClient {
  if (prismaClient === null) {
    const adapter = new PrismaPg({ connectionString: getDatabaseUrl() })
    prismaClient = new PrismaClient({ adapter })
  }

  return prismaClient
}
