import "dotenv/config"
import { getPrisma } from "../src/lib/prisma"

const prisma = getPrisma()

const creditPackages = [
  { name: "Starter Pack", price: 1000, credits: 1000 },
  { name: "Builder Pack", price: 5000, credits: 5500 },
  { name: "Pro Pack", price: 10000, credits: 12000 }
] as const

async function main(): Promise<void> {
  for (const creditPackage of creditPackages) {
    await prisma.creditPackage.upsert({
      where: { name: creditPackage.name },
      update: {
        price: creditPackage.price,
        credits: creditPackage.credits,
        isActive: true
      },
      create: creditPackage
    })
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error: unknown) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
