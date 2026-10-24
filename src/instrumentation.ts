export async function register() {
  if (process.env["NEXT_RUNTIME"] === "nodejs" && process.env["NEXT_PHASE"] !== "phase-production-build") {
    const { getEnv } = await import("./lib/env")
    try {
      getEnv()
    } catch {
      console.error("DevCredit configuration is invalid; check the deployment environment contract")
      const { exit } = await import("node:process")
      exit(1)
    }
  }
}
